// Servos placement requests: saves each website request as a row in this sheet
// and emails you a notification. Paste into Extensions > Apps Script.
var NOTIFY_EMAIL = 'rileyc@servosvending.com';

var HEADERS = ['Received', 'Name', 'Email', 'Phone', 'Venue', 'Type of place', 'Interested in', 'Notes'];
var FIELDS = ['full_name', 'email', 'phone', 'property_name', 'venue_type', 'interested_in', 'message'];

function clean(v) {
  v = String(v || '').slice(0, 2000).trim();
  // Stop spreadsheet formulas from running if someone types = + - or @ first.
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    var row = [new Date()];
    FIELDS.forEach(function (f) { row.push(clean(p[f])); });
    sheet.appendRow(row);
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      replyTo: String(p.email || '').slice(0, 200),
      subject: 'New placement request: ' + clean(p.property_name || p.full_name),
      body: HEADERS.slice(1).map(function (h, i) { return h + ': ' + row[i + 1]; }).join('\n')
    });
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}
