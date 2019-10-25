const router = require('express').Router();
const GoogleSpreadsheet = require('google-spreadsheet');
const async = require('async');
const chunk = require('lodash.chunk');
const credentials = require('../credentials.json');
const config = require('../config');

const startTimesByColumn = config.startTimesByColumn;
const columnNumbersByUuid = config.columnNumbersByUuid;
// students can check attendance within 5 hours after each start time
const allowedTime = config.allowedTime; //5 hours

const getColumnToUpdate = (now, validColumnNumberByUuid) => {
  const startTimes = Object.values(startTimesByColumn);
  for (let i = 0; i < startTimes.length; i++) {
    let startTime = startTimes[i];
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
  while(ss.length < l) {
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

router.post('/attend', (req, res) => {
  const now = new Date();
  const validColumnNumberByUuid = columnNumbersByUuid[req.body.uuid];
  if (!validColumnNumberByUuid) {
    return res.status(400).json({ success: false, msg: 'srv_invalid_uuid' });
  }
  const columnToUpdate = getColumnToUpdate(now, validColumnNumberByUuid);
  if (!columnToUpdate) {
    return res.status(400).json({ success: false, msg: 'srv_not_in_time' });
  }

  // spreadsheet key is the long id in the sheets URL
  const doc = new GoogleSpreadsheet(config.spreadsheetId);
  var attendanceSheet;
  var assesmentSheet;

  async.series([
    (step) => {
      doc.useServiceAccountAuth(credentials, step);
    },
    (step) => {
      doc.getInfo((err, info) => {
        attendanceSheet = info.worksheets[0];
        assesmentSheet = info.worksheets[1];
        step();
      });
    },
    (step) => {
      const attendanceSheetMaxCol = 14;
      const attendanceSheetConfig = {
        'min-row': 3,
        'max-row': 60,
        'min-col': 1,
        'max-col': attendanceSheetMaxCol,
        'return-empty': true
      };
      attendanceSheet.getCells(attendanceSheetConfig, (err, cells) => {
        const rows = chunk(cells.map((cell) => cell.value), attendanceSheetMaxCol);
        const xnames = {};
        rows.forEach((row, i) => {
          const xname = row[0].trim();
          if (xname) {
            xnames[xname] = { columns: row.slice(1), rowIndex: i };
          }
        });
        if (!xnames[req.body.xname]) {
          return res.status(404).json({ success: false, msg: 'srv_xname_not_found' });
        }
        const rowIndex = xnames[req.body.xname].rowIndex;
        const cellIndex = rowIndex * attendanceSheetMaxCol + columnToUpdate;
        const cell = cells[cellIndex];
        if (cell.value) {
          return res.status(400).json({ success: false, msg: 'srv_already_registered' });
        }
        //${pad(now.getDate(), 2, '0')}.${pad(now.getMonth() + 1, 2, '0')}.${now.getFullYear()} 
        cell.value = `${pad(now.getHours(), 2, '0')}:${pad(now.getMinutes(), 2 , '0')}:${pad(now.getSeconds(), 2, '0')}`;
        cell.save(() => {
          returnUserInfo(req, assesmentSheet, res, step);
          //attendanceSheet.bulkUpdateCells(cells);
        });
      });
    },
  ], (err) => {
    if (err) {
      console.log('Error: ' + err);
    }
  });
});

const returnUserInfo = (req, assesmentSheet, res, step) => {
  const assesmentMaxCol = 18;
  const assesmentSheetConfig = {
    'min-row': 3,
    'max-row': 60,
    'min-col': 1,
    'max-col': assesmentMaxCol,
    'return-empty': true
  };
  assesmentSheet.getCells(assesmentSheetConfig, (err, cells) => {
    const rows = chunk(cells.map((cell) => cell.value), assesmentMaxCol);
    const xnames = {};
    rows.forEach((row, i) => {
      const xname = row[0].trim();
      if (xname) {
        xnames[xname] = { 
          name: row[assesmentMaxCol - 1],
          points: row[assesmentMaxCol - 2],
        };
      }
    });
    res.status(200).json({ 
      success: true, 
      msg: 'srv_success', 
      xname: req.body.xname, 
      name: xnames[req.body.xname].name, 
      points: xnames[req.body.xname].points 
    });
    step();
  });
};

module.exports = router;
