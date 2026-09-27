# 04 — Feature Ticket List (Build Sequence)

Flippin · v1.0 · 27 Sep 2026

How to use this list:
- Work top to bottom. A ticket starts only when everything in **Needs** is merged.
- One ticket = one branch = one PR. The PR title starts with the ticket id (`API-012: PlaceOrder`).
- **Done** means the acceptance criteria pass **on the deployed environment**, not only locally, plus: typecheck, lint, tests, `schema:validate`, and the "no Enatega string" check are green.
- Owner = you (accounts, decisions, phone testing). Claude = code.
- P0 = demo-critical, P1 = competitive, P2 = after first buyer talks.

---

## Phase 0: Accounts and decisions (owner)

| ID | Task | Needs | Done when |
| --- | --- | --- | --- |
| OWN-001 | Create Oracle Cloud account (home region **Frankfurt**), upgrade to PAYG, $1 budget alert, console MFA | — | You can open Compute → Instances; budget alert email arrives on test |
| OWN-002 | Supabase: free a slot, create project `flippin` in **Frankfurt**, save DB password in a password manager | — | Project dashboard opens; region = eu-central-1 |
| OWN-003 | Create accounts: GitHub (have), Vercel (have), Expo, Stripe (test mode), Cloudinary, Resend, Sentry, PostHog, UptimeRobot, Google Cloud (Maps: JS, Places, Routes, Geocoding; billing + $1 alert), 3 new Firebase projects or one project with 4 apps | — | All logins work; **no keys pasted into chat or git** |
| OWN-004 | Brand kit: logo (SVG), primary colour, app icon 1024², splash, pick 1 of 3 design directions (DS-001) | — | Files in `assets/brand/` |
| OWN-005 | Domain `flippin.app` (or alternative) | — | Can add DNS records (`.app` requires HTTPS, fine with Caddy/Vercel) |
| OWN-006 | Decide later, not blocking: Apple Developer ($99) before phase 7 iOS; sell model (source vs hosted) before phase 11 | — | Recorded in PRD §17 |

## Phase 1: Foundation

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| REPO-001 | P0 | Monorepo: move apps to `apps/*` (web, admin, customer, rider, store), **delete** `enatega-singlevendor-admin`, root `index.html`, root `lib/`, empty `package-lock.json`, audit PDFs/notes; pnpm + Turborepo; each app still builds | — | `pnpm -r build` (web/admin) and `expo export` (mobile) succeed in CI |
| REPO-002 | P0 | Secrets purge: delete Firebase files + service-worker keys, `git filter-repo` history rewrite on a new default branch, add `gitleaks` pre-commit + CI | REPO-001 | `gitleaks detect` clean on full history |
| REPO-003 | P0 | CI `ci.yml`: install, typecheck, lint, test, build per changed package (Turbo cache), Enatega-string check (warning until REBRAND-001, then error) | REPO-001 | Green on PR |
| REPO-004 | P0 | Fix known lint errors (`SERVER_URL` unused), sync lockfile, ESLint shared config incl. RTL-class rule for new code | REPO-003 | 0 lint errors |
| REPO-005 | P0 | `CLAUDE.md` with guardrails from doc 03 §14 and doc links | REPO-001 | File exists |
| API-001 | P0 | **Operation extractor**: pluck all `gql` docs from 6 apps → `packages/schema/operations/**` with source path; report counts and duplicates by name with different shapes | REPO-001 | Report lists ~400 ops; duplicates table produced |
| API-002 | P0 | **schema.graphql** inferred + hand-fixed (scalars, enums incl. `OrderStatus` wire values, inputs) | API-001 | `graphql-inspector validate` 0 errors against all operations |
| API-003 | P0 | Codegen: TS resolver types for API, typed hooks for new apps (`pos`, `owner`) | API-002 | `pnpm codegen` in CI; no drift allowed |
| API-004 | P0 | Audit each app's WS protocol (`graphql-ws` vs legacy `subscriptions-transport-ws`) and auth `connectionParams` shape; document | API-001 | Table in `packages/schema/README.md` |
| CORE-001 | P0 | `packages/core/money`: fils type, `toMajor/toMinor`, `formatMoney` (en/ar), allocation (largest remainder) | REPO-001 | 100% branch coverage |
| CORE-002 | P0 | `core/pricing.calculate()` per doc 01 §7 (variations, add-ons, discounts, charges engine, delivery fee, VAT incl/excl, tip, cash rounding) | CORE-001 | Property tests (fast-check) + 30 fixture cases incl. Dubai hotel 7% fee + VAT; matches a hand-made spreadsheet |
| CORE-003 | P0 | `core/orderMachine`: states, transitions, actor rules, wire mapping (doc 01 §6) | REPO-001 | Every illegal transition throws; table-driven tests |
| CORE-004 | P0 | `core/invoice`: numbering format, simplified vs full rules, line building, credit notes | CORE-002 | Tests incl. AED 10,000 B2B threshold |
| DB-001 | P0 | Migrations for doc 01 §8 (schema `app`, enums, all P0 tables, indexes, triggers for updated_at + insert-only tables) | API-002 | `supabase db reset` locally from zero succeeds |
| DB-002 | P0 | Roles `api_rw`, `worker`, `migrator`; RLS on all tables + policies (doc 03 §6); Data API disabled; revoke anon | DB-001 | Test: `anon` key REST call returns 0 rows / 404; `api_rw` without `app.*` settings sees no orders |
| DB-003 | P0 | Seed (deterministic): 1 org, 3 restaurants (one Dubai hotel with 7% fee), 60+ items EN/AR with Cloudinary photos, add-ons, 2 zones, 2 floors × 6 tables, staff per role with known PINs, 3 riders, 5 customers, coupons, 200 past orders over 30 days with invoices | DB-002 | Two runs produce identical row counts and totals |
| DS-001 | P0 | Mood board: 3 directions (owner picks), then `packages/ui-tokens` → Tailwind + NativeWind presets; Inter + IBM Plex Sans Arabic | OWN-004 | Owner approval noted in PR |
| DS-002 | P0 | Core web components + Storybook (light/dark × LTR/RTL) | DS-001 | Visual snapshots committed |
| DS-003 | P0 | Core native components twin set | DS-001 | Demo screen in each Expo app renders all in RTL + dark |

