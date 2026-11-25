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

  // WhatsApp number, international format, digits only — e.g. '8801712345678'.
  // While empty, every WhatsApp button stays hidden, so no customer is sent to a wrong number.
  // As soon as a number is set, all WhatsApp buttons appear automatically.
  whatsapp: '',
  phoneDisplay: '', // shown on the site, e.g. '০১৭১২-৩৪৫৬৭৮'; hidden while empty
  callNumber: '',   // number for the call button, e.g. '+8801712345678'; defaults to the WhatsApp number

  // Live domain, no trailing slash, e.g. 'https://acl.com.bd'. If empty, the site uses
  // whatever domain it is opened on. Set it so share images / sitemap get full links.
  siteUrl: '',
  email: '', // shown on policy pages if set

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
  //   1. Open https://web3forms.com, enter your email, and get the Access Key from your inbox.
  //   2. Paste it below. The key is meant to be public, so it is safe in this file.
  notify: {
    web3formsKey: '',
  },

  // Optional second copy: POST each order as JSON to this URL (e.g. a Google Apps Script
  // web app that appends to a Google Sheet). Leave '' to disable.
  orderWebhook: '',
  // Simple shared key the Apps Script checks (filters random bots; not a secret, it ships to the browser).
  orderWebhookKey: 'acl-orders',

  // Optional ad tracking. Leave '' to disable.
  metaPixelId: '',
  gaMeasurementId: '',
};

// Resolves an asset path. The single-file build fills window.__ASSETS with data: URIs.
export const asset = p => (window.__ASSETS && window.__ASSETS[p]) || p;

// Helpers derived from the settings above
export const HAS_WA = /^\d{10,15}$/.test(String(CONFIG.whatsapp || ''));
export const SITE = () => (CONFIG.siteUrl || (/^https?:/.test(location.protocol) ? location.origin : '')).replace(/\/$/, '');
export const CALL = () => CONFIG.callNumber || (HAS_WA ? '+' + CONFIG.whatsapp : '');
