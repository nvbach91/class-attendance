const router = require('express').Router();
const JWT = require('google-auth-library').JWT;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const credentials = require('../credentials.json');
const config = require('../config');

const startTimesByColumn = config.startTimesByColumn;
const columnNumbersByUuid = config.columnNumbersByUuid;
// students can check attendance within several hours after each start time
const allowedTime = config.allowedTime;

const getColumnToUpdate = (now, validColumnNumberByUuid) => {
  const startTimes = Object.values(startTimesByColumn);
  for (let i = 0; i < startTimes.length; i++) {
    const startTime = startTimes[i];
    if (now.getTime() > startTime.getTime() - 600000 && now.getTime() < startTime.getTime() + allowedTime) {
      if (i + 1 === validColumnNumberByUuid) {
        return validColumnNumberByUuid;
      }
    }
  }
  return 0;
};

const pad = (s, l, c) => {
  let ss = s.toString();
  while (ss.length < l) {
    ss = c + ss;
  }
  return ss;
};

router.get('/allowed-time', (req, res) => {
  res.json(config.allowedTime);
});
router.get('/valid-times', (req, res) => {
  res.json(config.validTimes);
});

const scopes = [
  'https://www.googleapis.com/auth/spreadsheets',
];
const serviceAccountAuth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes,
});

let spreadsheetPromise;
let studentRowsCache;
let studentRowsPromise;
const pendingRangeRequests = [];
let rangeFlushScheduled = false;

const flushRangeRequests = async () => {
  rangeFlushScheduled = false;
  const requestGroups = pendingRangeRequests.splice(0);
  if (!requestGroups.length) {
    return;
  }

  const ranges = requestGroups.flatMap((group) => group.ranges);
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values:batchGet`);
  ranges.forEach((range) => url.searchParams.append('ranges', range));
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');

  try {
    const response = await serviceAccountAuth.request({ url: url.toString(), method: 'GET' });
    let rangeIndex = 0;
    requestGroups.forEach((group) => {
      const values = response.data.valueRanges
        .slice(rangeIndex, rangeIndex + group.ranges.length)
        .map((valueRange) => valueRange.values || []);
      rangeIndex += group.ranges.length;
      group.resolve(values);
    });
  } catch (err) {
    requestGroups.forEach((group) => group.reject(err));
  }

  if (pendingRangeRequests.length && !rangeFlushScheduled) {
    rangeFlushScheduled = true;
    setImmediate(flushRangeRequests);
  }
};

const getSpreadsheet = () => {
  if (!spreadsheetPromise) {
    const doc = new GoogleSpreadsheet(config.spreadsheetId, serviceAccountAuth);
    spreadsheetPromise = doc.loadInfo().then(() => doc).catch((err) => {
      spreadsheetPromise = undefined;
      throw err;
    });
  }
  return spreadsheetPromise;
};

const getRanges = (ranges) => new Promise((resolve, reject) => {
  pendingRangeRequests.push({ ranges, resolve, reject });
  if (!rangeFlushScheduled) {
    rangeFlushScheduled = true;
    setImmediate(flushRangeRequests);
  }
});

const updateCell = async (range, value) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(range)}`;
  await serviceAccountAuth.request({
    url,
    method: 'PUT',
    params: { valueInputOption: 'RAW' },
    data: { values: [[value]] },
  });
};

const createStudentRowMap = (values) => {
  const rowsByXname = new Map();
  values.forEach((row, index) => {
    const xname = (row[0] || '').toString().trim();
    if (xname && !rowsByXname.has(xname)) {
      rowsByXname.set(xname, index + 3);
    }
  });
  return rowsByXname;
};

const getStudentRows = (attendanceSheet, assesmentSheet) => {
  if (studentRowsCache && studentRowsCache.expiresAt > Date.now()) {
    return Promise.resolve(studentRowsCache);
  }
  if (!studentRowsPromise) {
    studentRowsPromise = getRanges([
      `${quoteSheetTitle(attendanceSheet.title)}!A3:A`,
      `${quoteSheetTitle(assesmentSheet.title)}!A3:A`,
    ]).then(([attendanceIds, assessmentIds]) => {
      studentRowsCache = {
        attendance: createStudentRowMap(attendanceIds),
        assessment: createStudentRowMap(assessmentIds),
        expiresAt: Date.now() + 30000,
      };
      return studentRowsCache;
    }).finally(() => {
      studentRowsPromise = undefined;
    });
  }
  return studentRowsPromise;
};