## Phase 2: Server skeleton and infrastructure

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| API-010 | P0 | `services/api`: Fastify + Apollo 5, context (request id, auth), pino, Sentry, error masking, depth/cost limits, introspection off in prod, `/health`, `/ready` | API-003, DB-002 | Local `docker compose up` answers `/health` |
| API-011 | P0 | `@auth` directive + CI rule "every root field has @auth"; policy helpers; NOT_FOUND for foreign objects | API-010 | Test suite for directive; CI fails on a field without it |
| API-012 | P0 | **Auto-stub plugin** with `stub_hit` logging | API-010 | Every extracted operation executes without a GraphQL error on an empty DB |
| API-013 | P0 | Redis pub/sub + `graphql-ws` server with connect auth, per-socket limits | API-010, API-004 | Subscription test gets an event < 200 ms locally |
| API-014 | P0 | Rate limiter (Redis sliding window) + idempotency middleware + Zod input pipe | API-010 | Tests for 429 and repeat-key replay |
| API-015 | P0 | Caddy path aliases so apps' `SERVER_REST_URL/stripe/*` works without app changes | API-010 | curl to `/stripe/success` hits REST handler |
| WRK-001 | P0 | `services/worker` with BullMQ, Sentry, graceful shutdown; jobs: push, email | API-013 | Test job round-trip |
| INF-001 | P0 | Oracle VCN + A1 VM + hardening (doc 01 §4 steps 2–3, doc 03 §11) | OWN-001 | SSH key-only works; `ufw`/iptables allow only 22 (your IP), 80, 443 |
| INF-002 | P0 | DNS `api.flippin.app` + Caddy TLS (sslip.io until the domain exists) | INF-001 | `https://api…/health` shows valid cert |
| INF-003 | P0 | Deploy pipeline: arm64 images → GHCR → SSH `compose pull/up`; migrations job with `migrator` role | INF-002, API-010 | Merge to `main` deploys in < 10 min; rollback = re-run previous tag |
| INF-004 | P0 | Backups to Object Storage + keep-alive + UptimeRobot | INF-003 | A restore into a local Postgres succeeds; UptimeRobot green |

