# Flippin — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | Flippin — multi-category local delivery marketplace |
| **Version** | 1.0 |
| **Date** | 2026-09-29 |
| **Owner** | prropapanda@gmail.com |
| **Status** | Approved for planning |
| **Launch market** | Kingdom of Saudi Arabia (KSA) |
| **Companion docs** | [02-FEATURES.md](02-FEATURES.md) · [03-FLOWS.md](03-FLOWS.md) · [04-PLAN.md](04-PLAN.md) |

---

## 1. Summary

Flippin is a Saudi-first delivery marketplace. **Restaurants are the hero category**; the same engine also serves grocery, pharmacy, flowers, and general shops. Customers order through a mobile app or website, vendors manage orders in a store app, riders deliver through a rider app, and the Flippin team runs everything from an admin dashboard.

Flippin is built by forking the open-source Enatega Multivendor frontends (MIT), rebranding **every** surface to Flippin, and building Flippin's **own backend** (`flippin-api`) — the forked repo ships no backend and depends on Enatega's paid hosted servers. The whole stack runs on free tiers; only unavoidable third-party costs remain (section 12).

## 2. Problem & opportunity

- KSA food delivery is large and dominated by a few apps that charge restaurants high commissions (commonly 20–30%). Small and mid-size restaurants want a cheaper, fairer channel.
- Customers want one app for dinner *and* groceries/pharmacy, in Arabic, paying with mada / Apple Pay / STC Pay or cash.
- A solo founder can compete on **commission, local focus and service quality**, not on scale — if infrastructure cost is near zero.

## 3. Goals & non-goals

