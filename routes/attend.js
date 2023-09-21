const router = require('express').Router();
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
    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet(config.spreadsheetId);

    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();
    const attendanceSheet = doc.sheetsByIndex[0];
    const assesmentSheet = doc.sheetsByIndex[1];

    if (req.body.uuid === config.readOnlyUuid) { /// read-only, don't update anything
      return returnUserInfo(req, assesmentSheet, res);
    }
    const _rows = await attendanceSheet.getRows();
    const rows = _rows.slice(1);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const xname = row._rawData[0].trim();
      if (xname === req.body.xname) {
        if (row[`T${columnToUpdate}`]) {
          return res.status(400).json({ success: false, msg: 'srv_already_registered' });
        }
        const newValue = `${pad(now.getHours(), 2, '0')}:${pad(now.getMinutes(), 2, '0')}:${pad(now.getSeconds(), 2, '0')}`;
        row[`T${columnToUpdate}`] = newValue;
        await row.save();
        return returnUserInfo(req, assesmentSheet, res);
      }
    }
    res.status(404).json({ success: false, msg: 'srv_xname_not_found' });
  } catch (err) {
    console.log(`Error: ${err}`);
  }
});

const returnUserInfo = async (req, assesmentSheet, res) => {
  const _rows = await assesmentSheet.getRows();
  const rows = _rows.slice(1);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row._rawData[0].trim() === req.body.xname) {
      return res.status(200).json({
        success: true,
        msg: 'srv_success',
        xname: req.body.xname,
        name: row.Name,
        semesterPoints: row.Sem,
        sp1Points: row.SP1,
        sp2Points: row.SP2,
      });
    }
  }
};

module.exports = router;
