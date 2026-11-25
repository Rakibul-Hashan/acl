/* ============================================================
   Product + bundle catalogue.
   PRICES: only the Seed Mix prices (৳160 / ৳300) come from your labels.
   Every other price below is a PLACEHOLDER — replace before launch.
   ============================================================ */

/* Sizes. Only these prices are printed on your labels: Seed Mix 150 g ৳160, 300 g ৳300; Ghee 1 kg ৳1800.
   Everything else is a PLACEHOLDER. Rule used: 500 g ≈ 1.9×, 1 kg ≈ 3.6× the 250 g price. */
const r10 = n => Math.round(n / 10) * 10;
const sz = p250 => [
  { id: '250', g: 250, bn: '২৫০ গ্রাম', price: p250 },
  { id: '500', g: 500, bn: '৫০০ গ্রাম', price: r10(p250 * 1.9) },
  { id: '1000', g: 1000, bn: '১ কেজি', price: r10(p250 * 3.6) },
];

/* Label art metadata (fractions of the label image).
   spots  = where the printed net weight sits, repainted when a size differs from the printed one
   badges = printed price badges, repainted with the right price
   frontX = horizontal centre of the front panel on long (pouch-style) labels */
export const LABELS = {
  portrait: { native: 250, spots: [[0.5, 0.965, 0.46, 0.056, 'bn']] },
  'seed-mix-150': { wide: true, native: 150, frontX: 0.37, spots: [[0.378, 0.944, 0.2, 0.05, 'bn'], [0.875, 0.944, 0.17, 0.05, 'en']], badges: [[0.325, 0.47, 0.095, 'bn']] },
  'seed-mix-300': { wide: true, native: 300, frontX: 0.37, spots: [[0.372, 0.962, 0.2, 0.05, 'bn'], [0.88, 0.962, 0.17, 0.05, 'en']] },
  ghee: { wide: true, native: 1000, frontX: 0.37, spots: [[0.371, 0.954, 0.15, 0.064, 'bn'], [0.873, 0.954, 0.15, 0.064, 'en']], badges: [[0.308, 0.445, 0.088, 'bn'], [0.829, 0.443, 0.1, 'en']] },
};

const common = {
  storage: ['শুষ্ক ও ঠান্ডা স্থানে রাখুন', 'ব্যবহারের পর ঢাকনা শক্ত করে লাগান', 'ভেজা চামচ ব্যবহার করবেন না'],
};

