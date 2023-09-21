const spreadsheetId = '';

const validTimes = {
    // e.g. 'b429f6': { column:  1, date: '2019-09-20T09:00:00Z'},
};

const allowedTime = 8 * 60 * 60 * 1000;

const startTimesByColumn = {};

const columnNumbersByUuid = {};

Object.keys(validTimes).forEach((uuid) => {
    const vt = validTimes[uuid];
    startTimesByColumn[vt.column] = new Date(vt.date);
    columnNumbersByUuid[uuid] = vt.column;
});

const readOnlyUuid = 'fedcba';

module.exports = {
    spreadsheetId,
    validTimes,
    allowedTime,
    startTimesByColumn,
    columnNumbersByUuid,
    readOnlyUuid,
};