## Phase 3: Auth and core API (all roles)

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| AUTH-001 | P0 | JWT (Ed25519) issue/verify, sessions with rotating refresh + family revoke, `/rest/auth/refresh` (cookie) + GraphQL refresh mutation | API-011 | Reuse of an old refresh token revokes family (test) |
| AUTH-002 | P0 | Customer: `SendOtpToPhoneNumber`, `SendOtpToEmail`, `VerifyOtp`, `CreateUser`, `Login`, `EmailExist`, `PhoneExist`, `ForgotPassword`, `ResetPassword`, `ChangePassword`, demo OTP rule | AUTH-001, API-014 | OTP limits tests; demo OTP rejected when `DEMO_MODE=false` |
| AUTH-003 | P0 | Google + Apple token verification, `AppleAuthNonce` | AUTH-001 | Tests with signed fixture tokens |
| AUTH-004 | P0 | `RiderLogin`, `RestaurantLogin`, `ownerLogin`, admin login + TOTP for super admin | AUTH-001 | Each returns the fields the apps read |
| AUTH-005 | P0 | Public-access (guest) token and table-session token | AUTH-001 | Guest can query `Restaurants` but not `Orders` |
| AUTH-006 | P0 | POS device pairing (challenge-signature) + staff PIN login + lockouts | AUTH-001, DB-003 | PIN lockout and device lock tests |
| CFG-001 | P0 | `Configuration` (public only), `Zones`, `Cuisines`, `Banners`, `Tips`, `getCountries`, `getCitiesByCountry`, `GetVersions`; secret settings write-only | API-011 | Query never returns a secret (test scans response for known secret values) |
| PRO-001 | P0 | Profile + addresses: `UpdateUser`, `CreateAddress`, `EditAddress`, `DeleteAddress`, `SelectAddress`, `UserFavourite`, `deactivated` | AUTH-002 | Other user's address id → NOT_FOUND |
| MENU-001 | P0 | Browse: `Restaurants`, `RestaurantByIdAndSlug`, `TopRatedVendors`, `GetMostOrderedRestaurants`, `GetRecentOrderRestaurants`, `NearByRestaurantsCuisines`, `SearchFood` (EN/AR trigram), `GetFoodDetails`, `PopularItems`, `RelatedItems`, `GetReviewsByRestaurant` | DB-003 | Geo + zone filter tests; p95 < 300 ms on seed |
| ORD-001 | P0 | Cart & checkout: `GetUserCart`, `UserCartData`, `ClearCart`, `CalculateCheckout`, `Coupon` (uses `core.calculate`) | CORE-002, MENU-001 | Totals identical to core fixtures |
| ORD-002 | P0 | `PlaceOrder` (transaction: validate open/zone/min order/availability, price, coupon, loyalty, order_no counter, status events, publish) + `AbortOrder` | ORD-001, CORE-003 | Idempotent; 50 parallel places create 50 distinct order numbers with no gaps |
| PAY-001 | P0 | Stripe REST: `create-checkout-session` (GET redirect + web POST), success/cancel pages, **webhook** with signature + dedupe + amount check; auto-cancel unpaid after 15 min | ORD-002, API-015 | Stripe CLI `trigger` marks order paid once even if sent 3× |
| ORD-003 | P0 | Customer orders: `Orders`, `GetUsersActiveOrders`, `GetUsersPastOrders` (cursor), `OrderDetailsPage`, `OrderTracking`, `ReviewOrder` + subscriptions `SubscriptionOrder`, `SubscriptionOrderTracking` | ORD-002 | Tracking event arrives < 2 s after a status change on deployed env |
| STO-001 | P0 | Store ops: `Restaurant`, `Orders`, `AcceptOrder`, `CancelOrder`, `OrderPickedUp`, `ToggleStore`, `UpdateTimings`, `muteRing`, `saveRestaurantToken`, `StoreEarnings`, `SubscribePlaceOrder`, busy mode, item 86 | ORD-002 | Reject refunds a paid order (Stripe test refund) |
| RID-001 | P0 | Rider: `rider`, `RiderOrders`, `Order`, `AssignOrder` (atomic), `UpdateOrderStatusRider`, `UpdateRiderLocation` (throttled), `ToggleRider`, `SubscriptionAssignRider`, `SubscriptionZoneOrders`, dispatch re-offer job | STO-001 | Two riders accepting simultaneously → exactly one wins (test) |
| RID-002 | P1 | `Chat`, `SendChatMessage`, `SubscriptionNewMessage`; `RiderEarningsGraph`, `TransactionHistory`, withdrawals | RID-001 | Chat only between customer and assigned rider |
| INV-001 | P0 | Tax invoice issue on completion/payment (simplified by default, full on request), PDF (EN/AR, TRN, "Tax Invoice", sequential no.), credit notes on refund | CORE-004, PAY-001 | PDF shows all mandatory fields; UPDATE on `tax_invoices` fails |
| NOTIF-001 | P0 | Push (Expo) for the notifications matrix (doc 02 §13); device token registration; email via Resend (order receipt, password reset) | WRK-001 | Push arrives on a real Android phone |