export const PRODUCTS = [
  {
    slug: 'chilli', cat: 'spice', bn: 'মরিচের গুড়া', en: 'Chilli Powder',
    accent: '#e0301e', soft: '#fde4df', fill: '#a8301c', fill2: '#6e1a0e',
    sizes: sz(180),
    label: 'chilli', photos: ['assets/photos/chilli-jar.webp'],
    pitch: 'শুকনো লাল মরিচ আমরা নিজেরা কিনে, শুকিয়ে, নিজেরাই ভাঙাই। তরকারিতে রং আর ঝাল—দুটোই আসে মরিচ থেকে।',
    short: 'বাছাই করা শুকনো লাল মরিচ, নিজেরা শুকিয়ে ভাঙানো।',
    highlights: ['নিজেরা শুকিয়ে ভাঙানো', 'ছোট ব্যাচে তৈরি', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['ভুনা ও ঝোল', 'মাংস, মাছ বা ডিমের তরকারিতে রং ও ঝালের জন্য।'],
      ['মেরিনেশন', 'মাছ ভাজা বা মাংস ম্যারিনেট করার মসলায়।'],
      ['ভর্তা ও চাটনি', 'আলু ভর্তা, শুটকি ভর্তা বা টক-ঝাল চাটনিতে।'],
      ['ডাল ও সবজি', 'প্রতিদিনের ডাল-সবজিতে সামান্য পরিমাণে।'],
    ],
    faq: [['ঝাল কেমন?', 'মাঝারি থেকে বেশি ঝাল। প্রথমবার অল্প দিয়ে শুরু করুন, পরে পরিমাণ ঠিক করুন।']],
  },
  {
    slug: 'turmeric', cat: 'spice', bn: 'হলুদ গুড়া', en: 'Turmeric Powder',
    accent: '#e07614', soft: '#f8f0cc', fill: '#e8971c', fill2: '#c46f0c',
    sizes: sz(160),
    label: 'turmeric', photos: [],
    pitch: 'শুকনো হলুদ নিজেরা শুকিয়ে মিহি করে ভাঙানো—প্রতিদিনের রান্নার সবচেয়ে দরকারি মসলা।',
    short: 'শুকনো হলুদ নিজেরা শুকিয়ে মিহি করে ভাঙানো।',
    highlights: ['নিজেরা শুকিয়ে ভাঙানো', 'মিহি গুঁড়া', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['প্রতিদিনের তরকারি', 'মাছ, মাংস, সবজি—সব রান্নার শুরুতে।'],
      ['মাছ ভাজা', 'লবণের সাথে মাখিয়ে মাছ ভাজার আগে।'],
      ['ডাল', 'ডাল সিদ্ধ করার সময় সামান্য।'],
      ['হলুদ দুধ', 'গরম দুধে এক চিমটি মিশিয়ে।'],
    ],
    faq: [],
  },
  {
    slug: 'coriander', cat: 'spice', bn: 'ধনিয়া গুড়া', en: 'Coriander Powder',
    accent: '#9b6537', soft: '#f4e9dc', fill: '#b98c55', fill2: '#8e6533',
    sizes: sz(140),
    label: 'coriander', photos: [],
    pitch: 'ধনিয়া বীজ শুকিয়ে ভাঙানো—ঝোলে ঘনত্ব আর হালকা মিষ্টি ঘ্রাণ আনে।',
    short: 'ধনিয়া বীজ নিজেরা শুকিয়ে ভাঙানো।',
    highlights: ['নিজেরা শুকিয়ে ভাঙানো', 'তাজা ঘ্রাণ', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['মাংসের ঝোল', 'গরু-খাসি-মুরগির ঝোলে ঘনত্ব ও ঘ্রাণের জন্য।'],
      ['মাছের তরকারি', 'হলুদ-মরিচের সাথে মিলিয়ে।'],
      ['কাবাব ও চপ', 'কিমা বা কাবাবের মসলায়।'],
      ['সবজি ও ডাল', 'নামানোর আগে এক চামচ।'],
    ],
    faq: [],
  },
  {
    slug: 'methi', cat: 'spice', bn: 'মেথি গুড়া', en: 'Fenugreek Powder',
    accent: '#4d7b3c', soft: '#e4ecdc', fill: '#c89a42', fill2: '#9a7230',
    sizes: sz(150),
    label: 'methi', photos: [],
    pitch: 'মেথি দানা শুকিয়ে ভাঙানো। তেতো-মিষ্টি স্বাদটা অল্প পরিমাণেই রান্নায় অন্যরকম ঘ্রাণ আনে।',
    short: 'মেথি দানা নিজেরা শুকিয়ে ভাঙানো।',
    highlights: ['নিজেরা শুকিয়ে ভাঙানো', 'অল্পতেই কাজ চলে', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['আচার', 'আম, জলপাই বা লেবুর আচারের মসলায়।'],
      ['ফোড়ন-ধাঁচের রান্না', 'শাক, সবজি ও ডালে সামান্য।'],
      ['মাছের ঝোল', 'হালকা তেতো ঘ্রাণের জন্য এক চিমটি।'],
      ['রুটি-পরোটা', 'ময়দার সাথে সামান্য মিশিয়ে।'],
    ],
    faq: [['স্বাদ কি তেতো?', 'হ্যাঁ, মেথির স্বাভাবিক হালকা তেতো স্বাদ আছে। তাই অল্প পরিমাণে ব্যবহার করুন।']],
  },
  {
    slug: 'sunflower', cat: 'seed', bn: 'সূর্যমুখী বীজ', en: 'Sunflower Seed',
    accent: '#8f3a12', soft: '#f8eed3', fill: '#d9cfba', fill2: '#8e8676', seeds: true,
    sizes: sz(220),
    label: 'sunflower', photos: [],
    pitch: 'খোসা ছাড়ানো সূর্যমুখী বীজ—সরাসরি খান, অথবা সালাদ ও ওটসে ছিটিয়ে দিন।',
    short: 'খোসা ছাড়ানো সূর্যমুখী বীজ। প্রোটিন ও ফাইবারের প্রাকৃতিক উৎস।',
    highlights: ['খোসা ছাড়ানো', 'সরাসরি খাওয়া যায়', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['স্ন্যাক্স', 'বিকেলের নাস্তায় এক মুঠো।'],
      ['সালাদ', 'যেকোনো সালাদের উপর ছিটিয়ে।'],
      ['ওটস ও দই', 'সকালের নাস্তায় মিশিয়ে।'],
      ['হালকা ভেজে', 'শুকনো প্যানে ২-৩ মিনিট টেলে নিলে আরও মচমচে।'],
    ],
    faq: [],
  },
  {
    slug: 'pumpkin', cat: 'seed', bn: 'কুমড়া বীজ', en: 'Pumpkin Seed',
    accent: '#4c8236', soft: '#e3ecdb', fill: '#8fa35c', fill2: '#5c6e34', seeds: true,
    sizes: sz(420),
    label: 'pumpkin', photos: [],
    pitch: 'সবুজ খোসাহীন কুমড়া বীজ—মচমচে, হালকা বাদামি স্বাদ। প্রতিদিনের নাস্তায় সহজে যোগ করা যায়।',
    short: 'খোসাহীন কুমড়া বীজ। প্রোটিন, ভালো ফ্যাট ও খনিজের উৎস।',
    highlights: ['খোসাহীন সবুজ বীজ', 'সরাসরি খাওয়া যায়', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['স্ন্যাক্স', 'সরাসরি বা হালকা টেলে।'],
      ['সালাদ ও স্যুপ', 'উপরে ছিটিয়ে মচমচে ভাবের জন্য।'],
      ['স্মুদি', 'কলা বা দুধের সাথে ব্লেন্ড করে।'],
      ['বেকিং', 'রুটি, কুকি বা গ্রানোলায়।'],
    ],
    faq: [],
  },
  {
    slug: 'chia', cat: 'seed', bn: 'চিয়া সিড', en: 'Chia Seed',
    accent: '#2a2a2a', soft: '#ececec', fill: '#4b4743', fill2: '#2a2725', seeds: true,
    sizes: sz(280),
    label: 'chia', photos: [],
    pitch: 'পানি বা দুধে ভিজিয়ে রাখলে জেলির মতো হয়ে যায়—শরবত, পুডিং আর স্মুদির জন্য সহজ যোগ।',
    short: 'কালো চিয়া সিড। ফাইবার ও ওমেগা-৩ এর উদ্ভিজ্জ উৎস।',
    highlights: ['ভিজিয়ে খাওয়ার উপযোগী', 'অল্পতেই অনেকদিন চলে', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['চিয়া পানি', '১ চামচ বীজ এক গ্লাস পানিতে ১৫-২০ মিনিট ভিজিয়ে।'],
      ['শরবত', 'লেবু বা ইসবগুলের শরবতের মতো।'],
      ['চিয়া পুডিং', 'দুধে রাতভর ভিজিয়ে, ফল দিয়ে।'],
      ['স্মুদি ও দই', 'ভেজানো চিয়া মিশিয়ে।'],
    ],
    faq: [['শুকনো খাওয়া যায়?', 'ভিজিয়ে খাওয়াই ভালো। চিয়া পানি শুষে ফুলে ওঠে, তাই শুকনো অবস্থায় বেশি খাবেন না।']],
  },
  {
    slug: 'soybean', cat: 'seed', bn: 'সয়াবিন বীজ', en: 'Soybean Seed',
    accent: '#b5834f', soft: '#eef2d8', fill: '#e2c895', fill2: '#b99a62', seeds: true,
    sizes: sz(90),
    label: 'soybean', photos: [],
    pitch: 'বাছাই করা সয়াবিন দানা—ভিজিয়ে সিদ্ধ করে তরকারি, খিচুড়ি বা ঘরে সয়া দুধ বানাতে।',
    short: 'বাছাই করা সয়াবিন দানা। উদ্ভিজ্জ প্রোটিনের উৎস।',
    highlights: ['বাছাই করা দানা', 'রান্নার উপযোগী', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['তরকারি', 'রাতে ভিজিয়ে, সিদ্ধ করে আলু-টমেটো দিয়ে।'],
      ['খিচুড়ি', 'ডালের সাথে এক মুঠো।'],
      ['ভাজা স্ন্যাক্স', 'ভিজিয়ে, শুকিয়ে হালকা ভেজে।'],
      ['সয়া দুধ', 'ভিজিয়ে ব্লেন্ড করে ছেঁকে ফুটিয়ে।'],
    ],
    faq: [['কাঁচা খাওয়া যায়?', 'না, সয়াবিন অবশ্যই ভিজিয়ে ভালো করে সিদ্ধ বা রান্না করে খাবেন।']],
  },
  {
    slug: 'sesame', cat: 'seed', bn: 'সাদা তিল', en: 'White Sesame Seed',
    accent: '#8b4a1f', soft: '#f1e6dd', fill: '#ead8b2', fill2: '#bfa77a', seeds: true,
    sizes: sz(160),
    label: 'sesame', photos: ['assets/labels/sesame-alt.webp'],
    pitch: 'পরিষ্কার সাদা তিল—তিলের নাড়ু, তিল ভর্তা আর পিঠার জন্য।',
    short: 'বাছাই করা পরিষ্কার সাদা তিল।',
    highlights: ['বাছাই করা পরিষ্কার দানা', 'নাড়ু ও পিঠার জন্য', 'এয়ারটাইট জার', '২৫০ গ্রাম, ৫০০ গ্রাম ও ১ কেজি'],
    uses: [
      ['তিলের নাড়ু', 'গুড় দিয়ে শীতের নাড়ু।'],
      ['তিল ভর্তা', 'টেলে, রসুন-মরিচ দিয়ে বেটে।'],
      ['পিঠা', 'তিলের পুলি বা পাটিসাপটার পুরে।'],
      ['টপিং', 'রুটি, বান বা সালাদের উপর।'],
    ],
    faq: [],
  },
  {
    slug: 'seed-mix', cat: 'seed', bn: 'সানফ্লাওয়ার ও কুমড়া বীজের মিক্স', bnShort: 'সিড মিক্স', en: 'Sunflower & Pumpkin Seeds Mix',
    accent: '#e8a015', accent2: '#7c9a3c', soft: '#f6edd2', fill: '#a9ad85', fill2: '#d6ccb4', seeds: true, wide: true,
    // 150 g and 300 g prices are printed on your labels; 500 g / 1 kg are placeholders.
    sizes: [
      { id: '150', g: 150, bn: '১৫০ গ্রাম', price: 160, label: 'seed-mix-150' },
      { id: '300', g: 300, bn: '৩০০ গ্রাম', price: 300, label: 'seed-mix-300' },
      { id: '500', g: 500, bn: '৫০০ গ্রাম', price: 480, label: 'seed-mix-300' },
      { id: '1000', g: 1000, bn: '১ কেজি', price: 920, label: 'seed-mix-300' },
    ],
    label: 'seed-mix-150', cardImg: 'assets/labels/seed-mix-card.webp', photos: [],
    pitch: 'সূর্যমুখী আর কুমড়া বীজ একসাথে—সরাসরি নাস্তা হিসেবে, বা সালাদ, স্মুদি ও দুধের সাথে মিশিয়ে।',
    short: 'সানফ্লাওয়ার ও কুমড়া বীজের মিক্স। প্রোটিন, ফাইবার, ভিটামিন ই ও খনিজের উৎস।',
    highlights: ['দুই বীজ এক জারে', 'সরাসরি খাওয়া যায়', '১৫০ গ্রাম থেকে ১ কেজি', 'প্রতিদিন ছোট এক মুঠো'],
    uses: [
      ['সরাসরি স্ন্যাক্স', 'প্রতিদিন ছোট একটি মুঠো।'],
      ['সালাদ', 'উপরে ছিটিয়ে।'],
      ['স্মুদি', 'ফল ও দুধের সাথে ব্লেন্ড করে।'],
      ['দুধ বা দই', 'সকালের নাস্তায় মিশিয়ে।'],
    ],
    faq: [['কোন সাইজ নেব?', 'প্রথমবার হলে ১৫০ গ্রাম নিয়ে দেখুন। নিয়মিত খেলে ৩০০ গ্রামে প্রতি গ্রামে খরচ কম পড়ে।']],
  },
  {
    slug: 'ghee', cat: 'ghee', bn: 'দেশি ঘি', en: 'Deshi Ghee',
    accent: '#b8860b', soft: '#f7efd6', fill: '#f2c24a', fill2: '#e0a92a', solid: true, wide: true,
    // 1 kg ৳1800 is printed on your label; 500 g is a placeholder.
    sizes: [
      { id: '1000', g: 1000, bn: '১ কেজি', price: 1800, label: 'ghee' },
      { id: '500', g: 500, bn: '৫০০ গ্রাম', price: 920, label: 'ghee' },
    ],
    label: 'ghee', cardImg: 'assets/labels/ghee-card.webp', photos: [],
    pitch: 'দানাদার, সুগন্ধি দেশি ঘি। গরম ভাতে এক চামচ, পোলাও-বিরিয়ানি বা পিঠা-পায়েসে—রান্নায় আলাদা ঘ্রাণ আনে।',
    short: 'সুগন্ধি দেশি ঘি। রান্না, পোলাও আর মিষ্টান্নের জন্য।',
    highlights: ['দেশি ঘি', 'রান্না ও মিষ্টান্নে', 'শক্ত ঢাকনার জার', '১ কেজি ও ৫০০ গ্রাম'],
    uses: [
      ['গরম ভাতে', 'ভাত, ডাল বা আলু ভর্তার সাথে এক চামচ।'],
      ['পোলাও-বিরিয়ানি', 'চাল ভাজা আর শেষে ঘ্রাণের জন্য।'],
      ['পিঠা ও মিষ্টি', 'সুজি, হালুয়া, পায়েস আর পিঠায়।'],
      ['পরোটা-রুটি', 'পরোটা ভাজা বা রুটিতে মাখিয়ে।'],
    ],
    faq: [['ঘি জমে গেছে কেন?', 'ঠান্ডায় ঘি জমে দানাদার হয়ে যাওয়া স্বাভাবিক। জারটি কিছুক্ষণ গরম পানিতে রাখলে আবার গলে যাবে।'],
      ['কিভাবে রাখব?', 'শুকনো চামচ ব্যবহার করুন আর ঢাকনা শক্ত করে লাগিয়ে ঠান্ডা, শুকনো জায়গায় রাখুন।']],
  },
].map(p => ({ ...p, storage: common.storage }));

