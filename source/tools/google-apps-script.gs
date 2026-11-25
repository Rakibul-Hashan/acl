/**
 * ACL order backend — Google Sheet + Apps Script (free, no server of your own).
 *
 * What it does
 *  - Every website order becomes a row in the "Orders" sheet.
 *  - The owner gets an instant Telegram message (and/or an email).
 *  - The owner changes the "স্ট্যাটাস" dropdown in the sheet; the customer's order page updates live.
 *  - The website only ever reads an order's status and the customer note: never names, phones or addresses.
 *
 * SETUP (about 10 minutes)
 *  1. Create a Google Sheet, e.g. "ACL Orders". Extensions > Apps Script. Delete the sample code and paste this file.
 *  2. Telegram (optional but recommended):
 *     a. In Telegram, open @BotFather, send /newbot, and follow the steps. Copy the token it gives you.
 *     b. Paste the token into TG_TOKEN below. Send any message (e.g. "hi") to your new bot from the owner's Telegram.
 *     c. In the Apps Script editor choose the function "setupTelegram" and press Run. Allow access.
 *        It finds your chat id, saves it, and sends you a test message.
 *  3. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Deploy and allow.
 *     Copy the Web app URL (ends in /exec).
 *  4. Website: paste that URL into `orderWebhook` in js/config.js. Keep `orderWebhookKey` the same as SHARED_KEY below.
 *  5. Place a test order. You should get a row in the sheet and a Telegram message.
 *     Change its স্ট্যাটাস to "কনফার্মড": the customer's order page shows it within a minute.
 *
 * After editing this script: Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy.
 * (The URL stays the same.)
 *
 * This code lives in YOUR Google account and is not public; only the /exec URL is. So the Telegram
 * token here is safe, and it never goes to GitHub.
 */

const SHARED_KEY = 'acl-orders';  // must match CONFIG.orderWebhookKey on the website
const TG_TOKEN = '';              // Telegram bot token from @BotFather (leave '' to skip Telegram)
const NOTIFY_EMAIL = '';          // optional: email for every order (Web3Forms on the site already emails you)
const SHEET_NAME = 'Orders';

const STATUSES = ['নতুন', 'কনফার্মড', 'পাঠানো হয়েছে', 'ডেলিভারড', 'বাতিল'];
const HEADERS = ['সময়', 'অর্ডার নম্বর', 'নাম', 'মোবাইল', 'জেলা', 'এলাকা', 'ঠিকানা', 'পণ্য', 'পণ্যের দাম',
  'কম্বো সাশ্রয়', 'ডেলিভারি', 'মোট', 'নির্দেশনা', 'স্ট্যাটাস', 'গ্রাহকের জন্য নোট', 'স্ট্যাটাস আপডেট'];
const COL = { id: 2, status: 14, note: 15, updated: 16 }; // 1-based column numbers

/* ---------- website -> new order ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const o = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (o.key !== SHARED_KEY) return json_({ ok: false, error: 'bad key' });
    if (!/^ACL-[A-Z0-9]{3,12}$/.test(String(o.id || '')) || !o.phone || !Array.isArray(o.lines) || !o.lines.length) {
      return json_({ ok: false, error: 'incomplete order' });
    }
    const sh = sheet_();
    if (findRow_(sh, o.id)) return json_({ ok: true, duplicate: true }); // double submit

    const items = o.lines.map(l => `${l.name} (${l.detail}) x${l.qty} = ${l.unit * l.qty}`).join('\n');
    sh.appendRow([
      new Date(), clean_(o.id), clean_(o.name), clean_("'" + o.phone), clean_(o.district), o.area === 'in' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে',
      clean_(o.address), clean_(items), num_(o.sub), num_(o.save), num_(o.del), num_(o.total), clean_(o.note),
      'নতুন', '', new Date(),
    ]);

    const text = `নতুন অর্ডার ${o.id}\n${o.name} · ${o.phone}\n${o.district}: ${o.address}\n\n${items}\n\nমোট: ৳${num_(o.total)} (ক্যাশ অন ডেলিভারি)` +
      (o.note ? `\nনির্দেশনা: ${o.note}` : '') + `\n\nশিট: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`;
    telegram_(text);
    if (NOTIFY_EMAIL) MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: `নতুন অর্ডার ${o.id} — ৳${num_(o.total)}`, body: text });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- website -> read status (public, no personal data) ----------
   GET  ?ids=ACL-AB12C,ACL-XY34Z   ->  { ok, orders: { "ACL-AB12C": { status, note, updated } } } */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.ids) return json_({ ok: true, service: 'ACL orders' });
  const ids = String(p.ids).split(',').map(s => s.trim()).filter(s => /^ACL-[A-Z0-9]{3,12}$/.test(s)).slice(0, 20);
  const sh = sheet_(), out = {};
  const last = sh.getLastRow();
  if (last > 1 && ids.length) {
    const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    for (const r of rows) {
      const id = String(r[COL.id - 1]);
      if (ids.indexOf(id) !== -1) {
        out[id] = { status: String(r[COL.status - 1] || 'নতুন'), note: String(r[COL.note - 1] || ''),
          updated: r[COL.updated - 1] instanceof Date ? r[COL.updated - 1].toISOString() : '' };
      }
    }
  }
  return json_({ ok: true, orders: out });
}

/* ---------- sheet edits: timestamp status changes, ping Telegram ---------- */
function onEdit(e) {
  const r = e && e.range;
  if (!r || r.getSheet().getName() !== SHEET_NAME || r.getRow() < 2) return;
  if (r.getColumn() === COL.status || r.getColumn() === COL.note) {
    r.getSheet().getRange(r.getRow(), COL.updated).setValue(new Date());
  }
}

/* ---------- one-time helper: run from the editor after messaging your bot ---------- */
function setupTelegram() {
  if (!TG_TOKEN) throw new Error('Paste your bot token into TG_TOKEN first.');
  const res = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates`).getContentText());
  const msgs = (res.result || []).filter(u => u.message && u.message.chat);
  if (!msgs.length) throw new Error('No messages found. Send "hi" to your bot in Telegram, then run this again.');
  const chatId = String(msgs[msgs.length - 1].message.chat.id);
  PropertiesService.getScriptProperties().setProperty('TG_CHAT_ID', chatId);
  telegram_('ACL অর্ডার নোটিফিকেশন চালু হয়েছে। নতুন অর্ডার এলে এখানে মেসেজ আসবে।');
  Logger.log('Saved chat id ' + chatId);
}

/* ---------- helpers ---------- */
function telegram_(text) {
  const chat = PropertiesService.getScriptProperties().getProperty('TG_CHAT_ID');
  if (!TG_TOKEN || !chat) return;
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'post', payload: { chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: 'true' }, muteHttpExceptions: true,
    });
  } catch (err) { /* an order must never fail because Telegram is down */ }
}
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#fde4df');
    sh.getRange(2, COL.status, 2000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
    sh.setColumnWidth(COL.note, 220);
  }
  return sh;
}
function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, COL.id, last - 1, 1).getValues().flat();
  const i = ids.indexOf(id);
  return i === -1 ? 0 : i + 2;
}
// Block spreadsheet formula injection (cells starting with = + - @ become plain text) and cap length.
function clean_(v) {
  let s = String(v == null ? '' : v).slice(0, 1000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
