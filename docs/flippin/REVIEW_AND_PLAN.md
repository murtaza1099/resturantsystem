# Flippin: PRD review, UI/UX direction and step-by-step build plan

27 Sep 2026. Based on a read of the repo at `claude/stoic-dijkstra-l7q1lj` (commit `7fe88bf`) and the PRD dated 27 Sep 2026.

How to use this file: read sections 1 to 4 once. Do the owner tasks in section 5. Then run the prompts in section 8 one at a time in Claude Code, each on its own branch, and check each gate before you start the next one.

---

## 1. Verdict

The PRD is well structured and most of the product thinking is right. Three problems could sink the demo:

1. **The backend risk is bigger than the PRD says.** The apps expect more than ~400 GraphQL operations. They also expect REST endpoints, a hidden request-signing handshake and a large `Configuration` object that carries every key the apps use. None of that is in the plan.
2. **Scope is too wide for a first demo.** The PRD has 60+ P0 rows across 9 surfaces, plus finance, subscriptions and an owner app. Keeping single-vendor mode doubles the API surface for no gain in the demo.
3. **Some UAE rules are wrong or missing.** Service charges are banned at most Dubai and Abu Dhabi restaurants. Consumer prices must be shown VAT-inclusive. The e-invoicing ASP deadline has moved.

Fix these three and the plan can be done. The rest of this document lists every issue, the UI/UX direction, and the prompts to build it.

---

## 2. Where the PRD is wrong (with evidence from the code)

### 2.1 Critical: these change the plan

| # | PRD says | Reality in the repo | Fix |
| --- | --- | --- | --- |
| C1 | "The apps call about 186 queries, 185 mutations and 33 subscriptions" and all of it is GraphQL | The apps also call REST endpoints on the server: `stripe/create-checkout-session`, `stripe/success`, `stripe/cancel`, `paypal/success`, `paypal/cancel` (customer app), `stripe/account` (both admins), `/tracking`, `/maps/reverse-geocode`, `/chat-unread`, `/last-notification` (web). The customer app has a separate `SERVER_REST_URL`. | Add a REST inventory to Step 1 and build these routes in the backend. |
| C2 | Not mentioned | Every app runs a hidden anti-abuse handshake. It calls a `metricsGeneral` mutation that returns decoy fields (`excellence`, `topgun`, `hehe`, `huhu`…), stores the result under disguised keys (`usr_prf_cache`, `dev_meta_id`), and sends it back as a `bop-auth` header with a `nonce`. See `enatega-multivendor-store/lib/services/public-access-token.service.ts` and `enatega-multivendor-admin/lib/hooks/useSetApollo.tsx:150-240`. | **Remove it from all apps.** Don't copy it. It is security by obscurity and costs a day to reverse-engineer. Use normal JWT plus rate limits (section 7). |
| C3 | "Access token: JWT, 15-minute expiry" | The admin already has a refresh-token flow (`REFRESH_TOKEN` mutation with `refreshToken` and `userType`). The web, customer, rider and store apps store one token and have no refresh logic. A 15-minute token would log riders out mid-delivery. | Build refresh in the backend with the admin's contract. Add a refresh path to the other apps in their own steps, or give mobile apps 30-day tokens that can be revoked in the demo. |
| C4 | Config comes from env vars | The apps read most keys from the server's `Configuration` query: Stripe publishable key, Google client IDs, Amplitude, Sentry DSN (`customerAppSentryUrl`), `testOtp`, `googlePlacesApiBaseUrl`, terms and privacy URLs, currency, and more. See `enatega-multivendor-app/environment.js`. | The backend's `settings` table must serve the full `Configuration` shape from day one, or every app starts with blanks. |
| C5 | Keep single-vendor admin as an open question | Single-vendor is not only the second admin. It is also 275 of the 724 source files in the customer app (`src/singlevendor/`), a separate GraphQL file in web (`lib/api/graphql/single-vendor/index.ts`), a `TOGGLE` mode in every app, and schema-check scripts in each app. Together the two admins carry about 180 operations each. | **Decide now: multi-restaurant only.** A one-restaurant client is just a platform with one restaurant. Delete `enatega-singlevendor-admin` and `src/singlevendor`, and hard-set `VENDOR_MODE=MULTI`. That removes about 40% of the API surface. |
| C6 | "Secrets out of git: remove the old committed google-services.json…" | These keys belong to Enatega's Firebase project, not yours. Deleting the files in a new commit leaves them in git history. The rider app also has a hard-coded Sentry DSN (`enatega-multivendor-rider/lib/utils/service/sentry.ts:9`). Service workers carry a Firebase web key. | Delete them, then **give the buyer a fresh repo with clean history**: `git filter-repo`, or a squashed single-commit export. Never hand over this repo's history. |
| C7 | Not mentioned | `.github/workflows/build-tenant-apk.yml` checks out a `saas-demo` branch that doesn't exist and POSTs build results to any `callback_url` given as input. `.codex/hooks.json` points to another developer's laptop (`/Users/muhammadali/...`). `enatega-multivendor-web/DESIGN.md` and `PRODUCT.md` tell AI tools to "preserve the Enatega name and existing logo" and keep the green `#75D04B`. | Delete the workflow and hooks. Replace DESIGN.md and PRODUCT.md with Flippin versions **before** any UI work. Otherwise Claude Code will follow them and rebuild the Enatega look. |
| C8 | Live updates with Postgres `LISTEN/NOTIFY` on Supabase | Supabase's transaction pooler (port 6543) does not support `LISTEN`. The free plan also **pauses the project after 7 days without activity**. A paused demo is dead when the buyer opens the link. | Use the direct connection or the session pooler (port 5432) for the listener. Use Supabase Pro ($25/mo) for anything a client will see, or at minimum a daily keep-alive ping. |
| C9 | POS prints to "80 mm ESC/POS thermal printers over network or USB via browser print" | A browser can't send raw ESC/POS. `window.print()` opens a dialog on every receipt, can't cut paper and can't open the cash drawer. Real restaurants won't accept that. | For the demo, use browser print with an `@page 80mm` stylesheet. That works on a tablet with a Wi-Fi printer. For production, choose one: (a) Epson TM-m30 series with ePOS-Print over HTTP from the browser, (b) Star WebPRNT, or (c) a Sunmi/iMin Android terminal with a built-in printer, running an Expo wrapper. Write this down as a decision. |

### 2.2 Important: UAE and domain rules