export const BUNDLES = [
  {
    id: 'kitchen', bn: 'রান্নাঘরের বেসিক কম্বো', note: 'প্রতিদিনের রান্নার তিন মসলা একসাথে',
    items: [['chilli', '250'], ['turmeric', '250'], ['coriander', '250']], off: 0.1,
  },
  {
    id: 'seeds', bn: 'হেলদি সিডস কম্বো', note: 'নাস্তার জন্য তিন রকম বীজ',
    items: [['chia', '250'], ['pumpkin', '250'], ['sunflower', '250']], off: 0.1,
  },
  {
    id: 'month', bn: 'মাসের মসলা প্যাক', note: 'চার মসলা—এক মাসের বাজার একবারে',
    items: [['chilli', '250'], ['turmeric', '250'], ['coriander', '250'], ['methi', '250']], off: 0.12,
  },
  {
    id: 'festive', bn: 'উৎসবের রান্নার প্যাক', note: 'পোলাও-কোরমার ঘি আর তিন মসলা',
    items: [['ghee', '1000'], ['chilli', '250'], ['turmeric', '250'], ['coriander', '250']], off: 0.06,
  },
  {
    id: 'starter', bn: 'ট্রাই করে দেখুন', note: 'কম বাজেটে প্রথম অর্ডার',
    items: [['seed-mix', '150'], ['turmeric', '250']], off: 0.07,
  },
];

