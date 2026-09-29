# Flippin — Features Document

Companion to [01-PRD.md](01-PRD.md). Flows referenced as **F-xx** are in [03-FLOWS.md](03-FLOWS.md).

## Legend

**Priority**
- **P0** — required for restaurant MVP / closed beta (Phase 2)
- **P1** — required for public launch & multi-category (Phases 3–4)
- **P2** — growth / scale (Phases 5–6)

**Status** (as of the forked codebase, 2026-09-29)
- **UI** — screen/logic already exists in the frontend; needs `flippin-api` support + rebrand
- **UI\*** — exists but must change (e.g. payment provider, KSA rules)
- **NEW** — not in codebase; must be built (frontend and/or backend)
- **API** — backend-only capability

Every UI feature also depends on the backend implementing its GraphQL operations.

---

## 1. Platform-wide (all apps)

| ID | Feature | Pri | Status | Notes |
|---|---|---|---|---|
| G-01 | Flippin brand: name, logo, colours, Satoshi + IBM Plex Sans Arabic | P0 | UI\* | PRD §9–10 |
| G-02 | Arabic (RTL) default + English | P0 | UI | Verify every screen in RTL |
| G-03 | Light / dark theme | P1 | UI | Web + customer app |
| G-04 | Vendor mode SINGLE / MULTI / TOGGLE | P1 | UI | One API, tenant scope |
| G-05 | Force-update / app version check | P0 | UI | Admin → App versions |
| G-06 | Push notifications (Expo + FCM) | P0 | UI\* | Flippin Firebase project |
| G-07 | Crash & error reporting (Sentry) | P0 | UI\* | New Flippin DSN |
| G-08 | Product analytics (PostHog) | P1 | NEW | Replace Amplitude |
| G-09 | Offline / poor-network states, retry | P1 | UI | Audit per screen |
| G-10 | Feature flags (per market/provider) | P1 | NEW | Simple config collection in API |
| G-11 | Deep links `flippin://` + universal links | P1 | UI\* | Order, vendor, voucher links |
| G-12 | Accessibility (labels, contrast, dynamic type) | P1 | NEW | Brand contrast rules |

## 2. Customer mobile app (`flippin-app`) & website (`flippin-web`)

### 2.1 Onboarding & account
| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| C-01 | Splash, language pick (AR/EN), location permission | P0 | UI | F-01 |
| C-02 | Sign up / login with email + OTP (free) | P0 | UI | F-02 |
| C-03 | Google sign-in | P0 | UI | F-02 |
| C-04 | Apple sign-in (required by App Store if Google offered) | P0 | UI\* | F-02 |
| C-05 | Phone number + SMS OTP (verify phone before first COD order) | P0 | UI | F-02 |
| C-06 | Forgot / reset password | P0 | UI | |
| C-07 | Guest browsing (login required only at checkout) | P1 | NEW | F-01 |
| C-08 | Profile edit (name, email, phone) | P0 | UI | |
| C-09 | Saved addresses with map pin, label (home/work), building/floor/notes | P0 | UI | F-03 |
| C-10 | Saudi National Address short code field (optional) | P2 | NEW | |
| C-11 | Settings: language, notifications, theme, number style | P1 | UI | |
| C-12 | Delete account (in-app, PDPL) | P0 | UI | F-17 |
| C-13 | Download my data (PDPL) | P2 | NEW | F-17 |

### 2.2 Discovery
| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| C-20 | Location → zone detection; "not serviceable yet" + waitlist | P0 | UI / NEW (waitlist) | F-03 |
| C-21 | Home: category tabs (Restaurants default, Grocery, Pharmacy, Shops) | P0 | UI (shop types) | |
| C-22 | Banners / promotions carousel | P0 | UI | |
| C-23 | Cuisine chips (Burgers, Shawarma, Mandi, Coffee, Desserts…) | P0 | UI | |
| C-24 | Collections: near you, top rated, fastest, new, offers | P0 | UI | |
| C-25 | Map view of vendors | P1 | UI | |
| C-26 | Search vendors + items (AR/EN, typo tolerant) | P0 | UI + API | MongoDB Atlas Search or text index |
| C-27 | Filters & sort (rating, delivery time, fee, offers, open now, price) | P1 | UI | |
| C-28 | Recently viewed / "order again" rail | P1 | NEW | |
| C-29 | Favourites (vendors) | P1 | UI | |
| C-30 | Deals page | P1 | UI (web) | |

