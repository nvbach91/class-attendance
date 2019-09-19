const spreadsheetId = '1xPUuWsjlSSM9waUo6WbsxypIhKQHvX7buMRDMMeaG_M';
const validTimes = {
    '2964fb': { column:  1, date: '2019-09-20T09:00:00Z'},
    'c94be9': { column:  2, date: '2019-09-27T09:00:00Z'},
    '38df99': { column:  3, date: '2019-10-04T09:00:00Z'},
    '4d9b08': { column:  4, date: '2019-10-11T09:00:00Z'},
    'c8c9f7': { column:  5, date: '2019-10-18T09:00:00Z'},
    '7eb61a': { column:  6, date: '2019-10-25T09:00:00Z'},
    '9d42e0': { column:  7, date: '2019-11-01T10:00:00Z'},
    'c4027b': { column:  8, date: '2019-11-08T10:00:00Z'},
    '6f600b': { column:  9, date: '2019-11-15T10:00:00Z'},
    '6bd6f6': { column: 10, date: '2019-11-22T10:00:00Z'},
    '883848': { column: 11, date: '2019-11-29T10:00:00Z'},
    'ae0678': { column: 12, date: '2019-12-06T10:00:00Z'},
    '8f559d': { column: 13, date: '2019-12-13T10:00:00Z'},
};
const allowedTime = 18000000;
const startTimesByColumn = {};
const columnNumbersByUuid = {};
Object.keys(validTimes).forEach((uuid) => {
    const vt = validTimes[uuid];
    startTimesByColumn[vt.column] = new Date(vt.date);
    columnNumbersByUuid[uuid] = vt.column;
});

module.exports = {
    spreadsheetId,
    validTimes,
    allowedTime,
    startTimesByColumn,
    columnNumbersByUuid,
};