## Phase 4: Customer web

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| WEB-001 | P0 | Point at our API; remove all template URLs/keys; env-only config; `VENDOR_MODE=MULTI` | CFG-001 | App loads with seed data on Vercel preview |
| WEB-002 | P0 | Fix 8 review bugs (PRD §12) + token refresh link (FE-003 pattern) | WEB-001, AUTH-001 | A unit/regression test per bug |
| WEB-003 | P0 | Redesign: home, restaurant, item sheet, cart bar, one-page checkout, tracking, orders, profile; skeletons; empty/error states; Arabic RTL pass | DS-002, WEB-001 | Visual review by owner; RTL screenshots |
| WEB-004 | P0 | Stripe Checkout flow + COD, "confirming payment" state | PAY-001, WEB-003 | Test card 4242 pays; 4000 0000 0000 9995 shows failure copy |
| WEB-005 | P0 | Playwright flow: browse → add with add-ons → checkout (card) → store accepts (API) → rider flow (API) → delivered → rate | WEB-004, RID-001 | Passes against the deployed URL in CI |
| WEB-006 | P1 | SEO pages, sitemap, JSON-LD, hreflang, OG images; Lighthouse ≥ 80 mobile | WEB-003 | Lighthouse CI budget passes |
| WEB-007 | P1 | Privacy: export data / delete account flows + privacy & terms pages EN/AR | PRO-001 | Deletion anonymises per doc 03 §9 |

## Phase 5: Store and rider apps

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| FE-003 | P0 | Token refresh link for customer, rider, store (shared snippet) | AUTH-001 | Access token expiry mid-session is invisible to user |
| STO-APP-001 | P0 | Store app: env config, rebrand ids `com.flippin.store`, connect, redesign, loud ring (Android channel + custom sound), busy mode, 86 | STO-001, DS-003, FE-003 | EAS preview APK installed; new order rings with screen off |
| RID-APP-001 | P0 | Rider app: env, `com.flippin.rider`, connect, redesign, background location (TaskManager), offer countdown, job steps, COD | RID-001, DS-003, FE-003 | Full delivery on 2 real phones, updates < 2 s |
| RID-APP-002 | P1 | Proof of delivery (photo / 4-digit code), chat, earnings & withdraw | RID-002 | Code mismatch blocks "Delivered" |

## Phase 6: Customer app

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| CUS-001 | P0 | Env, `com.flippin.customer`, connect, remove template servers, FE-003 | FE-003 | Runs in Expo Go against the API |
| CUS-002 | P0 | Redesign same screens as web; Stripe webview (patch for Apple Pay in WKWebView); push; deep links `flippin://order/:id` | CUS-001, WEB-003 | Order + push on real Android; iOS via Expo Go / TestFlight if Apple account |
| CUS-003 | P1 | Maestro E2E flow for order placement | CUS-002 | Passes in CI on Android emulator |