export const FAQ = [
  ['টাকা কি আগে দিতে হবে?', 'না। ক্যাশ অন ডেলিভারি—পণ্য হাতে পেয়ে, দেখে টাকা দিন।'],
  ['মসলা কি আপনারা নিজেরাই ভাঙান?', 'হ্যাঁ। আমরা কাঁচামাল কিনে এনে নিজেরা শুকিয়ে নিজেরাই ভাঙাই, তারপর জারে প্যাক করি।'],
  ['ডেলিভারি কত দিনে পাব?', 'ঢাকার ভেতরে সাধারণত ১–২ দিন, ঢাকার বাইরে ২–৪ দিন। কুরিয়ারের ওপর নির্ভর করে সময় কিছুটা কম-বেশি হতে পারে।'],
  ['একটা পণ্য অর্ডার করা যাবে?', 'অবশ্যই। একটা জার হলেও অর্ডার নেওয়া হয়।'],
  ['অর্ডার কনফার্ম হবে কিভাবে?', 'অর্ডার দেওয়ার পর আমরা ফোন বা WhatsApp এ যোগাযোগ করে কনফার্ম করব।'],
  ['পণ্যে সমস্যা থাকলে?', 'ডেলিভারির সময় দেখে নিন। কোনো সমস্যা থাকলে সাথে সাথে WhatsApp এ ছবি পাঠান।'],
];

