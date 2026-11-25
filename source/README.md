# ACL website (live)

## Before launch: required
Orders must have somewhere to go. Set **at least one** of these in `js/config.js`:
- `notify.web3formsKey`: every order is emailed to you (recommended). Get a key at https://web3forms.com: enter your email, and the key arrives in your inbox. The free plan covers 250 orders/month.
- `whatsapp`: e.g. `'8801712345678'`. All WhatsApp buttons then appear automatically: the chat icon, "WhatsApp এ অর্ডার", and the button that sends the order from the status page.

If neither is set, a customer can place an order but it never reaches you. The browser console then shows: "ACL: no order channel is set".

## Settings (`js/config.js`)
| Setting | What it does |
|---|---|
| `whatsapp` | WhatsApp number. While empty, all WhatsApp buttons stay hidden |
| `phoneDisplay`, `callNumber` | Phone shown in the footer/menu with a call button. Hidden while empty |
| `notify.web3formsKey` | Order emails |
| `orderWebhook` | Optional Google Sheet (see `tools/google-apps-script.gs`) |
| `siteUrl` | Your domain. If empty, the site uses whatever domain it runs on |
| `delivery`, `policy`, `email` | Delivery charges/days, return-policy numbers, contact email |
| `metaPixelId`, `gaMeasurementId` | Ad tracking. Events: ViewContent, AddToCart, InitiateCheckout, Purchase |

## Prices (`js/data.js`)
Printed on the labels: Seed Mix 150 g ৳160 and 300 g ৳300; Ghee 1 kg ৳1800. Check all the other prices before launch.

## Hosting
1. Upload the **contents of this folder** to Netlify, Vercel, Cloudflare Pages or cPanel `public_html`.
2. Once the domain is live, run:

       python3 tools/build-pages.py https://your-domain.com

   This gives every product page (`chilli.html`, `ghee.html`, …) full share-image links, a canonical link and a sitemap, which Facebook/Google ads need. Then upload again.

To rebuild the single-file copy:

    python3 tools/build-single.py . ../index.html

## Pages
Home, product pages, `#checkout`, `#orders` (my orders), `#order-ACL-XXXXX` (order status + share link), `#about`, `#delivery-policy`, `#privacy`, `#terms`.

## Ghee label: fix before printing
- **Dates:** the expiry (18/02/2025) is earlier than the production date (18/10/2025).
- **"ব্যবহার" text:** it is copied from the chia label.
- **Fibre:** the label says ghee contains fibre, but ghee has none.