| # | PRD says | Correct rule | Fix |
| --- | --- | --- | --- |
| U1 | Service charge per restaurant, used in all POS maths | Under UAE consumer-protection rules, restaurants and cafés **outside hotels and clubs can't add a service charge** in Dubai and Abu Dhabi. Tourism-licensed (hotel) outlets can. Delivery fees are allowed. | Default the service charge to **off**. Allow it only for restaurants flagged `tourism_licensed`. Hotel outlets in Dubai may also add municipality and tourism fees, so model **tax lines as a list per restaurant**, not one `tax_rate`. |
| U2 | Prices "VAT-inclusive or exclusive per restaurant" | Prices can be **entered** either way, but prices **shown to consumers** in the UAE must include VAT. | Every customer, QR and menu screen shows VAT-inclusive prices. Receipts break out the VAT. |
| U3 | E-invoicing: B2B phases start 1 Jan 2027 (AED 50m+) and 1 Jul 2027 | Go-live dates are right. The ASP appointment deadline for AED 50m+ businesses moved from 31 Jul 2026 to **30 Oct 2026**; for others it is 31 Mar 2027. Fines can reach AED 5,000 per month. | Update 5.11. Keep PINT AE as P1. Sell it as "e-invoicing ready", not "compliant", until an ASP is connected. |
| U4 | Addresses by area and building | Right, but incomplete. UAE delivery addresses also use flat or villa number, floor, landmark and often a **Makani number** (Dubai) plus a map pin. Riders call the customer much more often than in other markets. | Address form fields: area, building or villa, flat, floor, landmark, map pin, optional Makani. Add a "call customer" button on the rider screen (masked number later). |
| U5 | Not mentioned | **Ramadan mode** matters more in the UAE than any P1 item. Opening hours change, iftar pre-orders spike at one time, and suhoor runs late at night. The UAE weekend is Saturday and Sunday. | Add a P1 row: seasonal hours set, scheduled orders with time slots, and kitchen capacity per slot. It is a strong demo moment for a Gulf buyer. |
| U6 | "Tax Invoice… sequential number" | Right. Also: one invoice sequence per restaurant (per TRN), numbers with no gaps, and a void creates a **credit note**, not a deletion. The PRD's `tax_invoices` table needs a `credit_notes` sibling. | Add `credit_notes` to section 8. |
| U7 | Order numbers | Kitchen, pickup screen and customers need **short daily numbers** (#047), not UUIDs or long `order_no`s. | `orders.display_no`, reset daily per restaurant. |
| U8 | Not mentioned | UAE Personal Data Protection Law (Federal Decree-Law 45 of 2021): consent, purpose, deletion on request. Supabase has no UAE region. | Add privacy consent at sign-up, a working "delete my account", and a data-location note in the demo kit (use Supabase Frankfurt or Mumbai, whichever gives lower latency). |
| U9 | "Real SMS OTP is a P2 switch" | UAE telecom rules require a **registered SMS sender ID**, which takes days to weeks. WhatsApp OTP is often faster to get approved. | Start sender-ID registration as soon as there is a first paying client. Keep `111111` for the demo. |

### 2.3 Important: build and store realities

| # | Issue | Fix |
| --- | --- | --- |
| B1 | Google Play: **new personal developer accounts must run a closed test with 12 testers for 14 days** before they can publish to production. | If you ever publish, open an **organization** Play account (needs a D-U-N-S number). For the demo, APK plus internal testing is enough. |
| B2 | TestFlight: internal testers must be users in your App Store Connect team (up to 100). An external or public link needs Beta App Review first. | Plan 1 to 2 days for beta review if the buyer needs a public TestFlight link. Apple enrolment for a company also needs D-U-N-S. |
| B3 | Rider background location needs a Play Console declaration and a video, and an iOS justification string. The repo already has `GOOGLE_PLAY_BACKGROUND_LOCATION_SUBMISSION.md`. | Reuse it and rebrand it. For the APK demo it isn't blocking. |
| B4 | Expo SDK 53 (customer, rider) and 54 (store). | Move all three to SDK 54 in their own steps, not in a separate step. Expo Go only runs the latest SDK, so SDK 53 apps need dev builds anyway. |
| B5 | "Upgrade admin panels from Next.js 14 to 16" | Low value, high risk (PrimeReact 10, next-intl 3, React 18 → 19). **Defer.** The buyer never sees the framework version. Restyle PrimeReact with a Flippin preset instead. |
| B6 | "Tokens used by Tailwind on web and NativeWind on mobile" | The customer app does **not** use NativeWind. It uses `StyleSheet` and `src/utils/themeColors.js`. Rider and store do use NativeWind. | Generate tokens into three outputs: a Tailwind preset, a NativeWind preset and a plain JS theme object for the customer app. |

### 2.4 Contradictions inside the PRD

- Section 4 puts POS in `apps/pos`. Section 7 says the repo layout is "`backend/` + `pos/`". Use `apps/pos` and `backend/` (or `apps/api`).
- 5.10 adds Flippin Plus subscriptions as P1. Section 9 lists "subscriptions/plans" as deferred and stubbed. Pick one. I recommend deferring it until after the first demo.
- 5.8 says "all seven apps". Section 4 lists nine surfaces. Section 1 lists six existing apps plus new ones.
- Section 2 says "no third-party servers or keys", but Firebase, Google, Stripe and Sentry are third parties. It means "no Enatega servers or keys"; say so.
- 5.8 promises "light and dark themes on every app". Dark mode for POS and customer is fine, but KDS should be **dark only**, and a light KDS just adds testing work.

### 2.5 Scope: cut for the first demo

A buyer judges the demo on two flows that work perfectly, not on 60 rows that half work. Recommended demo scope:

| Keep for the first demo (P0) | Move after first buyer (P1 or later) |
| --- | --- |
| Customer web + customer app (browse, cart, checkout, track) | Flippin Plus subscriptions |
| Store app (accept, ready) | Owner mobile app (use the admin on a phone) |
| Rider app (online, accept, deliver) | Inventory, recipes, food-cost % |
| POS (tables, order, fire, pay, split, receipt) | Suppliers, bills, P&L |
| KDS + pickup screen | Loyalty (hide any existing loyalty UI until it works; a "coming soon" badge looks worse than nothing) |
| QR table ordering | Admin Next 16 upgrade |
| Multi-restaurant admin + dashboard | PayPal (not common in the UAE; Apple Pay matters more) |
| VAT tax invoice + daily cash-up + VAT report CSV | Menu from photo (AI), support chat |
| Arabic + English, RTL | The other 30 languages: keep the files but show only AR and EN in the picker |

---

## 3. Decisions to make now

Answer these before Step 1. My recommendation comes first.

1. **Single-vendor mode:** delete it (recommended), or keep it.
2. **Demo payment gateway:** Stripe test mode (recommended: fastest, supports AED, Apple Pay and Google Pay). Switch to Network International or Telr per client later, behind a `PaymentProvider` interface.
3. **Backend: build or buy.** Enatega sells its backend. Buying it would save the riskiest 30% of the work, but check whether its licence lets you rebrand and resell. If it doesn't, or if the price is high, build it (this plan assumes build).
4. **Printing target:** browser print for the demo (recommended), then Epson ePOS for production.
5. **Domain:** `flippin.app` or another. You need it before Step 12 (emails, Apple sign-in and OAuth redirect URLs depend on it).
6. **What you sell:** source code only, or source + hosting + setup. This decides whether the backend needs multi-tenant billing (it does not, for the demo).

---

## 4. UI/UX direction: how to make it look designed, not generated

### 4.1 What makes an interface look "AI-made"

Buyers now spot these right away. Ban them in `CLAUDE.md` so every prompt follows the rule:

- Purple, blue or teal gradients, gradient text, glowing blobs behind the hero.
- Glassmorphism cards, frosted panels, heavy drop shadows on everything.
- Every card with the same 16–24 px radius, the same shadow, arranged in 3-column grids of identical boxes.
- Emoji used as icons. Mixed icon sets.
- Made-up stats ("10,000+ restaurants", "99.9% uptime") and fake testimonials.
- Headings like "Elevate your dining experience" or "Seamless. Smart. Delicious."
- Centred everything, one weight of Inter, grey-on-grey low-contrast text.
- Spinners on every load, "No data found" empty states, generic stock photos of smiling chefs.
- Animations on every element on scroll.

### 4.2 What makes it look designed

- **One accent colour, used rarely.** It marks the primary action and the active state, and nothing else. Neutrals do the rest of the work.
- **Real food photos**, shot top-down or 45°, same light, same background tone. Photos are 70% of a food app's look. The seed data should use one consistent photo set (e.g. licensed Unsplash set, colour-graded the same way), not random images.
- **A type scale with contrast.** Big, confident prices and totals, small quiet labels. Tabular (fixed-width) digits for every number that changes: prices, timers, totals.
- **Density matched to the job.** The customer app is airy. The POS and admin are dense. The KDS is huge and readable from 2 metres.
- **Real states.** Skeletons shaped like the content, empty states that say what to do next ("No orders yet today. New orders ring here."), and errors that say what happened and offer a retry.
- **Small, fast motion** (150–250 ms) only where it explains something: the item flies to the cart, the status step fills in, a ticket slides off the KDS.
- **Arabic designed, not flipped.** An Arabic typeface with the same weight as the Latin one, line height increased for Arabic, icons with direction (back, forward, progress) mirrored, and numbers and phone numbers kept left-to-right.

### 4.3 Brand system (fill in when the logo arrives)

**Send me the logo as:**
- SVG (vector) of the full logo (mark + wordmark), horizontal.
- SVG of the mark alone (square-friendly, for app icons and favicon).
- A one-colour version (white and black) if you have one.
- The font name of the wordmark, if it uses one.
PNG only works, but I'll have to trace it, and edges on app icons will be softer.

**From the logo I will derive:**
- Brand colour + a 50–950 tonal scale, checked for WCAG AA on white and on dark.
- Neutral scale with a slight warm or cool tint that matches the brand colour, not flat grey.
- Semantic colours: success, warning, danger, info, plus **order status colours** used the same way on every surface (new, accepted, preparing, ready, picked up, delivered, cancelled).
- **Typography suggestion** (final pick after the logo):
  - Option A: **IBM Plex Sans + IBM Plex Sans Arabic**. Designed as one family, very clean for POS and admin, neutral and trustworthy.
  - Option B: **Readex Pro** (Latin + Arabic in one font). Rounder and friendlier, good for a consumer food brand.
  - Option C: A display face from the logo for headings only, with Plex for UI text.
  - Tabular digits on for all prices, totals and timers.
- App icon rules: 1024×1024 PNG, no transparency (iOS); Android adaptive icon with the mark inside the central 66% safe zone; monochrome icon for Android 13+ themed icons; splash = mark on brand colour.

### 4.4 Screen-by-screen UX spec

**Customer web and app** (benchmarks: Talabat, Deliveroo, Careem Food, Noon Food)
- Home: address bar at top (tap = change address), search, cuisine chips that scroll sideways, then "Order again" (if logged in), then restaurant list. Restaurant card: photo 16:9, name, cuisine · rating · ETA · delivery fee, a "Closed, opens 6 pm" state that greys out the card.
- Restaurant page: cover, key facts in one line, sticky category tabs that follow scroll, items as rows with a photo on the side (fast to scan), not a grid of big cards.
- Item sheet: photo, name, price, required choices first and clearly marked "Required · choose 1", optional add-ons after, quantity stepper and the total on the add button ("Add · AED 42.00").
- Sticky cart bar: item count + total + "View cart". Mini cart on desktop as a right column.
- Checkout on one page: address, delivery time (now / schedule), payment (Apple Pay first on iOS), tip, coupon, a clear breakdown, and one big "Place order · AED 87.50" button. Prices include VAT.
- Tracking: map with rider + restaurant + home pins, a vertical status timeline, ETA as a time ("Arrives 7:42 pm") not only a countdown, rider name and call button.
- Sign-in: phone first (+971 pre-filled), OTP with auto-fill, guest checkout allowed.

**QR table ordering** (benchmark: Sunday, me&u)
- Opens in under 2 seconds on 4G. No app, no sign-in.
- Header: restaurant logo + "Table 12". Menu, cart, "Call waiter" and "Request bill" always one tap away.
- Order confirmation shows what the kitchen got and a status ("Sent to kitchen · Preparing").
- Security: the QR holds a signed table token. The first order from a new phone can be set to need a waiter's accept (stops prank orders). Rate-limit orders per table.

**POS** (benchmarks: Toast, Square for Restaurants, Lightspeed, Foodics — the main UAE competitor)
- Landscape tablet. Left: order ticket. Centre: menu grid. Top: order type + table + guests.
- Menu buttons at least 64 px tall, colour strip per category, item name in 2 lines max, price below.
- Floor view: tables drawn to scale, colour = state, seat count and time seated on each table.
- Totals in the largest type on screen. Pay button is always in the same place.
- Payment: amount keypad with quick cash buttons (exact, 50, 100, 200, 500), change due shown big.
- PIN pad with large keys, lock after idle time, shows the logged-in staff name.
- Keyboard shortcuts on desktop, `/` to search, number keys for quantity.

**KDS** (benchmarks: Toast KDS, Fresh KDS)
- Dark background, off-white text, one ticket per column, oldest top-left.
- Ticket header: order number (huge), type (dine-in / delivery / pickup / QR), table, time elapsed. Header colour goes neutral → amber → red by age.
- Modifiers indented under the item, notes in a highlighted box, allergens flagged.
- **All-day counts** bar (how many of each item are waiting across tickets).
- Tap an item to strike it, tap the header to bump the ticket. Bump bar and keyboard support. Recall the last 10 bumped tickets.
- Sound on new ticket, can be set per station.

**Pickup screen (TV)**
- Two columns, "Preparing / قيد التحضير" and "Ready / جاهز". Order numbers in very large type. A new Ready number blinks twice and chimes. Restaurant logo and nothing else.

**Store and rider apps** (one hand, one glance)
- New order: full-screen alert, loud sound + vibration that repeats until someone acts, big Accept and Reject buttons at the bottom, prep time picked with chips (10 / 15 / 20 / 30 min).
- Rider: an online / offline switch at the top, one active task card at a time, the next action as a swipe-to-confirm button at the bottom ("Swipe when picked up"), cash to collect shown large.

**Admin**
- Left nav grouped by job (Orders, Menu, Restaurants, Riders, Finance, Settings). KPI row with sparklines, one chart per question ("Sales today vs same day last week").
- One table component everywhere: search, filters as chips, column picker, CSV export, row click opens a side panel instead of a new page.
- Forms with inline validation and a sticky save bar.

---

## 5. What you need to set up (owner tasks)

Create these accounts with a company email (for example `ops@flippin.app` or a Gmail for now). **Put keys only into the service's own settings (Railway, Vercel, EAS). Never paste keys into chat or commit them.**

| # | Account | What to do | Cost | Needed by |
| --- | --- | --- | --- | --- |
| 1 | Supabase | Create project `flippin-demo`, region Frankfurt or Mumbai. Save the DB password in a password manager. Upgrade to Pro before any client sees it. | Free now, $25/mo later | Step 5 |
| 2 | Railway | Sign up with GitHub, create an empty project `flippin-api`. | ~$5/mo | Step 6 |
| 3 | Vercel | Already connected. Create a team for Flippin if you want it separate. Pro is required for commercial use. | $0 / $20/mo | Step 7 |
| 4 | Expo | Sign up, create org `flippin`. Run `npx eas login` once. | Free | Step 8 |
| 5 | Google Cloud | Project `flippin`. Enable Maps JavaScript, Maps SDK Android + iOS, Places (New), Directions/Routes, Geocoding. Add billing **and a budget alert at $20**. Create 3 keys: web (restricted by domain), Android (package + SHA-1), iOS (bundle ID). | Free credit covers the demo | Step 7 |
| 6 | Firebase | Project `flippin`. Add Android apps `com.flippin.customer`, `com.flippin.rider`, `com.flippin.store` and iOS equivalents. Download the new `google-services.json` / `GoogleService-Info.plist` and give them to EAS as file secrets (not git). | Free | Step 8 |
| 7 | Stripe | Account with country UAE, test mode. Turn on Apple Pay and Google Pay in test. | Free (test) | Step 6 |
| 8 | Sentry | Org `flippin`, one project per app. | Free | Step 12 |
| 9 | Resend | Verify the domain for emails. | Free | Step 12 |
| 10 | PostHog | Project `flippin`, EU cloud. | Free | Step 12 |
| 11 | Domain | Buy at Cloudflare Registrar (at-cost price, free DNS). | ~$15/yr | Step 12 |
| 12 | Apple Developer | Only if the client must install on an iPhone. Company enrolment needs a D-U-N-S number (free, takes days, so start now if you want it). | $99/yr | Step 12 |
| 13 | Google Play Console | Only if publishing. Use an **organization** account to skip the 12-tester rule. | $25 once | Later |
| 14 | Google OAuth + Apple Sign-In | OAuth client IDs (web, iOS, Android) in Google Cloud; a Services ID + key in Apple Developer. | Free | Step 6 |

**Demo logins:** you don't create these by hand. The seed script in Step 4 creates one per role (customer, rider, waiter, cashier, kitchen, manager, owner, super admin) with the OTP `111111` in demo mode.

**Hardware (optional, strong for a client demo):** one 10-inch Android tablet for the POS, one old tablet or TV for the KDS or pickup screen, and one 80 mm Wi-Fi thermal printer (Epson TM-m30III if you plan the ePOS route).

---

## 6. Target structure

```
flippin/
  apps/
    web/          customer website (Next 16)
    customer/     customer app (Expo 54)
    rider/        rider app (Expo 54)
    store/        restaurant app (Expo 54)
    admin/        admin panel (Next 14 → later 16)
    pos/          POS + /kds + /t/[token] + /pickup (Next 16, new)
  backend/        GraphQL + REST server (Node 20, Apollo 4, TS)
  packages/
    ui-tokens/    design tokens → Tailwind preset, NativeWind preset, JS theme
    contracts/    merged schema.graphql + operation inventory + REST inventory
  supabase/       migrations + seed
  docs/flippin/   PRD, this plan, DESIGN.md, demo script
  CLAUDE.md       rules every Claude Code session follows
```

Use npm workspaces (or pnpm) only for `packages/*` and `backend`. Keep each app's own lockfile at first so Expo builds don't break.

---

## 7. Security checklist (add to the PRD section 10)

The PRD's list is good. Add these:

- **The server calculates every price.** `PlaceOrder`, `qrPlaceOrder` and `takePayment` ignore any amount sent by the client and recompute from the menu, add-ons, coupon, fees and VAT.
- **Idempotency keys** on `PlaceOrder`, `takePayment` and refunds, so a double tap or a retry never charges twice.
- **Stripe:** the webhook marks the order paid, not the redirect back to the app.
- **Tenant isolation test:** a manager of restaurant A calling any resolver with restaurant B's ID gets `FORBIDDEN`. One automated test per resolver group.
- **PIN security:** 4-digit PINs have only 10,000 options. Lock per device and per staff after 5 wrong tries, and require the device to already be logged in as the restaurant.
- **QR token:** signed (HMAC), tied to restaurant + table, rotatable from admin. Guest orders rate-limited per table and per IP.
- **Uploads:** check the file type and size on the server, strip EXIF (removes location), convert to WebP.
- **Chat and notes:** stored and shown as plain text only (no HTML), limited length.
- **Audit log** is insert-only (no update or delete grants on that table).
- **Remove the `metricsGeneral` handshake** and replace it with rate limits and normal auth (see C2).
- **Delete account** works and removes personal data (UAE PDPL).
- **Dependency and secret scanning** in CI: `npm audit --omit=dev` for high issues and `gitleaks` on every PR.
- **Headers on web apps:** CSP, HSTS, `X-Frame-Options: DENY` (except the pickup screen if it is embedded), `Referrer-Policy`.

---

## 8. Step-by-step Claude Code prompts

**Rules for every step**
- Start each step in a **new Claude Code session**, on a new branch from the latest `main`. Paste the prompt as written.
- Each prompt tells Claude to read `CLAUDE.md` and this file first. That is how context carries between sessions.
- Don't start the next step until the gate passes. If a gate fails, paste the failure into the same session and ask for a fix.
- Merge each PR yourself after checking the preview link.

---

### Step 0: decisions and accounts (you)

Answer the six questions in section 3. Create accounts 1–7 and 14 from section 5. Send me the logo files (section 4.3).

**Gate:** decisions written at the top of `docs/flippin/PRD.md`; accounts exist; logo SVGs are in `docs/flippin/brand/`.

---

### Step 1: cleanup, monorepo layout, rules file

```
Read docs/flippin/REVIEW_AND_PLAN.md fully, especially sections 2, 3 and 6.

Goal: turn this repo into the Flippin monorepo layout without changing app behaviour.

Do this:
1. Move the apps with `git mv`: enatega-multivendor-web → apps/web, enatega-multivendor-app → apps/customer,
   enatega-multivendor-rider → apps/rider, enatega-multivendor-store → apps/store,
   enatega-multivendor-admin → apps/admin. Delete enatega-singlevendor-admin (decision: multi-restaurant only).
2. Delete: root index.html, root lib/, root package-lock.json, assets/ (old Enatega marketing images),
   .codex/, .github/workflows/build-tenant-apk.yml, .github/workflows/customer-app-design-audit.yml,
   every *_AUDIT.pdf, AUDIT-REMEDIATION-*.md, QUAL-012_BACKEND_INSTRUCTIONS.md, VENDOR_MODE_CONFIGURATION.md,
   CODE_OF_CONDUCT.md, CONTRIBUTING.md, the old README, apps/web/DESIGN.md and apps/web/PRODUCT.md.
   Keep each LICENSE file with the original MIT copyright line.
3. Delete committed secrets and config from other projects: every google-services.json, GoogleService-Info.plist,
   the hard-coded Sentry DSN in apps/rider/lib/utils/service/sentry.ts (read it from env instead),
   and the Firebase web config in public/firebase-messaging-sw.js and public/serviceWorker.js (generate from env at build time).
   Add these file names to .gitignore.
4. Write a root README.md (short: what Flippin is, folder map, how to run each app) and a root CLAUDE.md with:
   - the folder map from section 6,
   - "never commit keys; config comes from env or the backend Configuration query",
   - "multi-restaurant only; single-vendor code is being removed",
   - the full "banned AI look" list from section 4.1 and the "designed" rules from 4.2,
   - "all money in integer fils (minor units); display VAT-inclusive prices",
   - "every user-facing string goes through the app's i18n, with Arabic and English required".
5. Add a root package.json with npm workspaces for packages/* and backend only, and a .nvmrc with 20.
6. Add a GitHub Actions workflow `ci.yml` that runs, per app folder that changed: npm ci, lint, typecheck (tsc --noEmit where there is a tsconfig), and tests where they exist. Add a gitleaks job.
7. Fix any path that broke because of the moves (tsconfig paths, eas.json, scripts, metro config).

Don't change any UI or app logic in this step. Don't rewrite git history.
At the end, list everything you deleted and run lint + typecheck for apps/web and apps/admin, and `npx expo-doctor` for the three Expo apps, and report the results honestly.
```

**Gate:** CI green; `apps/web` runs with `npm run dev` and shows the home page; nothing named `enatega-singlevendor-admin` left.

---

### Step 2: remove single-vendor mode and the hidden handshake

```
Read CLAUDE.md and docs/flippin/REVIEW_AND_PLAN.md (items C2, C3, C5).

Goal: every app talks to one backend in one mode with standard auth.

1. Remove single-vendor mode from apps/web, apps/customer, apps/rider, apps/store:
   - delete apps/customer/src/singlevendor and everything that imports it,
   - delete apps/web/lib/api/graphql/single-vendor and single-vendor routes/branches,
   - delete the AppMode / vendor-mode toggle and the check-single-vendor-* scripts,
   - the app always runs in multivendor mode. Keep behaviour of the multivendor paths identical.
2. Remove the metricsGeneral / nonce / bop-auth request-signing handshake from all five apps
   (search for metricsGeneral, bop-auth, public-access-token, usr_prf_cache, dev_meta_id).
   Requests send only `Authorization: Bearer <token>` plus `x-client: web|customer|rider|store|admin`.
3. Make each app read its server URLs from one place:
   - web/admin: NEXT_PUBLIC_API_URL (https://.../graphql), NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_REST_URL.
   - Expo apps: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WS_URL, EXPO_PUBLIC_REST_URL via app config.
   Remove every hard-coded host: aws-server-v2.enatega.com, backup-server.enatega.com,
   enatega-multivendor-api-production-9b09.up.railway.app, multivendor.enatega.com, netlify.app hosts, 192.168.x.x.
   Add .env.example files listing every variable with a comment.
4. Add a token refresh path to web, customer, rider and store that uses the same REFRESH_TOKEN mutation contract as apps/admin
   (store accessToken + refreshToken; on UNAUTHENTICATED, refresh once, retry, else log out).
   Mobile: tokens in expo-secure-store.

Run lint and typecheck for every app you touched and fix what you broke. Report the number of files and GraphQL operations removed.
```

**Gate:** `grep -ri "enatega.com\|metricsGeneral\|singlevendor" apps/` returns nothing but LICENSE lines; all apps build.

---

### Step 3: API contract (the blueprint for the backend)

```
Read CLAUDE.md and docs/flippin/REVIEW_AND_PLAN.md (section 2.1).

Goal: an exact, machine-checked contract of what the apps expect from the server, in packages/contracts.

1. Write packages/contracts/scripts/extract.ts that walks apps/*/ (excluding node_modules) and collects every
   gql`` document (queries, mutations, subscriptions, fragments). Output:
   - operations.json: name, type, app(s), file:line, variables, selection set.
   - A report of operations used by more than one app with different selection sets.
2. Build packages/contracts/schema.graphql that satisfies ALL operations: infer types from selection sets,
   variable types and how the app code reads the result (open the component to see which fields are used as
   numbers, arrays, nullable). Where the app reads a field as an array, the schema says list, etc.
   Include the full `Configuration` type the apps read (see apps/*/environment* and configuration contexts).
3. Validate every operation against the schema with graphql-js `validate`. Target: 0 errors. Add `npm run contracts:check`
   and run it in CI.
4. REST inventory: find every fetch/axios/WebView URL built from the server URL (e.g. stripe/create-checkout-session,
   stripe/success, stripe/cancel, stripe/account, /tracking, /maps/reverse-geocode, /chat-unread, /last-notification,
   and file upload endpoints). Write rest.md with method, path, params, expected response and the calling file.
5. Write packages/contracts/DEMO_OPERATIONS.md: the operations each demo flow needs (delivery flow, dine-in flow,
   QR flow, admin dashboard), found by following the screens in those flows. Mark each "implement" or "stub".

Don't build the server yet. Report: total operations per app after Step 2, validation errors (must be 0),
number of REST endpoints, and the count marked "implement".
```

**Gate:** `npm run contracts:check` passes with 0 errors in CI.

---

### Step 4: brand and design system (needs the logo)

```
Read CLAUDE.md and docs/flippin/REVIEW_AND_PLAN.md section 4 completely. The logo files are in docs/flippin/brand/.

Goal: a Flippin design system and brand assets that every app will use.

1. Look at the logo. Propose 2 directions in docs/flippin/design/moodboard.html (a single static page I can open):
   each with brand colour scale (50–950), warm or cool neutrals, semantic + order-status colours,
   font pairing (from section 4.3 options, Latin + Arabic), radius and shadow scale, and a sample of:
   a restaurant card, the item sheet, a POS menu button, a KDS ticket, an admin KPI card, in light, dark, LTR and RTL.
   Check every text/background pair for WCAG AA and print the ratio next to it. Stop here and ask me to pick a direction.
2. After I pick: create packages/ui-tokens with tokens in one JSON source (Style Dictionary or a small script) that outputs:
   - tailwind-preset.js (web, admin, pos),
   - nativewind-preset.js (rider, store),
   - theme.js (customer app, replacing the colour values in src/utils/themeColors.js),
   - css variables for light and dark.
3. Brand assets: generate from the SVG mark: favicon set, PWA icons, Apple touch icon, iOS icon 1024 (no alpha),
   Android adaptive icon (foreground inside 66% safe zone + background colour + monochrome), splash screens,
   notification icon (white on transparent). Put them in packages/ui-tokens/brand and copy into each app.
4. Write docs/flippin/DESIGN.md (the Flippin design rules: tokens, type scale with tabular numbers,
   spacing, components, states, motion 150–250 ms, RTL rules, and the banned list from section 4.1).
   Point CLAUDE.md at it.
5. Rename app IDs: com.flippin.customer, com.flippin.rider, com.flippin.store; app names "Flippin", "Flippin Rider",
   "Flippin Store"; update eas.json and app config. Replace every visible "Enatega" in UI strings in all locales,
   metadata, manifest, emails and links. Add scripts/check-brand.sh that fails if "enatega" appears anywhere outside
   LICENSE files; run it in CI.
```

**Gate:** you approve the moodboard; `check-brand.sh` passes; icons look right on an Android launcher.

---

### Step 5: database and seed

```
Read CLAUDE.md, docs/flippin/PRD.md section 8, and docs/flippin/REVIEW_AND_PLAN.md sections 2.2 and 7.

Goal: Supabase schema + repeatable seed for the demo scope in section 2.5.

1. Supabase CLI migrations in supabase/migrations for the PRD section 8 tables in demo scope, plus:
   orders.display_no (daily per restaurant), restaurant tax_lines (list), restaurants.tourism_licensed,
   service charge only allowed when tourism_licensed, tax_invoices with per-restaurant gapless numbering
   (use a counter table + row lock, not a sequence), credit_notes, idempotency_keys, audit_log insert-only.
   Money as integer fils. Timestamps timestamptz. Indexes for every foreign key and for orders(restaurant_id, status, created_at).
2. Enable RLS on every table with deny-all by default (the server uses the service role; RLS is the second line).
3. Seed (supabase/seed.sql or a TS script) that resets to the same state every run:
   3 UAE restaurants (Dubai Marina, JLT, Business Bay) with Arabic + English names and menus, 60+ dishes with
   one consistent photo set uploaded to a public `menu` bucket as WebP under 200 KB, variations and add-on groups,
   2 zones drawn around those areas with fees in AED, 12 tables on 2 floors, 3 riders, 2 coupons,
   one user per role (emails like waiter@demo.flippin.app, PINs 1111/2222…, password in the demo kit),
   and 30 days of past orders with a realistic lunch/dinner curve so reports have numbers.
4. Write docs/flippin/demo-accounts.md listing every demo login (no real secrets).

Run the migrations against a local Supabase (supabase start) twice with a reset between, and prove the seed is identical both times (row counts + a checksum of totals).
```

**Gate:** `supabase db reset` + seed twice gives identical counts and totals; you create the hosted project and push migrations.

---

### Step 6: backend server

```
Read CLAUDE.md, docs/flippin/PRD.md sections 7, 9, 10, docs/flippin/REVIEW_AND_PLAN.md section 7,
packages/contracts/schema.graphql, rest.md and DEMO_OPERATIONS.md.

Goal: backend/ (Node 20, TypeScript, Apollo Server 4 on Express, graphql-ws) that answers every app request.

1. Load packages/contracts/schema.graphql. Resolvers for every operation marked "implement" in DEMO_OPERATIONS.md.
   Every other field auto-resolves to a type-correct empty value (null / [] / false / 0) and logs one line
   `stub_hit operation=... field=...`.
2. Auth: argon2id passwords; JWT access tokens (15 min web/admin, 30 days mobile, revocable via sessions table);
   refresh tokens hashed and rotated (same contract as apps/admin REFRESH_TOKEN); OTP with 111111 when DEMO_MODE=true;
   Google + Apple ID-token verification; staff PIN login with lockout; super admin TOTP.
3. Authorization: a directive or wrapper on each resolver with allowed roles and restaurant scoping.
   Add a test that calls every restaurant-scoped resolver as restaurant A's manager with restaurant B's ids and expects FORBIDDEN.
4. Pricing service used by PlaceOrder, qrPlaceOrder and takePayment: recomputes everything on the server
   (items, variations, add-ons, coupon, delivery fee by zone, tip, tax lines, VAT-inclusive handling). Never trust client amounts.
   Unit tests with fils-exact expected values, including VAT-inclusive and exclusive restaurants.
5. Order state machine (PRD section 6) in one module; every change writes order_status_events and publishes to subscriptions.
   Subscriptions via graphql-ws; cross-instance fan-out with Postgres LISTEN/NOTIFY on the DIRECT or session-pooler
   connection (not the 6543 transaction pooler).
6. REST routes from rest.md, including Stripe checkout session + webhook (signature verified, marks order paid)
   and image upload (type/size check, EXIF strip, WebP).
7. Configuration query served from the settings table (all fields the apps read).
8. Idempotency-Key support on PlaceOrder, takePayment and refunds.
9. Security: CORS allow-list from env, rate limits (login, OTP, place order, QR orders), depth/cost limits,
   introspection off in production, helmet headers, request id in every log line, Sentry.
10. /health endpoint, Dockerfile, railway.json. Vitest tests for pricing, state machine, auth, and tenant isolation.

Report test results honestly and the list of stubbed operations that the demo flows still hit.
```

**Gate:** tests pass; deployed on Railway; `/health` answers; you set Railway variables yourself.

---

### Step 7: customer website (connect + redesign)

```
Read CLAUDE.md, docs/flippin/DESIGN.md, docs/flippin/REVIEW_AND_PLAN.md sections 4.4 (Customer) and 2.2,
and docs/flippin/PRD.md section 12 (the 8 bugs).

Goal: apps/web works end to end against our backend and looks like Flippin.

1. Point it at the backend via env. Fix the 8 bugs in PRD section 12 (re-find them; line numbers moved after Steps 1–2)
   and the SERVER_URL lint error. Add a Vitest test for each bug.
2. Apply the tokens preset. Redesign, following section 4.4 exactly: home, restaurant page, item sheet, cart, checkout,
   tracking, sign-in, profile, order history, empty/error/skeleton states. Remove the Quiet Orbit landing art,
   Cormorant Garamond and every old image. PrimeReact components get a Flippin pass-through theme so they match.
3. Language picker shows only English and العربية. Check every screen in RTL: mirrored layout and direction icons,
   numbers and phone numbers kept LTR, Arabic font and line height applied.
4. Prices VAT-inclusive everywhere; UAE address form (area, building/villa, flat, floor, landmark, pin, optional Makani); +971 phone.
5. Playwright test: browse → add item with add-ons → checkout with Stripe test card → track, in English and Arabic.
6. Lighthouse mobile on home and restaurant page ≥ 80 performance, ≥ 95 accessibility; zero layout shift from images (set sizes).

Take screenshots of every redesigned screen in light, dark, LTR and RTL at 390 px and 1440 px into docs/flippin/screens/web/.
Review them against the banned list in CLAUDE.md and fix anything that matches it before you finish.
```

**Gate:** Playwright passes against the Vercel preview; you review the screenshots.

---

### Step 8: store and rider apps

```
Read CLAUDE.md, docs/flippin/DESIGN.md and docs/flippin/REVIEW_AND_PLAN.md section 4.4 (Store and rider).

Goal: apps/store and apps/rider on Expo SDK 54, connected to our backend, redesigned for one-handed use.

1. Upgrade apps/rider to Expo SDK 54 (store is already on 54). Fix breakages; run npx expo-doctor until clean.
2. Apply the NativeWind preset and brand assets. Redesign per section 4.4: full-screen new-order alert with repeating
   sound + vibration until action, prep-time chips, swipe-to-confirm for picked up / delivered, online switch,
   cash-to-collect shown large, call-customer button, earnings screen. Skeletons and real empty states.
3. Push notifications through expo-notifications + our Firebase project (config from EAS file secrets).
4. Background location only while online and on a delivery, every 10 s; stop when offline.
5. EAS profile `preview` builds an APK for each app. Update the rebranded Play background-location document.

Report how to install the APKs and a 10-step manual test script for me to run on two phones.
```

**Gate:** you place an order on web; the store phone rings; accept; rider phone gets it; delivered; web tracking updates within 2 s.

---

### Step 9: customer app

```
Read CLAUDE.md, docs/flippin/DESIGN.md and docs/flippin/REVIEW_AND_PLAN.md section 4.4 (Customer).

Goal: apps/customer matches the web experience on Android and iOS.

1. Upgrade to Expo SDK 54. Replace colour values in src/utils/themeColors.js with the generated theme.js from packages/ui-tokens.
2. Redesign the same screens as web (Step 7) with native patterns: bottom sheets for item and address, haptics on
   add-to-cart and status changes, Apple Pay first on iOS, Google Pay on Android (Stripe test).
3. Remove Amplitude and Microsoft Clarity (replace with PostHog if analytics is needed). Remove unused dependencies.
4. English + Arabic only in the picker; full RTL check (I18nManager + restart handled cleanly).
5. EAS preview APK and an iOS build if the Apple account exists.

Screenshots of every screen (light/dark, LTR/RTL) into docs/flippin/screens/customer/, checked against the banned list.
```

**Gate:** order + push notification work on a real phone.

---

### Step 10: POS, KDS, QR menu, pickup screen

```
Read CLAUDE.md, docs/flippin/DESIGN.md, docs/flippin/PRD.md sections 5.2–5.4 and 5.10 (pickup),
and docs/flippin/REVIEW_AND_PLAN.md sections 2.1 (C9), 2.2, 4.4 (QR, POS, KDS, Pickup) and 7.

Goal: new apps/pos (Next 16, PWA) with /pos, /kds, /t/[token], /pickup.

1. Device login as restaurant, then staff PIN pad (lockout, idle lock). Role decides what is enabled.
2. /pos: floor view, order ticket, menu grid, modifiers, notes, courses (hold/fire), send to kitchen, discounts with
   manager PIN above limit, split by item or equally, merge/move tables, payments (cash with quick amounts and change,
   card, split tender), receipt + kitchen ticket via an 80 mm print stylesheet and PDF. Tax invoice layout: "Tax Invoice",
   TRN, gapless number, date, VAT breakdown, bilingual. Void = credit note. Shift open/close with cash count and Z-report.
   Put printing behind a PrinterAdapter interface (BrowserPrint now; EpsonEpos later).
3. /kds: dark-only, section 4.4 KDS spec: age colours, all-day counts, item strike, bump, recall, stations, sound, keyboard/bump bar.
4. /t/[token]: QR guest menu, signed token, optional waiter-accept for first order, add more, call waiter, request bill,
   pay by card (Stripe test) or at counter. Loads in < 2 s on throttled 4G.
5. /pickup: two bilingual columns, huge numbers, chime + blink on Ready, auto-hide after pickup.
6. Admin: tables and floor editor + printable QR sheet (A4, one per table, brand styled).
7. Playwright: dine-in flow and QR flow end to end, including a printed receipt snapshot.

Test layouts at 1280×800 (10-inch tablet landscape) and 1024×768 (iPad), touch targets ≥ 48 px.
```

**Gate:** dine-in and QR flows pass on a real tablet; the receipt shows TRN and VAT.

---

### Step 11: admin, finance and VAT

```
Read CLAUDE.md, docs/flippin/DESIGN.md, docs/flippin/PRD.md sections 5.7, 5.10 (finance) and 5.11,
docs/flippin/REVIEW_AND_PLAN.md section 4.4 (Admin).

Goal: apps/admin on real data with a Flippin look, plus demo-scope finance.

1. Flippin PrimeReact pass-through theme from the tokens. New dashboard: KPI row with sparklines, sales today vs
   same day last week, orders by channel, peak hours, best sellers.
2. One DataTable wrapper everywhere: search, chip filters, column picker, CSV export, row → side panel.
3. Staff with roles and PINs; restaurant settings: tax lines, VAT inclusive/exclusive, TRN, tourism_licensed (service
   charge only if true), currency AED.
4. Finance (demo scope): daily cash-up with variance and reason; VAT report per quarter (output VAT from invoices minus
   credit notes; CSV/Excel export for the accountant).
5. "Reset demo" button (super admin only) that restores the seed.
6. Test: admin and finance totals equal the seeded order totals to the fils.
```

**Gate:** totals match seeded data exactly.

---

### Step 12: security pass, polish and release

```
Read CLAUDE.md and docs/flippin/REVIEW_AND_PLAN.md sections 7 and 4.

Goal: ship-ready demo.

1. Security review of the whole diff since the start: run through every item in section 7, write docs/flippin/SECURITY.md
   with status per item, and fix anything open. Run gitleaks on the full tree and npm audit on every app.
2. Headers (CSP, HSTS, frame options) on all Next apps. Sentry on every app and the server with our DSNs from env.
3. Visual QA: open every screen in every app, compare with DESIGN.md and the banned list, fix inconsistencies
   (spacing, colours, icon set, copy tone). Replace any leftover old mockups/screenshots.
4. Copy pass in English and Arabic: short, specific, no marketing fluff; have the Arabic reviewed by a native speaker (list the strings for me).
5. Production deploys: Vercel (web, admin, pos) on the real domain, Railway, APKs, TestFlight if available.
6. Demo kit page (apps/web/app/demo or a small static page): every link, APK downloads, TestFlight steps, the
   demo logins from demo-accounts.md, and a 3-minute scripted walkthrough.
7. Make a fresh clean-history export for the buyer (scripts/export-clean.sh: squashed single commit, no secrets, LICENSE files kept).
```

**Gate:** a person who has never seen it tries every role from the demo kit in under 15 minutes without help.

---

### After the first buyer: growth features

Run these as separate steps in the same style: loyalty, Flippin Plus subscriptions, inventory and recipes, suppliers and P&L, owner app, Ramadan mode, Epson ePOS printing, PINT AE export, WhatsApp updates, and aggregator integrations.

---

## 9. Demo script (3 minutes, what the buyer sees)

1. On the phone, the customer orders from "Marina Grill" with Apple Pay (test). The price shown includes VAT.
2. The store tablet rings. Accept, 15 minutes. The KDS ticket appears.
3. The kitchen bumps it. The pickup TV shows #047 Ready with a chime.
4. The rider phone gets the job, swipes Picked up, and the customer's map moves.
5. At the same time a guest scans the QR on Table 12, orders two coffees, and they land on the KDS tagged "T12 · QR".
6. The waiter adds a dessert on the POS and splits the bill in two. The receipt prints as a bilingual tax invoice with TRN.
7. The admin dashboard shows today's sales updating, and the VAT report exports to CSV.
8. Switch the whole customer app to Arabic: full right-to-left layout.

---

## Sources

- [Deloitte: UAE e-invoicing ASP appointment deadline extended, go-live stays 1 Jan 2027](https://www.deloitte.com/middle-east/en/services/tax/perspectives/uae-e-invoicing-asp-appointment-deadline-extended-but-go-live-remains-01012027.html)
- [Hawksford: UAE e-invoicing timeline and penalties](https://www.hawksford.com/insights-and-guides/uae-e-invoicing)
- [Fiscal Solutions: Ministerial Decisions 243 and 244 of 2025](https://www.fiscal-requirements.com/news/5748-uae-defines-e-invoicing-scope-and-implementation-timeline-through-two-ministerial-decisions)
- [Khaleej Times: fast-food chains come under service charge ban](https://www.khaleejtimes.com/uae/fast-food-chains-come-under-service-charge-ban)
- [Gulf News: restaurants taking service charges will be fined](https://gulfnews.com/uae/restaurants-in-uae-taking-service-charges-will-be-slapped-with-heavy-fines-1.580651)
- [The National: Abu Dhabi diners told to report illegal service charges](https://www.thenationalnews.com/uae/diners-in-abu-dhabi-told-to-report-illegal-restaurant-service-charges-1.561793)
- [Supabase docs: free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

Stated from general knowledge, so confirm before relying on them: the VAT-inclusive price display rule, Google Play's 12-tester rule for new personal accounts, TestFlight review requirements, UAE SMS sender-ID registration, and PDPL obligations. As the PRD says, confirm all tax points with a UAE tax adviser.