## Phase 7: POS, KDS, QR, pickup (new `apps/pos`)

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| POS-001 | P0 | App shell: Next.js 16 PWA, device pairing, PIN pad, auto-lock, device status pill, i18n EN/AR | AUTH-006, DS-002 | Installs as PWA on Windows Chrome and Android tablet |
| POS-API-001 | P0 | Dine-in API: `posTables`, `openTable`, `addItemsToOrder`, `fireToKitchen`, `moveOrder`, `mergeTables`, `tableStateChanged` | ORD-002 | Two tablets editing the same table → version conflict handled |
| POS-002 | P0 | Floor map + order screen (menu grid, modifiers, seats, courses, hold/fire) | POS-001, POS-API-001 | Waiter flow < 30 s for a 4-item order (timed) |
| KDS-API-001 | P0 | `kdsTickets`, `updateKdsStatus`, `kdsTicketChanged`, bump/recall, station routing, READY aggregation | POS-API-001 | Order READY only when all items ready (test) |
| KDS-001 | P0 | KDS screen (dark, timers, stations, sounds, all-day) | KDS-API-001 | Readable at 2 m on a TV (owner check) |
| POS-API-002 | P0 | `applyDiscount` (limits + manager PIN), `splitBill`, `takePayment` (cash/card terminal/split tender), `voidItem`, audit | POS-API-001, INV-001 | Split totals always sum to order total (property test) |
| POS-003 | P0 | Payment + split UI, receipt route + browser print 80 mm, kitchen chit print, full tax invoice capture | POS-API-002 | Receipt prints on an 80 mm printer via Chrome with Arabic |
| POS-004 | P0 | Online orders inbox inside POS (accept/reject, same as store) | STO-001, POS-001 | Web order rings on POS |
| QR-001 | P0 | `qrMenu`, `qrPlaceOrder`, call waiter, request bill; `/t/[token]` UI; POS confirmation setting | POS-API-001 | Guest order appears on POS + KDS < 2 s |
| QR-002 | P1 | Pay at table (Stripe Checkout for balance or share) | QR-001, PAY-001 | Table goes free after full payment |
| PICK-001 | P0 | `/pickup` TV screen | KDS-API-001 | Number moves to Ready with chime |
| SHIFT-001 | P0 | Shift open/close, blind count, pay-in/out, Z report, cash-up record (finance P0) | POS-API-002 | Z report totals = sum of shift payments |
| POS-005 | P1 | Refunds with manager PIN, reprint log, 86 + busy mode in POS tools | SHIFT-001 | Audit rows written for each |
| PRN-001 | P1 | `services/print-bridge`: raster ESC/POS over TCP 9100/USB, cash drawer kick, per-station kitchen printers | POS-003 | Silent print + drawer opens on a real printer |
| POS-006 | P2 | Offline mode: Dexie cache, outbox, invoice block reservation, cash-only while offline, sync + conflict banner | SHIFT-001 | 20 cash orders taken with Wi-Fi off sync correctly, no duplicate invoice numbers |

## Phase 8: Admin and finance

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| ADM-001 | P0 | Admin: upgrade to Next.js 16 / React 19, env config, rebrand, token refresh (exists), role-aware sidebar | CFG-001, DS-002 | Builds and logs in on Vercel |
| ADM-API-001 | P0 | Admin operations used by the admin app (restaurants, menu CRUD, riders, zones, coupons, orders list) extracted from `apps/admin/lib/api` | API-012 | Admin demo path produces 0 `stub_hit` |
| ADM-002 | P0 | Dashboard KPIs + charts, orders table + detail drawer | ADM-API-001 | Numbers equal a SQL check on seed data |
| ADM-003 | P0 | Menu editor (EN/AR, signed Cloudinary upload with crop, channel prices, calories/allergens, station), bulk edit | ADM-API-001 | Unsigned preset deleted; upload works signed |
| ADM-004 | P0 | Tables & floor editor + QR sheet PDF + token rotate; staff & PINs | POS-API-001 | Printed QR opens the right table |
| ADM-005 | P0 | Restaurant settings incl. **charges engine**, VAT inclusive flag, TRN, invoice prefix, discount limit | CORE-002 | Changing charges changes checkout totals |
| FIN-001 | P0 | VAT report (output from invoices, input from bills/expenses) per quarter, CSV/XLSX | INV-001 | Totals equal sum of invoice VAT for seed period |
| FIN-002 | P1 | Expenses, suppliers & bills, P&L, food cost %, payout statements | FIN-001, INVT-001 | P&L reconciles to rollups |
| RPT-001 | P1 | Reports: best sellers, peak hours, by staff, by channel, discounts/voids; nightly rollups job | WRK-001 | Report = SQL ground truth |
| ADM-006 | P1 | Audit log viewer, impersonation (read-only), kill switches | API-011 | Actions show in log |