### 2.3 Vendor & item
| ID | Feature | Pri | Status |
|---|---|---|---|
| C-40 | Vendor page: header, rating, ETA, fee, min order, open/closed, hours | P0 | UI |
| C-41 | Menu categories with sticky nav + in-menu search | P0 | UI |
| C-42 | Item details: photo, description, calories (P2), variations, add-ons, required options, special instructions | P0 | UI |
| C-43 | Out-of-stock / unavailable items greyed | P0 | UI |
| C-44 | Vendor info: address, map, hours, licences | P1 | UI |
| C-45 | Reviews list | P1 | UI |
| C-46 | Popular items / "most ordered" badge | P2 | NEW |
| C-47 | Grocery-style catalog: sub-categories, grid, quantity stepper, weight-based items (per kg), unit price | P1 | NEW |
| C-48 | Pharmacy: OTC only, age/consent notice for restricted items | P1 | NEW |

### 2.4 Cart & checkout
| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| C-60 | Cart (single vendor), edit qty/options, clear on vendor switch with warning | P0 | UI | F-04 |
| C-61 | Separate carts per vendor mode (existing isolation) | P1 | UI | |
| C-62 | Delivery / pickup toggle | P0 | UI | F-04 |
| C-63 | ASAP / scheduled order (date + time slot within vendor hours) | P1 | UI | F-05 |
| C-64 | Order notes + cutlery toggle | P0 | UI\* (cutlery NEW) | |
| C-65 | Tip rider (presets from admin + custom) | P1 | UI | |
| C-66 | Voucher / coupon code | P0 | UI | |
| C-67 | Price breakdown: subtotal, delivery fee, small-order fee, service fee, discount, tip, **VAT 15%**, total | P0 | UI\* | |
| C-68 | Payment: **mada / Visa / MC / Apple Pay / STC Pay via Moyasar** | P0 | UI\* (replace Stripe/PayPal) | F-06 |
| C-69 | Cash on delivery (limits per user trust level) | P0 | UI | F-06 |
| C-70 | Flippin Wallet balance payment (full or partial) | P1 | UI | F-06 |
| C-71 | Item substitution preference (grocery): replace / call me / refund | P1 | NEW | F-12 |
| C-72 | Group order (shared cart link) | P2 | NEW | |
| C-73 | Minimum order & zone checks server-side | P0 | API | |

### 2.5 Orders & tracking
| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| C-80 | Order confirmation + live status timeline | P0 | UI | F-07 |
| C-81 | Live rider location on map + ETA | P0 | UI | F-09 |
| C-82 | Chat with rider | P0 | UI | F-10 |
| C-83 | Call rider/vendor (masked numbers P2) | P1 | UI / NEW | |
| C-84 | Cancel order (free before vendor accepts; policy after) | P0 | UI | F-11 |
| C-85 | Order history + details | P0 | UI | |
| C-86 | Reorder | P1 | UI | |
| C-87 | Rate & review vendor + rider (1–5 stars, tags, comment) | P0 | UI | F-14 |
| C-88 | E-receipt with **ZATCA QR** (PDF/email) | P0 | NEW | F-15 |
| C-89 | Report a problem on order (missing/wrong item, late) → ticket, refund to wallet | P1 | UI (tickets) / NEW | F-16 |
| C-90 | Pickup order: vendor address, directions, "I'm here" | P1 | UI / NEW | |

### 2.6 Loyalty, growth & support
| ID | Feature | Pri | Status |
|---|---|---|---|
| C-100 | Vouchers list (my coupons) | P1 | UI (web) |
| C-101 | Referral: invite code, both get credit after first delivered order | P1 | UI (web) |
| C-102 | **Flippin Plus** membership (free delivery over threshold, monthly) | P2 | UI (web "membership") |
| C-103 | **Flippin Points** loyalty (earn per SAR, redeem to wallet) | P2 | NEW |
| C-104 | Wallet: balance, history, top-up (P2), refunds credited | P1 | UI (web) |
| C-105 | Help centre (FAQ), support tickets, chat with support | P0 | UI |
| C-106 | Push/email marketing opt-in (PDPL consent) | P1 | NEW |
| C-107 | Share vendor / item | P2 | NEW |
| C-108 | Partner sign-up pages (restaurant, store, rider) on web | P1 | UI (web `/rider`, `/restaurantInfo`) |

## 3. Store / vendor app (`flippin-store`)

| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| S-01 | Login (store credentials issued by admin) | P0 | UI | F-18 |
| S-02 | Online/offline store toggle + **busy mode** (+10/20/30 min) + pause until | P0 | UI\* (busy NEW) | |
| S-03 | New order alert: loud repeating sound, push, full-screen card | P0 | UI | F-08 |
| S-04 | Accept with prep time / reject with reason | P0 | UI | F-08 |
| S-05 | Auto-reject after timeout (admin config, default 3 min) + customer notified | P0 | API | F-08 |
| S-06 | Orders tabs: new, processing, ready, delivered | P0 | UI | |
| S-07 | Mark ready; see assigned rider & ETA | P0 | UI\* | |
| S-08 | Hand-over code / handshake with rider | P0 | UI (StoreOrderHandshake) | F-09 |
| S-09 | Print order ticket (Bluetooth/thermal via share/print) | P1 | NEW | |
| S-10 | Item availability quick toggle (sold out today) | P0 | NEW (app) / UI (admin) | |
| S-11 | Opening hours / work schedule / holidays | P0 | UI | |
| S-12 | Earnings, order-level earnings detail | P0 | UI | |
| S-13 | Wallet & withdrawal request to IBAN | P1 | UI | F-19 |
| S-14 | Bank management (IBAN, bank name) | P1 | UI | |
| S-15 | Order substitution handling (grocery: propose replacement to customer) | P1 | NEW | F-12 |
| S-16 | Reply to reviews | P2 | NEW | |
| S-17 | Multi-language (AR/EN) | P0 | UI | |
| S-18 | Own-delivery mode (vendor delivers with own staff) | P1 | NEW | F-09 |

## 4. Rider app (`flippin-rider`)

| ID | Feature | Pri | Status | Flow |
|---|---|---|---|---|
| R-01 | Login (rider account created/approved by admin) | P0 | UI | F-20 |
| R-02 | Rider onboarding docs upload: ID/Iqama, licence, vehicle, freelance permit | P1 | NEW | F-20 |
| R-03 | Online/offline, work schedule | P0 | UI | |
| R-04 | Vehicle type (bike, motorbike, car) | P0 | UI | |
| R-05 | Background location while online (Play background-location declaration exists) | P0 | UI | F-09 |
| R-06 | New job offer: pickup, drop, distance, earnings, countdown; accept/decline | P0 | UI (zone orders) | F-09 |
| R-07 | Order detail: items, notes, customer contact, COD amount | P0 | UI | |
| R-08 | Navigate (open Google Maps/Waze) | P0 | UI | |
| R-09 | Status: arrived at vendor → picked (handshake code) → delivered | P0 | UI | F-09 |
| R-10 | Proof of delivery: photo / customer OTP for high-value | P1 | NEW | F-09 |
| R-11 | Chat with customer | P0 | UI | F-10 |
| R-12 | Earnings (daily/weekly), per-order detail | P0 | UI | |
| R-13 | Wallet, cash-in-hand (COD) balance, deposit/settle | P0 | UI\* | F-19 |
| R-14 | Withdrawal to IBAN, bank management | P1 | UI | F-19 |
| R-15 | Language, help, profile | P0 | UI | |
| R-16 | Batched orders (2 pickups same vendor) | P2 | NEW | |
| R-17 | Incentives / guaranteed hourly minimum display | P2 | NEW | |
| R-18 | SOS / report incident | P1 | NEW | |

## 5. Admin dashboard (`flippin-admin`)

### 5.1 Super admin
| ID | Feature | Pri | Status |
|---|---|---|---|
| A-01 | Login + OTP/2FA, email verification | P0 | UI |
| A-02 | Home dashboard: live orders, GMV, AOV, active riders/stores, alerts | P0 | UI |
| A-03 | **Dispatch** board: live map, assign/reassign rider, change status, cancel | P0 | UI |
| A-04 | Orders management: search, filter, detail, timeline, refund | P0 | UI\* (refund NEW) |
| A-05 | Zones: draw polygons, activate, per-zone fees | P0 | UI |
| A-06 | Delivery-fee rules (base, per km, min, small-order fee, surge P2) | P0 | UI (delivery-rate) |
| A-07 | Vendors, stores CRUD; store onboarding approval; licences (Balady/SFDA) | P0 | UI\* |
| A-08 | Riders CRUD, approval, documents, zone, suspend | P0 | UI\* |
| A-09 | Users (customers): detail, orders, wallet, block | P0 | UI |
| A-10 | Staff & roles (RBAC permissions) | P1 | UI |
| A-11 | Audit logs | P1 | UI |
| A-12 | Cuisines, shop types (categories) | P0 | UI |
| A-13 | Banners | P0 | UI |
| A-14 | Coupons (platform-funded) | P0 | UI |
| A-15 | Commission rates (per vendor/store) | P0 | UI |
| A-16 | Tipping presets | P1 | UI |
| A-17 | Push notification campaigns (segment: all/zone/inactive) | P1 | UI |
| A-18 | Earnings, transaction history, withdraw requests approve/reject | P0 | UI |
| A-19 | COD reconciliation (rider cash owed) | P0 | NEW |
| A-20 | VAT / ZATCA report export (CSV) | P1 | NEW |
| A-21 | Customer support tickets + order chat view | P0 | UI |
| A-22 | Configuration: currency SAR, VAT %, Moyasar keys, maps key, email (Resend), push, Sentry, PostHog, app versions, verification | P0 | UI\* (swap providers) |
| A-23 | Languages / translations management | P2 | UI |
| A-24 | Reports: sales by zone/vendor/category, rider performance, cohort | P2 | NEW |
| A-25 | Fraud controls: COD limits, blocked devices, voucher abuse | P1 | NEW |
| A-26 | Loyalty & membership settings | P2 | NEW |
| A-27 | Waitlist (unserved areas) view | P2 | NEW |

