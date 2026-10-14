# Class Attendance

This app is used to record student attendance using QR codes. Data is saved via Google Sheets API.

## Requirements
- Node.js 20.4.0

## Installation
```bash
$> npm install -g yarn
$> yarn install
```

## App setup
1. Create a Google Cloud project in https://console.cloud.google.com
2. Go to https://console.cloud.google.com/apis/dashboard to enable Google Sheets API
3. Go to https://console.cloud.google.com/iam-admin/serviceaccounts and create a Service Account, then generate and download a JSON key for it, also note down its email address for spreadsheet sharing in step 6
4. Copy the JSON key file content to `./credentials.json`
5. Create a Google Sheet file by copying this [template](https://docs.google.com/spreadsheets/d/1s7ymW9JljGECBSRxnzAfinurGVzVJkhnYafE-BS6_jg) to your Google Drive
6. Share the spreadsheet (edit access) with the Service Account you created in step 3
7. Open `./config.js`, add the `spreadSheetId` from step 1. and `validTimes`
```js
const spreadsheetId = '7xa***xja';
const validTimes = {
    // the timestamps represent the date for which an attendance session is active
    'da29c6': { column:  1, date: '2026-10-16T08:00:00Z' }, // each line represents one day
    'ef0acd': { column:  2, date: '2026-10-23T08:00:00Z' }, // each line represents one day
};
```

## Run & test
- Run `yarn start`
- Open `http://localhost:3000/link`
- If there is an active attendance session click the attendance link (in production, the student should scan the QR code)
- Use a student xname from your spreadsheet's first column to fill out the form and submit it
- The student's attendance should appear in the spreadsheet
- The student's total points should be displayed in the UI after the form is submitted successfully