const quoteSheetTitle = (title) => `'${title.replace(/'/g, (quote) => quote + quote)}'`;

const toColumnLetter = (columnNumber) => {
  let result = '';
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return result;
};

router.post('/attend', async (req, res) => {
  const now = new Date();
  let columnToUpdate;
  if (req.body.uuid !== config.readOnlyUuid) {
    const validColumnNumberByUuid = columnNumbersByUuid[req.body.uuid];
    if (!validColumnNumberByUuid) {
      return res.status(400).json({ success: false, msg: 'srv_invalid_uuid' });
    }
    columnToUpdate = getColumnToUpdate(now, validColumnNumberByUuid);
    if (!columnToUpdate) {
      return res.status(400).json({ success: false, msg: 'srv_not_in_time' });
    }
  }

  try {
    const doc = await getSpreadsheet();
    const attendanceSheet = doc.sheetsByIndex[0];
    const assesmentSheet = doc.sheetsByIndex[1];

    if (req.body.uuid === config.readOnlyUuid) { /// read-only, don't update anything
      return await returnUserInfo(req, assesmentSheet, res);
    }
    const studentRows = await getStudentRows(attendanceSheet, assesmentSheet);
    const attendanceRow = studentRows.attendance.get(req.body.xname) || 0;
    if (!attendanceRow) {
      return res.status(404).json({ success: false, msg: 'srv_xname_not_found' });
    }

    const attendanceCell = `${toColumnLetter(columnToUpdate + 1)}${attendanceRow}`;
    const assessmentRow = studentRows.assessment.get(req.body.xname) || 0;
    const ranges = [`${quoteSheetTitle(attendanceSheet.title)}!${attendanceCell}`];
    if (assessmentRow) {
      ranges.push(`${quoteSheetTitle(assesmentSheet.title)}!O${assessmentRow}:U${assessmentRow}`);
    }
    const [attendanceValues, assessmentValues] = await getRanges(ranges);
    const attendanceValue = attendanceValues[0] && attendanceValues[0][0];
    if (attendanceValue) {
      return res.status(400).json({ success: false, msg: 'srv_already_registered' });
    }

    const newValue = `${pad(now.getHours(), 2, '0')}:${pad(now.getMinutes(), 2, '0')}:${pad(now.getSeconds(), 2, '0')}`;
    await updateCell(`${quoteSheetTitle(attendanceSheet.title)}!${attendanceCell}`, newValue);
    if (!assessmentRow) {
      return res.status(404).json({ success: false, msg: 'srv_xname_not_found' });
    }
    return sendUserInfo(req, assessmentValues[0], res);
  } catch (err) {
    console.error(`Error: ${err}`);
    return res.status(500).json({ success: false, msg: 'srv_internal_error' });
  }
});

const returnUserInfo = async (req, assesmentSheet, res) => {
  const doc = await getSpreadsheet();
  const studentRows = await getStudentRows(doc.sheetsByIndex[0], assesmentSheet);
  const assessmentRow = studentRows.assessment.get(req.body.xname) || 0;
  if (!assessmentRow) {
    return res.status(404).json({ success: false, msg: 'srv_xname_not_found' });
  }

  const [[row = []]] = await getRanges([`${quoteSheetTitle(assesmentSheet.title)}!O${assessmentRow}:U${assessmentRow}`]);
  return sendUserInfo(req, row, res);
};

const sendUserInfo = (req, row, res) => {
  const notes = (row[6] || '').toString();
  return res.status(200).json({
    success: true,
    msg: 'srv_success',
    xname: req.body.xname,
    semesterPoints: row[0],
    name: row[1],
    sp1Points: row[2],
    sp2Points: row[3],
    notes: notes.replace(/>/g, '&gt;').replace(/</g, '&lt;'),
  });
};

module.exports = router;
