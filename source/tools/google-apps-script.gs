/**
 * ACL order inbox — Google Apps Script web app.
 * Every order placed on the website becomes one row in a Google Sheet
 * (and, optionally, an email to you).
 *
 * SETUP (about 5 minutes)
 * 1. Create a new Google Sheet, e.g. "ACL Orders".
 * 2. In the Sheet: Extensions > Apps Script. Delete the sample code and paste this whole file.
 * 3. Set SHARED_KEY below to the same value as `orderWebhookKey` in js/config.js.
 *    Optionally set NOTIFY_EMAIL to get an email for every order.
 * 4. Click Deploy > New deployment > type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    Click Deploy, allow the permissions, and copy the Web app URL (ends in /exec).
 * 5. Paste that URL into `orderWebhook` in js/config.js and redeploy the website.
 * 6. Place a test order. A row should appear in the "Orders" tab.
 *
 * After editing this script later: Deploy > Manage deployments > Edit > Version: New version.
 * (The URL stays the same.)
 */

const SHARED_KEY = 'acl-orders';   // must match CONFIG.orderWebhookKey
const NOTIFY_EMAIL = '';           // e.g. 'you@gmail.com' — leave '' for no email
const SHEET_NAME = 'Orders';

const HEADERS = ['সময়', 'অর্ডার নম্বর', 'নাম', 'মোবাইল', 'জেলা', 'এলাকা', 'ঠিকানা', 'পণ্য', 'পণ্যের দাম',
  'কম্বো সাশ্রয়', 'ডেলিভারি', 'মোট', 'নির্দেশনা', 'স্ট্যাটাস'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const o = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (o.key !== SHARED_KEY) return reply_({ ok: false, error: 'bad key' });
    if (!o.id || !o.phone || !Array.isArray(o.lines) || !o.lines.length) return reply_({ ok: false, error: 'incomplete order' });

    const sheet = getSheet_();
    // ignore accidental double-submits of the same order
    const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat() : [];
    if (ids.indexOf(o.id) !== -1) return reply_({ ok: true, duplicate: true });

    const items = o.lines.map(l => `${l.name} (${l.detail}) x${l.qty} = ${l.unit * l.qty}`).join('\n');
    sheet.appendRow([
      new Date(),
      clean_(o.id), clean_(o.name), clean_("'" + o.phone), clean_(o.district), o.area === 'in' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে',
      clean_(o.address), clean_(items), num_(o.sub), num_(o.save), num_(o.del), num_(o.total), clean_(o.note), 'নতুন',
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: `নতুন অর্ডার ${o.id} — ৳${num_(o.total)}`,
        body: String(o.msg || items),
      });
    }
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the /exec URL in a browser just confirms the script is live.
function doGet() { return reply_({ ok: true, service: 'ACL orders' }); }

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#fde4df');
    // status column dropdown
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['নতুন', 'কনফার্মড', 'পাঠানো হয়েছে', 'ডেলিভারড', 'বাতিল', 'ফেরত'], true).build();
    sh.getRange(2, HEADERS.length, 1000, 1).setDataValidation(rule);
  }
  return sh;
}

// Block spreadsheet formula injection (cells starting with = + - @ are made plain text) and cap length.
function clean_(v) {
  let s = String(v == null ? '' : v).slice(0, 1000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
