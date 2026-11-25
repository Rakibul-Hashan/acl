/* ============================================================
   ACL — site configuration
   Everything a non-developer needs to change lives in this file.
   ============================================================ */
export const CONFIG = {
  brand: {
    name: 'ACL',
    company: 'এ সি এল ইন্ডাস্ট্রি লিমিটেড',
    tagline: 'স্বাস্থ্যসম্মত মসলার একমাত্র ভরসা',
  },

  // WhatsApp number. Either format works: '01973030701' or '8801973030701'.
  // While empty, every WhatsApp button stays hidden; once set, they all appear.
  whatsapp: '8801973030701',
  phoneDisplay: '০১৯৭৩-০৩০৭০১', // shown on the site; hidden while empty
  callNumber: '+8801973030701', // number for the call button; defaults to the WhatsApp number

  // Live domain, e.g. 'https://acl.com.bd'. If empty, the site uses whatever domain it is opened on.
  siteUrl: 'https://aclltd.vercel.app',
  email: 'siddequrrahman22@gmail.com', // shown on policy pages if set

  // Hours you reply on WhatsApp (24h, Asia/Dhaka). Drives the "online now" dot.
  hours: { open: 10, close: 22 },

  // Delivery charges in BDT.
  delivery: {
    insideDhaka: 70,
    outsideDhaka: 130,
    freeAbove: 1200,          // set to 0 to disable free delivery
    daysInside: [1, 2],       // estimated delivery window in days
    daysOutside: [2, 4],
    insideDistricts: ['ঢাকা'], // districts charged the inside-Dhaka rate
  },

  // Return policy numbers shown on the policy page.
  policy: {
    reportWithinHours: 24,   // customer must report a problem within this time
    refundWithinDays: 3,     // refund / replacement time after a valid claim
  },

  // ORDER NOTIFICATIONS — no server needed.
  // Web3Forms emails every order to you. Free: 250 orders/month.
  // The key is meant to be public, so it is safe in this file and on GitHub.
  notify: {
    web3formsKey: '7b31fd01-9b8f-47c3-9c35-c5de05714216',
  },

  // Optional second copy: POST each order as JSON to a Google Apps Script web app
  // (see tools/google-apps-script.gs). Leave '' to disable.
  orderWebhook: '',
  // Simple shared key the Apps Script checks (filters random bots; not a secret).
  orderWebhookKey: 'acl-orders',

  // Optional ad tracking. Leave '' to disable.
  metaPixelId: '',
  gaMeasurementId: '',
};

// Resolves an asset path. The single-file build fills window.__ASSETS with data: URIs.
export const asset = p => (window.__ASSETS && window.__ASSETS[p]) || p;

// ---- helpers derived from the settings above (no need to edit) ----
// Accepts local BD numbers (01XXXXXXXXX), +880…, 880… and spaces/dashes; returns digits like 8801XXXXXXXXX.
const intlBD = v => {
  let d = String(v || '').replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/\D/g, '');
  if (/^01\d{9}$/.test(d)) d = '88' + d;
  return d;
};
export const WA = intlBD(CONFIG.whatsapp);
export const HAS_WA = /^\d{12,15}$/.test(WA);
export const SITE = () => (CONFIG.siteUrl || (/^https?:/.test(location.protocol) ? location.origin : '')).replace(/\/+$/, '');
export const CALL = () => { const c = intlBD(CONFIG.callNumber) || (HAS_WA ? WA : ''); return c ? '+' + c : ''; };