export const bySlug = Object.fromEntries(PRODUCTS.map(p => [p.slug, p]));

export function sizeOf(p, id) { return p.sizes.find(s => s.id === id) || p.sizes[0]; }
export const minPrice = p => Math.min(...p.sizes.map(s => s.price));
export const labelMeta = (p, s) => LABELS[(s && s.label) || p.label] || LABELS.portrait;
/* Jar shape from net weight — matches the reference jars: tall round jar for 250 g,
   squat wide-mouth PET jar for 150–200 g, bigger wide jars for 500 g and 1 kg. */
export const jarShape = g => (g <= 200 ? 'wideS' : g <= 250 ? 'tall' : g <= 600 ? 'wide' : 'big');

/* Catalogue sanity check (runs once, warns in the console only). */
export function validateCatalog() {
  const bad = [];
  for (const p of PRODUCTS) {
    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) bad.push(`${p.slug}: invalid slug`);
    if (!p.sizes?.length) bad.push(`${p.slug}: no sizes`);
    for (const s of p.sizes || []) if (!(s.price > 0) || !(s.g > 0) || !s.id) bad.push(`${p.slug}/${s.id}: bad size`);
  }
  for (const b of BUNDLES) for (const [slug, sid] of b.items) {
    if (!bySlug[slug] || !bySlug[slug].sizes.some(s => s.id === sid)) bad.push(`bundle ${b.id}: unknown ${slug}/${sid}`);
  }
  if (bad.length) console.warn('ACL catalogue problems:', bad);
  return bad;
}

export function bundlePricing(b) {
  const parts = b.items.map(([slug, sid]) => { const p = bySlug[slug]; return { p, s: sizeOf(p, sid) }; });
  const full = parts.reduce((a, x) => a + x.s.price, 0);
  const price = Math.floor((full * (1 - b.off)) / 10) * 10;
  return { parts, full, price, save: full - price };
}

/* Customer reviews — ONLY real ones, copied with the customer's permission.
   The reviews section stays hidden while this list is empty.
   Example shape:
   { name: 'রহিমা খাতুন', area: 'মিরপুর, ঢাকা', product: 'turmeric', text: '...' }  */
export const REVIEWS = [];