### 5.2 Vendor & store admin (web)
| ID | Feature | Pri | Status |
|---|---|---|---|
| V-01 | Vendor dashboard across own stores | P0 | UI |
| V-02 | Store profile, location, timings, payment settings | P0 | UI |
| V-03 | Product management: categories, items ("food"), options, add-ons | P0 | UI |
| V-04 | Bulk catalog import (CSV) for grocery | P1 | NEW |
| V-05 | Stock quantity & low-stock alert | P1 | NEW |
| V-06 | Store coupons | P1 | UI |
| V-07 | Orders, ratings | P0 | UI |
| V-08 | Wallet: earnings, transactions, withdrawal requests | P0 | UI |

### 5.3 Single-vendor admin (`flippin-singlevendor-admin`)
| ID | Feature | Pri | Status |
|---|---|---|---|
| SV-01 | Same as store admin for a single tenant brand | P1 | UI |
| SV-02 | Tenant branding (logo/colours) for white-label builds | P2 | NEW |

## 6. Backend capabilities (`flippin-api`)

| ID | Capability | Pri | Notes |
|---|---|---|---|
| B-01 | GraphQL schema covering all ~350 client operations | P0→P1 | Built flow by flow; CI compat test |
| B-02 | Subscriptions over `graphql-ws` + Redis pub/sub (16 subscriptions) | P0 | order, tracking, rider location, zone orders, dispatcher, chat, handshake, assign rider, payment success |
| B-03 | Auth: JWT access/refresh, roles, device sessions, OTP (email/SMS), Google/Apple token verification | P0 | |
| B-04 | RBAC guard on every resolver + tenant scope | P0 | |
| B-05 | Geo: zones (GeoJSON polygons, 2dsphere), distance, vendor radius | P0 | |
| B-06 | Pricing engine (server-authoritative): items, options, fees, coupons, VAT, tips, wallet | P0 | Client prices never trusted |
| B-07 | Order state machine + timeouts (BullMQ) | P0 | F-07 |
| B-08 | Dispatch engine: nearest available rider, offer, timeout, re-offer, admin override | P0 | F-09 |
| B-09 | Payments: Moyasar create/verify, webhook signature, idempotency, refunds, COD | P0 | F-06 |
| B-10 | Wallets & ledger (double-entry: customer, vendor, rider, platform) | P0 | F-19 |
| B-11 | Payouts / withdrawals workflow | P1 | |
| B-12 | Notifications service: push (Expo/FCM), email (Resend), SMS provider adapter | P0 | |
| B-13 | Media: R2 pre-signed upload, image resize | P0 | |
| B-14 | Search index (AR/EN) | P0 | |
| B-15 | ZATCA QR generation + invoice numbering | P0 | F-15 |
| B-16 | Audit log, rate limiting, GraphQL depth/cost limits | P0 | |
| B-17 | Scheduled orders job | P1 | F-05 |
| B-18 | Reports & exports | P2 | |
| B-19 | Data retention & PDPL deletion/export jobs | P1 | F-17 |
| B-20 | Health checks, metrics, backups | P0 | |

## 7. MVP cut (Phase 2 — restaurant closed beta)

All **P0** rows above. In short: Flippin-branded apps; email/Google/Apple/phone auth; zones; restaurant discovery & menu; cart; delivery & pickup; Moyasar + COD; store accept/reject/ready; rider dispatch, tracking, chat; admin dispatch, zones, vendors, riders, commissions, payouts view; ZATCA QR receipt; push notifications; Sentry.

Out of MVP: grocery catalog specifics, scheduled orders, loyalty, membership, group order, reports, masked calls.
