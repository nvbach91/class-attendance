// report-attendance.js
const xnames = process.argv[2];
const uuid = process.env.ATTEND_UUID;
const endpoint = process.env.ATTEND_URL || 'http://localhost:3000/attend';

if (!xnames || !uuid) {
  console.error('Usage: set ATTEND_UUID to the active session UUID, then run: node report-attendance.js <student-id>');
  process.exit(1);
}

const reportAttendance = async (xname) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ uuid, xname }),
  });

  const result = await response.json();
  console.log(`HTTP ${response.status}: ${result.msg} ${xname}`);
};
(async () => {
  try {
    const reports = [];
    for (const xname of xnames.split(',')) {
      reports.push(reportAttendance(xname.trim()));
    }
    await Promise.all(reports);
  } catch (error) {
    console.error(`Error reporting attendance: ${error.message}`);
    process.exit(1);
  }
})();