### Goals (first 12 months)
1. Launch in **one Saudi city** (recommended: the founder's own city) with restaurants first.
2. Reach **50 active restaurants**, **10 active non-food stores**, **30 active riders**, **1,000 monthly ordering customers** by month 6 after launch.
3. Keep monthly infrastructure spend at **SAR 0** (excluding per-transaction and per-SMS fees) until 1,000 orders/day.
4. Order success rate (placed → delivered) **≥ 95%**; median delivery time **≤ 40 min**.

### Non-goals (v1)
- Multi-country launch (architecture supports it; launch is KSA only).
- Ride-hailing, parcel courier, or B2B wholesale.
- Building own payment processing — a licensed gateway is used.
- Native (Swift/Kotlin) rewrites — the Expo/React Native apps are kept.
- Dark stores / own inventory (Flippin is a marketplace, not a retailer).

## 4. Users & personas

| Persona | Who | Primary needs |
|---|---|---|
| **Customer — "Noura"** | 24, Riyadh, orders dinner 3×/week, groceries weekly | Fast discovery in Arabic, trusted ETAs, mada/Apple Pay, live tracking, easy reorder |
| **Customer — "Ahmed"** | 38, family, orders large meals and pharmacy items | Scheduled orders, cash on delivery, clear VAT invoice, support that answers |
| **Restaurant owner — "Abu Faisal"** | Runs 2 shawarma branches | Low commission, simple tablet/phone order screen, busy mode, weekly payouts |
| **Store owner — "Maha"** | Grocery / pharmacy / flower shop | Large catalog with stock toggles, substitutions, variants (size/weight) |
| **Rider — "Omar"** | Licensed freelance/company rider with motorbike or car | Clear jobs, fair earnings, navigation, instant earnings view, chat with customer |
| **Vendor (multi-store owner)** | Owns several restaurants/stores | One login, per-store reporting |
| **Flippin admin / ops** | Founder + later ops staff | Dispatch, zones, commissions, refunds, support, fraud control, reports |

## 5. Scope: applications

| App (new name) | Old folder | Tech | Users |
|---|---|---|---|
| `flippin-app` | `enatega-multivendor-app` | Expo 53 / React Native 0.79 | Customers (iOS/Android) |
| `flippin-web` | `enatega-multivendor-web` | Next.js 16 / React 19 | Customers (web, PWA) + partner sign-up pages |
| `flippin-store` | `enatega-multivendor-store` | Expo 54 / RN 0.81 | Restaurant/store staff |
| `flippin-rider` | `enatega-multivendor-rider` | Expo 53 / RN 0.79 | Riders |
| `flippin-admin` | `enatega-multivendor-admin` | Next.js 14 | Super admin, vendors, store admins |
| `flippin-singlevendor-admin` | `enatega-singlevendor-admin` | Next.js 14 | White-label single-store clients |
| **`flippin-api`** *(new)* | — | Node 22 + Apollo Server 4 + MongoDB + Redis | Backend for all apps |

**Vendor modes are kept**: `SINGLE`, `MULTI`, `TOGGLE` (see `VENDOR_MODE_CONFIGURATION.md`). Flippin's own marketplace runs in `MULTI`; `SINGLE`/`TOGGLE` builds let Flippin sell white-label single-restaurant apps as a second revenue line. The single-vendor backend is the **same `flippin-api`** with a `tenant` scope, not a second server.

Full feature list per app: [02-FEATURES.md](02-FEATURES.md). All flows: [03-FLOWS.md](03-FLOWS.md).

## 6. Core product requirements

### 6.1 Customer (app + web)
- Arabic-first (RTL) with English; language switch anytime.
- Location-based discovery: current GPS or saved address → zone → available vendors.
- Home with category tabs: **Restaurants (default)**, Grocery, Pharmacy, Shops, plus banners, cuisines, "near you", "top rated", "fast delivery", offers.
- Search across vendors and items (Arabic + English, typo-tolerant).
- Vendor page: menu categories, item details, variations, add-ons, required/optional options, availability, ratings, delivery fee/time, min order, open hours.
- Cart (one vendor per cart), notes, cutlery toggle, tip rider, apply voucher, delivery or pickup, ASAP or scheduled.
- Checkout with **mada, Visa/Mastercard, Apple Pay, STC Pay (via Moyasar)**, **Flippin Wallet**, **cash on delivery**.
- Live tracking with rider on map, status timeline, chat with rider, call masking (P2).
- Ratings & reviews for vendor and rider; reorder; favourites; order history; ZATCA-compliant e-receipt.
- Account: phone or email login, Google & Apple sign-in, addresses, wallet, vouchers, referral, Flippin Points (loyalty), Flippin Plus membership (free delivery), support tickets, delete account.

### 6.2 Vendor / store
- Receive orders with loud repeating alert; accept with prep time / reject with reason.
- Mark ready; see assigned rider; handshake (order hand-over code) with rider.
- Menu/catalog management, item availability toggle, **busy mode** (adds prep time) and **pause store**.
- Opening hours, holidays, delivery radius/zone, minimum order.
- Earnings, transaction history, withdrawal requests to bank (IBAN).
- Ratings view and reply (P1). Coupons (store-funded).

### 6.3 Rider
- Online/offline toggle, work schedule, vehicle type, zone.
- New-job offers with pickup/drop distance and earnings, accept within timeout.
- Navigation to vendor and customer (hand off to Google Maps/Waze), status updates (picked, delivered), proof of delivery (photo/OTP for high-value, P1).
- Cash-on-delivery collection tracking and cash deposit balance.
- Earnings, wallet, withdrawal to bank, chat with customer, help.

### 6.4 Admin
- Dashboard: live orders, GMV, active riders, alerts.
- **Dispatch** board: manual/auto rider assignment, reassign, cancel, refund.
- Zones (polygons), delivery-fee rules per zone/distance, surge (P2).
- Users, vendors, stores, riders, staff (RBAC), audit logs.
- Catalog governance: cuisines, shop types (categories), banners, notifications (push campaigns), coupons, commission rates, tipping presets.
- Finance: earnings, transaction history, withdrawal approvals, COD reconciliation, invoices, VAT reports.
- Configuration: currency (SAR), payment gateway keys, maps keys, email, push, Sentry, analytics, app versions (force update), verification rules.
- Customer support: tickets, order-level chat history, refunds/credits.

### 6.5 Backend (`flippin-api`)
- GraphQL API that implements **every operation the six apps already call** (~350: 167 queries, 167 mutations, 16 subscriptions), so the frontends need minimal change. A CI test validates all client operations against the server schema.
- Real-time via GraphQL subscriptions (`graphql-ws`) backed by Redis pub/sub: order status, rider location, new zone orders, dispatcher, chat, store hand-shake.
- Auth: JWT access + refresh tokens, role-based (customer, rider, store, vendor, admin, staff), device sessions, rate limiting.
- Jobs/queues (BullMQ on Redis): rider auto-dispatch, order timeouts, scheduled orders, push notifications, payouts, email.
- Payments: Moyasar integration with signed webhooks, idempotent order-payment linking, refunds.
- Media upload to Cloudflare R2 via pre-signed URLs; image resizing.
- Audit log for every admin write action.

## 7. Business model

| Revenue | Default | Configurable in admin |
|---|---|---|
| Commission on restaurant orders | **12%** (launch offer, undercuts market) | per vendor/store |
| Commission on non-food stores | 8% | per store |
| Customer delivery fee | distance-based per zone (e.g. SAR 5 base + SAR 1/km) | per zone |
| Small-order fee | SAR 3 under min basket | per zone |
| Service fee | 0% at launch | global |
| Flippin Plus membership | SAR 19/month free delivery over SAR 40 | global |
| White-label single-vendor apps | setup + monthly fee | outside platform |
| Sponsored listings / banners | P2 | per campaign |

Rider pay = base per order + per-km + 100% of tips. Settlements weekly.

## 8. KSA localisation & compliance

> This is product guidance, not legal advice. Confirm with a Saudi lawyer/accountant before launch.

| Area | Requirement for Flippin |
|---|---|
| Language | Arabic default, full RTL (already supported by the codebase); English second. All legal text in Arabic. |
| Currency & tax | SAR, **VAT 15%**, prices shown VAT-inclusive; VAT breakdown on receipts. |
| **ZATCA e-invoicing** | Every order produces a simplified tax invoice with ZATCA **QR code (TLV: seller name, VAT no., timestamp, total, VAT)** — Phase 1. Phase 2 (Fatoora API integration) planned once Flippin's revenue wave is notified. Flippin issues invoices for its own fees; vendors for food (marketplace model — confirm with accountant). |
| **PDPL** (Personal Data Protection Law, SDAIA) | Privacy policy in Arabic, consent for marketing, data-subject rights (access/delete/export), breach process, minimise data, record of processing. Account deletion already exists in app — must hard-delete/anonymise server-side. |
| Delivery regulation (TGA) | Delivery app platforms and riders are regulated by the Transport General Authority. Check current rules on platform licensing, rider nationality/freelance permits, vehicle requirements before onboarding riders. |
| Business | Commercial Registration (CR), VAT registration, Saudi bank account for settlements, Maroof/Saudi Business Center listing. |
| Payments | Use a SAMA-licensed/authorised gateway (Moyasar, Tap, HyperPay). **Stripe does not onboard KSA-registered merchants and PayPal is little used, so both are removed from KSA builds** (kept behind feature flags for other markets). |
| Food safety | Vendor onboarding collects municipality licence (Balady) number; pharmacy requires SFDA/MOH licence; OTC only, no prescription drugs in v1. |
| App stores | Apple requires Sign in with Apple when Google login is offered; account deletion in-app (exists). |

## 9. Brand system

| Token | Value | Use |
|---|---|---|
| `brand-primary` — Neon Green | `#00FD54` | Primary buttons, highlights, map route, logo dot |
| `brand-ink` — Midnight Forest | `#001B0A` | Dark backgrounds, text on green, logo tile |
| `brand-surface` — Frosted White | `#FFFFFF` *(confirm exact hex from brand file)* | Light backgrounds, cards |
| `brand-link` (derived) | `#007A29` | Green **text** on light backgrounds (≈5.5:1 contrast, passes WCAG AA) |
| `brand-primary-pressed` (derived) | `#00D447` | Pressed state |
| `brand-primary-tint` (derived) | `#E6FFEE` | Selected chips, success backgrounds |
| Error / warning / info | keep existing semantic tokens | — |

**Accessibility rules**
- Neon Green on white is ~1.4:1 — **never use it for text or thin icons on light surfaces**. Use it as a fill with Midnight Forest text, or on dark backgrounds (~13:1).
- Minimum touch target 44×44 pt; dynamic type supported.

**Typography**
- Latin: **Satoshi** (Fontshare, free for commercial use) — Light/Regular/Medium/Bold/Black.
- Arabic: **IBM Plex Sans Arabic** (Google Fonts, OFL) — Satoshi has no Arabic glyphs. Fallback: system.
- Numbers: Western Arabic numerals (0–9) by default, setting to switch to Eastern Arabic (٠–٩).

**Logo**: "Flippin" wordmark with the green dot as the "i" tittle, plus the icon tile (Midnight Forest square with green mark). Assets needed (founder to supply): SVG logo (light/dark), app icon 1024×1024, adaptive Android icon (foreground/background), splash (light/dark), favicon set, notification icon (monochrome), OG image 1200×630, store screenshots.

**Voice**: short, warm, confident, local ("Hungry? Flippin fast." / "جوعان؟ فليبن يوصلك").

## 10. Rebrand requirements ("Flippin everywhere")

The codebase contains **~14,100 occurrences of "enatega" in 319 files**. Rebrand means:
1. Folders & package names: `enatega-*` → `flippin-*`; npm `name` fields.
2. App identity: display names, `app.config.js`/`app.json` slugs, schemes (`flippin://`), bundle IDs **`pk.flippin.customer` / `pk.flippin.rider` / `pk.flippin.store`**, EAS project IDs, Expo owner.
3. All URLs: `enatega.com`, `multivendor.enatega.com`, `aws-server-v2.enatega.com`, `backup-server.enatega.com`, Railway and Netlify hosts, `ninjascode.com` → Flippin domains (e.g. `rms.flippin.pk` or `getflippin.com`; `api.`, `admin.`, `app.` subdomains).
4. **Secrets**: Enatega's Firebase configs (`google-services.json`, `GoogleService-Info.plist`, `firebase-messaging-sw.js`, `sw.js`, `serviceWorker.js`) and Sentry DSN are committed in 9 files — replace with Flippin's own projects; move to env vars; add to `.gitignore` where possible.
5. Translations (all locale files, incl. Arabic) and legal pages (terms, privacy).
6. Assets: icons, splash, images in `assets/`, `splash_claud_assets/`, `public/`.
7. Theme tokens → Flippin colors and fonts (section 9); `DESIGN.md`/`PRODUCT.md` rewritten for Flippin.
8. Docs, README, CHANGELOG, audit PDF names.
9. **Keep** `LICENSE` files and original copyright notice (MIT requirement) — add a NOTICE credit "Based on Enatega by Ninjas Code (MIT)".
10. Acceptance: `grep -ri enatega` returns only LICENSE/NOTICE lines.

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | API p95 < 300 ms for reads; home screen interactive < 2.5 s on mid-range Android over 4G; web LCP < 2.5 s. |
| Real-time | Status change visible to other parties < 2 s; rider location update every 5–10 s while on job. |
| Availability | 99.5% monthly target (single free VM); daily DB backups to R2, restore tested monthly. |
| Scalability | Handle 1,000 orders/day on the free VM; documented path to scale (paid VM, Atlas M10). |
| Security | OWASP ASVS L1: bcrypt/argon2 passwords, JWT rotation, rate limiting, input validation, GraphQL depth/cost limits, introspection off in prod, CORS allowlist, secrets only in env, signed payment webhooks, RBAC on every resolver, audit logs. |
| Privacy | PDPL (section 8); PII encrypted at rest where supported; logs scrubbed of PII/tokens. |
| Accessibility | WCAG 2.1 AA on web; screen-reader labels on mobile. |
| Localisation | Arabic/English complete; RTL layouts verified on every screen. |
| Observability | Sentry on all apps + API, structured logs, uptime monitor, alert on payment webhook failures. |
| Quality | CI on every PR: typecheck, lint, unit tests, schema-compat test, build. Cypress (web/admin) smoke tests; Maestro (free) mobile smoke flows. |

## 12. Free-tier tooling & unavoidable costs

| Need | Tool (free) | Notes |
|---|---|---|
| Server | **Oracle Cloud Always Free** (Ampere A1: up to 4 OCPU / 24 GB RAM) | Runs API, MongoDB, Redis, admin, web |
| Deploy/PaaS | **Coolify** (self-hosted, open source) | Git-push deploys, SSL, DB backups |
| Database | MongoDB Community on VM (Atlas M0 free as alternative) | |
| Cache/queues/pubsub | Redis (on VM) + BullMQ | Upstash free as alternative |
| File storage | **Cloudflare R2** (10 GB free, no egress fees) | Menu/item images |
| DNS/CDN/WAF | **Cloudflare** free | |
| Push | Expo Push Service + Firebase Cloud Messaging | Free |
| Email | **Resend** or Brevo free tier | Receipts, OTP, admin |
| Maps | Google Maps Platform within **monthly free usage caps**, behind a `MapProvider` abstraction; fallback MapLibre + OpenStreetMap | Monitor usage |
| Errors | Sentry free (Developer) | |
| Product analytics | **PostHog** free cloud tier (replaces Amplitude) | |
| Uptime | UptimeRobot / Better Stack free | |
| CI | GitHub Actions (free for public; 2,000 min/mo private) | |
| Mobile builds | **EAS Build free plan** (limited builds/month) + local builds | |
| Mobile E2E | Maestro (open source) | |
| Design | Figma free / Penpot | |
| Project mgmt | GitHub Projects | |

**Unavoidable costs (not free anywhere):**
- Apple Developer Program — USD 99/year; Google Play — USD 25 one-time.
- Domain name (~USD 10–40/year; `.sa` requires Saudi registrant).
- Payment gateway fees per transaction (e.g. Moyasar/Tap %, mada cheaper than cards).
- **SMS OTP** — every SMS costs money. Mitigation: default login via **email magic link/OTP + Google + Apple sign-in** (free); phone OTP only at checkout for COD/fraud checks via a Saudi SMS provider (Unifonic/Taqnyat/Authentica) or Firebase Phone Auth.
- Saudi CR / VAT registration / licences.
- (Later) paid server when orders exceed the free VM.

> Free-tier limits change; check each provider's current page before relying on a number.

## 13. Codebase audit findings (inputs to the plan)

| # | Finding | Impact | Action |
|---|---|---|---|
| A1 | No backend in repo; all apps call Enatega-hosted GraphQL/WS/REST | Product can't run independently | Build `flippin-api` (Phase 1) |
| A2 | Enatega Firebase API keys + Sentry DSN committed (9 files) | Pushes/errors would go to Enatega's projects | Replace with Flippin projects, move to env |
| A3 | ~14.1k "enatega" references in 319 files | Brand leakage | Scripted rename + manual review (Phase 0) |
| A4 | Stripe + PayPal payment screens | Not usable for KSA merchants | Replace with Moyasar; keep COD |
| A5 | Admin config has Twilio, Nodemailer, Cloudinary, Amplitude, PayPal, Stripe | Paid/mismatched vendors | Map to free stack (R2, Resend, PostHog, Moyasar) |
| A6 | Different Expo SDKs (53 vs 54) and Next versions (14 vs 16) | Maintenance burden | Align to one Expo SDK and Next version in Phase 5 |
| A7 | Existing audit reports (`*_SECURITY_PERFORMANCE_CLEANUP_AUDIT.pdf`, `AUDIT-REMEDIATION-*.md`) | Known issues already documented | Review and carry open items into backlog |
| A8 | Single-vendor + multivendor endpoints separated | Two backends to host | One API with `tenant` scope |

## 14. Success metrics

| Metric | Target (month 6) |
|---|---|
| Monthly ordering customers | 1,000 |
| Orders / day | 150 |
| Order completion rate | ≥ 95% |
| Vendor acceptance time (median) | ≤ 2 min |
| Delivery time (median, restaurant) | ≤ 40 min |
| Customer repeat rate (30-day) | ≥ 35% |
| App rating | ≥ 4.5 |
| Crash-free sessions | ≥ 99.5% |
| Infra cost | SAR 0/month (excl. per-use fees) |

North-star metric: **weekly delivered orders**.

## 15. Release phases (summary — detail in 04-PLAN.md)

| Phase | Outcome |
|---|---|
| 0. Foundation & rebrand | Repo renamed to Flippin, new brand theme, secrets replaced, CI green |
| 1. `flippin-api` core | Auth, users, zones, vendors/stores, catalog, cart pricing, orders, subscriptions |
| 2. Restaurant MVP (closed beta) | End-to-end restaurant order: customer app/web → store app → rider app → admin dispatch; COD + Moyasar; ZATCA QR |
| 3. Public launch (one city) | App Store/Play release, 50 restaurants onboarded, monitoring, support |
| 4. Multi-category | Grocery/pharmacy/shops: large catalogs, stock, substitutions, weight items |
| 5. Growth | Loyalty points, Flippin Plus, referrals, campaigns, scheduled/group orders, analytics |
| 6. Scale & hardening | Performance, Phase-2 ZATCA, SDK alignment, paid infra when needed |

## 16. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Rebuilding ~350 API operations is large for one person | High | Build by flow (restaurant MVP first); schema-compat CI test tells exactly what's left |
| Free VM capacity / Oracle reclaiming idle instances | Medium | Keep instance active, daily off-site backups, documented migration to paid VM |
| Regulatory (TGA rider rules, licensing) | Medium | Verify before rider onboarding; partner with a licensed delivery company if required |
| SMS costs | Medium | Email/social login default; phone OTP only where needed |
| Rider supply at launch | High | Start in one district; guaranteed hourly minimum for first riders; vendor own-delivery option |
| Google Maps overage | Low–Med | Usage caps + alerts, cache geocodes, MapLibre fallback |

## 17. Open questions

1. Final domain (`rms.flippin.pk` vs `getflippin.com`) and launch city.
2. Exact Frosted White hex from brand file.
3. Payment gateway final pick (Moyasar recommended; Tap as alternative) after KYC.
4. Rider model: freelance riders vs partner delivery company (depends on TGA rules).
5. Whether vendors can use their own riders (vendor-delivery mode) at launch — recommended yes, P1.