## Phase 9: Growth, stock, owner app, integrations

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| LOY-001 | P1 | Loyalty earn (on COMPLETED), redeem at checkout/POS, expiry, settings | ORD-002 | Points ledger balances; redeem cannot exceed balance or 50% of order |
| PLUS-001 | P1 | Flippin Plus plans (Stripe subscriptions), member free delivery + discount in `core.calculate`, admin report | PAY-001, LOY-001 | Member checkout shows savings line |
| INVT-001 | P1 | Ingredients, recipes, auto-deduct on COMPLETED, receive stock, low-stock alerts | ADM-003 | Stock after 10 seeded orders = expected |
| MENU-002 | P1 | Combos/meal deals, happy-hour price rules, channel prices across all surfaces | CORE-002 | Rules applied identically on web, app, POS |
| BRAND-001 | P1 | Multi-brand (virtual brands) sharing one kitchen/KDS | MENU-001 | Two brands' orders on one KDS with brand tag |
| OWN-APP-001 | P1 | `apps/owner` Expo: today KPIs, approvals (remote PIN replacement), alerts push, finance views, branch controls | POS-API-002, FIN-001 | Approval from phone unblocks a POS discount < 10 s |
| AGG-001 | P1 | Aggregator middleware connector (Deliverect **or** Grubtech **or** UrbanPiper, pick one with sandbox access): menu push, order pull into POS/KDS, status sync | KDS-API-001 | Sandbox order appears on KDS with aggregator logo |
| WA-001 | P2 | WhatsApp order updates (Meta Cloud API) | NOTIF-001 | Template message delivered |
| RES-001 | P2 | Table reservations | ADM-004 | — |
| EINV-001 | P1 | PINT AE export (UBL XML) for full B2B invoices + ASP adapter interface (no live ASP yet) | INV-001 | XML validates against PINT AE schema samples |

## Phase 10: Rebrand, polish, release

| ID | Pri | Task | Needs | Done when |
| --- | --- | --- | --- | --- |
| REBRAND-001 | P0 | Names, icons, splash, app ids (`com.flippin.*`), links, email templates; Enatega-string check becomes a CI error | all app tickets | `rg -i "enatega|ninjascode"` finds only LICENSE files |
| FE-012 | P1 | Align Expo apps on SDK 54 | STO-APP-001, RID-APP-001, CUS-002 | All three build with the same SDK |
| QA-001 | P0 | Demo script run: delivery + dine-in + QR, 0 crashes, 0 stub hits on paths, live update < 2 s measured | all P0 | Recorded run video |
| QA-002 | P0 | Security checklist (doc 03) walk-through + OWASP ZAP baseline scan on web/admin/pos/api | all P0 | No high findings open |
| QA-003 | P0 | Load test (k6): 50 concurrent users, 20 open orders, 100 sockets on the Oracle VM | QA-001 | p95 within SLO, no errors |
| REL-001 | P0 | Production builds: Vercel prod domains, API prod, APKs via EAS, TestFlight if Apple account | QA-001 | All links in demo kit work from a fresh phone |
| REL-002 | P0 | Demo kit page, role logins, `demo.reset` button + nightly reset, walkthrough video, cost sheet | REL-001 | A new person tries every role in < 15 min |

---

## Critical path (shortest route to a working demo)

`REPO-001 → API-001 → API-002 → DB-001 → DB-002 → DB-003 → API-010 → AUTH-001 → ORD-002 → PAY-001 → STO-001 → RID-001 → WEB-001…005 → STO-APP-001 → RID-APP-001 → POS-API-001 → POS-002 → KDS-001 → POS-003 → QR-001 → REBRAND-001 → QA-001 → REL-001`

Parallel lanes once the API skeleton exists: design system (DS-*), infra (INF-*), core library (CORE-*).

## Counts

P0: 81 tickets · P1: 20 · P2: 3 · Owner tasks: 6 (110 total).
