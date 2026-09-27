# Flippin — Product Requirements and Execution Plan

Sep 27, 2026 · @Panda crew

## 1. Overview

We will ship a rebranded, fully working restaurant platform — delivery, dine-in POS and rider logistics on one backend — as a live demo that can be sold.

**Product.** One system for a restaurant business: customers order on the web or phone, staff run the counter and kitchen on a POS, riders deliver, and owners manage everything from an admin panel. Working name: **Flippin (placeholder domain flippin.app**).

**Starting point.** The repo `murtaza1099/resturantsystem` already holds six working front-end apps (about 4,200 files). They move into an `apps/` folder with clean names:

| App | Folder | Tech | State |
| --- | --- | --- | --- |
| Customer website | `apps/web` | Next.js 16, React 19 | Runs; no data without backend |
| Customer app (Android + iOS) | `apps/customer` | Expo 53, React Native | Code complete; needs backend |
| Rider app | `apps/rider` | Expo 53 | Code complete; needs backend |
| Store (restaurant) app | `apps/store` | Expo 54 | Code complete; needs backend |
| Admin panel (multi-restaurant) | `apps/admin` | Next.js 14 | Code complete; needs backend |
| Admin panel (single restaurant) | `apps/admin-single` | Next.js 14 | Code complete; needs backend |

**What is missing.**

- **Backend API.** Not in the repo yet. The apps call about 186 queries, 185 mutations and 33 subscriptions.
- **POS, kitchen display (KDS), QR table ordering.** No dine-in features exist.
- **Own branding and keys.** Placeholder names, URLs and Firebase keys from the original template are throughout the code.

## 2. Goals, non-goals and success metrics

The demo succeeds when a buyer can place a real order on any surface and watch it move through kitchen, rider and admin live.

**Goals**

1. Every app runs against our own backend (Supabase + GraphQL server), with no third-party servers or keys.
2. One end-to-end delivery flow and one dine-in POS flow work without errors.
3. Installable Android APKs, iOS TestFlight builds and public web links exist for each surface.
4. Fully rebranded as Flippin, with a demo login for each role.
5. Market-standard dine-in features are added: POS, KDS, QR table ordering, receipts, loyalty.

**Non-goals (for this demo)**

- Implementing all \~400 GraphQL operations; the ones outside the demo flows return safe empty results.
- Real SMS OTP, real payouts and live card charges (test mode only).
- Integrations with third-party marketplaces (Uber Eats, Foodpanda, Careem).
- App Store and Play Store public listings.

**Success metrics**

| Metric | Target |
| --- | --- |
| Demo flows passing end to end | 2 of 2 (delivery, dine-in) |
| Screens that crash or show a server error during the demo script | 0 |
| New order visible on store app and KDS after checkout | under 2 seconds |
| Customer web Lighthouse performance score (mobile) | 80 or higher |
| Old template names left in UI, URLs, app IDs | 0 |
| Time for a buyer to try every role from the demo kit | under 15 minutes |

## 3. Users and roles

Eight roles share one login system; every permission is enforced on the server, never only in the app.

| Role | Uses | Can do | Login |
| --- | --- | --- | --- |
| Customer | Web, customer app, QR menu | Browse, order, pay, track, review, earn loyalty points | Phone + OTP, email/password, Google, Apple |
| Rider | Rider app | Go online, accept orders, navigate, mark picked up/delivered, see earnings, withdraw | Email/phone + password |
| Waiter | POS (tablet) | Open tables, take orders, send to kitchen, request bill | 4-digit PIN |
| Cashier | POS | All waiter actions + payments, discounts (within limit), refunds (with manager PIN), shift close | 4-digit PIN |
| Kitchen | KDS screen | See tickets, mark preparing/ready | Device login + PIN |
| Restaurant manager | Store app, admin (own branch) | Menu, stock, staff, tables, reports for one branch | Email + password |
| Restaurant owner | Admin (own restaurants), owner app | Everything for all their branches, payouts | Email + password |
| Super admin | Admin (platform) | All restaurants, riders, zones, commission, platform settings | Email + password + 2FA |

## 4. Product surfaces

The system has nine surfaces in three groups; six come from the existing code and three (POS, KDS, QR menu) are built new.

&#91;embedded content: product surfaces · 9 apps, 1 backend\]

POS, KDS and QR menu will live in one new Next.js app (`apps/pos`) with three routes, so they share login, menu data and printing code. Two more surfaces join later: the pickup-ready screen (`/pickup` route in `apps/pos`, for a counter TV) and the owner app (`apps/owner`, Expo, Android + iOS).

## 5. Functional requirements

P0 items are required for the demo; P1 items make it competitive; P2 items are for after the first buyer conversations. "Existing" means the screen already exists in the code and only needs the backend.

### 5.1 Customer website and app

| Requirement | Priority | Source |
| --- | --- | --- |
| Sign up / log in with phone OTP, email, Google, Apple | P0 | Existing |
| Set delivery address on map; restaurants filtered by zone | P0 | Existing |
| Browse restaurants, cuisines, search, banners | P0 | Existing |
| Menu with variations and add-ons; cart; special instructions | P0 | Existing |
| Checkout: delivery or pickup, schedule for later, tip, coupon | P0 | Existing |
| Pay by cash on delivery or Stripe (test mode); PayPal | P0 / P1 | Existing |
| Live order status and rider on the map | P0 | Existing |
| Order history, reorder, ratings and reviews, favourites | P1 | Existing |
| Chat with rider | P1 | Existing |
| Loyalty points: earn per order, redeem at checkout | P1 | New |
| "You may also like" suggestions and one-tap reorder | P2 | New |
| WhatsApp order updates | P2 | New |

### 5.2 QR table ordering (new)

| Requirement | Priority |
| --- | --- |
| Each table has a QR code (printable from admin) that opens the menu for that table | P0 |
| Guest orders without an account; order lands on POS and KDS tagged with the table | P0 |
| Add more items to the same open bill; call waiter; request bill | P0 |
| Pay at table by card (Stripe test) or choose "pay at counter" | P1 |
| Leave a rating after paying; loyalty sign-up with phone number | P2 |

### 5.3 POS (new)

| Requirement | Priority |
| --- | --- |
| PIN login per staff member; role decides what they can do | P0 |
| Floor map with tables coloured by state (free, seated, ordered, bill requested) | P0 |
| Order types: dine-in, takeaway, delivery (delivery orders from apps appear here too) | P0 |
| Menu grid with categories, search, variations, add-ons, notes per item | P0 |
| Send to kitchen (fires ticket to KDS); hold and fire courses | P0 |
| Discounts (percent or amount, with reason); manager PIN above a limit | P0 |
| Split bill by item or equally; merge and move tables | P0 |
| Payments: cash (change due), card, split tender; tax and service charge | P0 |
| Receipt: print on 80 mm thermal printer or save as PDF; kitchen ticket print | P0 |
| Shift open with float, shift close with cash count and Z-report | P1 |
| Refunds and voids with reason and manager PIN; audit log | P1 |
| Offline mode: keep taking orders and cash payments, sync when back online | P2 |

### 5.4 Kitchen display (new)

| Requirement | Priority |
| --- | --- |
| Live ticket board, oldest first, with table/order number, items, add-ons, notes | P0 |
| Tap to mark item or ticket preparing, then ready (updates POS, apps, rider) | P0 |
| Timer per ticket; colour turns amber then red past target time | P0 |
| Filter by station (grill, drinks, desserts) | P1 |
| Sound alert on new ticket; recall last completed ticket | P1 |

### 5.5 Store app (restaurant)

| Requirement | Priority | Source |
| --- | --- | --- |
| Log in; new-order alert with sound; accept with prep time or reject | P0 | Existing |
| Mark ready for pickup; see assigned rider | P0 | Existing |
| Turn items and the restaurant on/off | P0 | Existing |
| Order history and daily earnings | P1 | Existing |

### 5.6 Rider app

| Requirement | Priority | Source |
| --- | --- | --- |
| Log in; go online/offline; location shared in background while online | P0 | Existing |
| New order request with pickup and drop-off; accept | P0 | Existing |
| Map navigation; mark picked up and delivered; cash collected | P0 | Existing |
| Chat with customer | P1 | Existing |
| Earnings, wallet, withdrawal requests | P1 | Existing |

### 5.7 Restaurant admin and super admin

| Requirement | Priority | Source |
| --- | --- | --- |
| Dashboard: today's sales, orders, average order value | P0 | Existing |
| Restaurants, menu, categories, add-ons, images | P0 | Existing |
| Orders list with filters and detail | P0 | Existing |
| Riders, zones (drawn on map), delivery fees | P0 | Existing |
| Coupons, banners, cuisines, tipping settings, commission | P1 | Existing |
| Tables and floor plan editor; print QR codes | P0 | New |
| Staff with roles and PINs | P0 | New |
| Reports: best sellers, peak hours, sales by staff, sales by channel | P1 | New |
| Inventory: stock per ingredient, recipes per item, low-stock alert | P1 | New |
| Loyalty settings (points per currency unit, redemption value) | P1 | New |
| Table reservations | P2 | New |
| Multi-branch: one owner, several outlets, combined reports | P2 | New |

### 5.8 UI and design upgrade

All seven apps move to one design system under our brand, so the product looks like one company made it.

| Area | Upgrade | Priority |
| --- | --- | --- |
| Design system | Shared tokens (colours, type scale, spacing, radius, shadows) in `packages/ui-tokens`, used by Tailwind on web and NativeWind on mobile | P0 |
| Design system | One icon set, one brand font, light and dark themes on every app | P0 |
| Brand assets | Logo, app icons, splash screens, favicon, email templates, store screenshots | P0 |
| Customer web and app | New home: search first, category chips, restaurant cards with photo, rating, ETA and delivery fee | P0 |
| Customer web and app | Item sheet with add-ons, sticky cart bar, one-page checkout | P0 |
| Customer web and app | Order tracking with map + status timeline; skeleton loaders instead of spinners; friendly empty and error states | P0 |
| Customer web and app | Small motion on add-to-cart and status changes; haptics on mobile | P1 |
| POS | Touch-first layout: 48 px targets, colour-coded tables, big totals, keyboard shortcuts on desktop | P0 |
| KDS | High-contrast dark theme readable from 2 m; ticket colours by age | P0 |
| Store and rider apps | One-handed layout, large action buttons, loud sound + vibration on new orders | P0 |
| Admin | New dashboard with KPI cards and charts; one table style with search, filters and CSV export; bulk menu edit; image crop on upload | P1 |
| Marketing site | Landing page for restaurant owners with pricing, features and demo request form | P1 |
| Quality bar | WCAG AA contrast, RTL checked, Lighthouse mobile 80+, no layout shift on load | P0 |

### 5.9 Other enhancements

| Enhancement | Priority |
| --- | --- |
| Guided setup for a new restaurant: menu import from CSV, tables, staff, printer test | P1 |
| Notification centre in every app (orders, payouts, promotions) | P1 |
| SEO pages per restaurant and dish on the customer website | P1 |
| Product analytics (PostHog free tier): funnel from menu view to paid order | P1 |
| Menu import from photo of a paper menu (AI extraction) | P2 |
| Customer support chat in admin with order context | P2 |

### 5.10 Confirmed additions (27 Sep 2026)

Four features were added after owner review: a subscription plan, a pickup-ready screen, restaurant finance and an owner mobile app.

**Subscription plan (Flippin Plus)**

| Requirement | Priority |
| --- | --- |
| Monthly and yearly plans set in super admin: price in AED, free-delivery threshold, member discount %, trial days | P1 |
| Subscribe, renew, cancel in customer web and app; card saved with the payment gateway (tokenised) | P1 |
| Checkout applies free delivery and member prices automatically; savings shown on receipt | P1 |
| Admin report: active members, churn, revenue from plans | P1 |

**Pickup-ready screen (counter TV)**

| Requirement | Priority |
| --- | --- |
| Full-screen page at `apps/pos` route `/pickup` for a TV at the counter: two columns, Preparing and Ready | P0 |
| Order numbers move live from KDS status; chime when an order turns Ready; auto-hide after pickup | P0 |
| Bilingual labels (Arabic and English) and restaurant logo | P1 |

**Restaurant finance**

| Requirement | Priority |
| --- | --- |
| Daily cash-up: expected vs counted cash per shift, card totals, variance with reason | P0 |
| Expenses: record rent, utilities, salaries, supplies with category, receipt photo and VAT amount | P1 |
| Suppliers and bills: purchase bills, due dates, paid/unpaid, link to stock received | P1 |
| Profit and loss per day, week, month: sales, discounts, food cost, expenses, commission, net | P1 |
| VAT report: output VAT on sales, input VAT on bills, net payable per quarter; export for the accountant (CSV/Excel) | P0 |
| Food cost %: recipe cost vs selling price per item, flagged above a target % | P1 |
| Payout statement for platform restaurants: sales minus commission and fees | P1 |

**Owner mobile app (new, Expo, Android + iOS)**

| Requirement | Priority |
| --- | --- |
| Live dashboard: today's sales, orders, average ticket, by branch and channel | P1 |
| Push alerts: large refund, void, cash variance, low stock, restaurant closed unexpectedly | P1 |
| Approve refunds and discounts above limit remotely | P1 |
| Finance views from above (P&L, VAT due, unpaid bills) | P1 |
| Turn items and the restaurant on/off | P1 |

### 5.11 UAE / Gulf market requirements

Flippin launches in the UAE first, so tax, language and payments follow UAE rules; other Gulf countries are configuration, not new code.

| Area | Requirement | Priority |
| --- | --- | --- |
| Currency | AED default, 2 decimals; currency per restaurant for later GCC markets | P0 |
| VAT | 5% VAT on food and drinks; prices can be entered VAT-inclusive or exclusive per restaurant | P0 |
| Tax invoices | Every receipt shows "Tax Invoice", restaurant TRN, sequential number, date, VAT amount and total; full tax invoice (with customer TRN) on request for B2B customers | P0 |
| E-invoicing | Store invoices in a structure that can be exported as PINT AE (UBL XML/JSON) and sent through an Accredited Service Provider; B2B mandate phases start 1 Jan 2027 (revenue AED 50m+) and 1 Jul 2027 (others); B2C is out of scope for now | P1 |
| Records | Keep invoices and VAT records at least 5 years; no hard delete of invoices, voids are recorded | P0 |
| Language | Arabic and English on all customer-facing screens and receipts; full right-to-left layout | P0 |
| Payments | Card, Apple Pay, Google Pay through a UAE gateway (Stripe, Network International or Telr); cash on delivery; BNPL (Tabby/Tamara) as P2 | P0 |
| Phone and address | +971 phone format; addresses by area/building with map pin (no postcodes) | P0 |
| Delivery platforms | Talabat, Deliveroo, Careem and Noon Food integration kept as a later option (see 5.12) | P2 |

Tax details are summarised from public guides and must be confirmed with a UAE tax adviser before launch.

### 5.12 Considered, not planned yet

| Feature | Why it waits |
| --- | --- |
| Aggregator sync (Talabat, Deliveroo, Careem, Noon Food) | Needs partner API access per platform |
| Group ordering | Lower demand than subscriptions for the first market |
| Gift cards and wallet top-up | Wallet exists; gift cards after payments are live |
| Owner AI assistant | After reports and finance data exist |
| Staff shifts and payroll | After finance module; overlaps with shift close |

## 6. Key user flows

All orders share one status model, so the same order is visible on every surface at the same time.

&#91;embedded content: order lifecycle · 10 states, 2 lanes\]

Each status change is pushed live to every screen that shows the order; loyalty points are credited when an order reaches Delivered or Paid and closed.

1. **Delivery order.** Customer picks address → restaurant → items → checkout (coupon, tip, pay) → store app rings → accept → KDS ticket → ready → nearest online rider gets the request → picked up → delivered → customer rates.
2. **Dine-in POS order.** Waiter opens table on floor map → adds items → send to kitchen → KDS → served → bill (split if needed) → cashier takes payment → receipt prints → table turns free.
3. **QR table order.** Guest scans table QR → menu opens tagged with the table → order → appears on POS and KDS → guest adds more or requests bill → pays by card or at counter.
4. **Rider shift.** Rider logs in → goes online → accepts request → navigates → picked up → delivered → earnings updated → requests withdrawal at end of week.
5. **Payouts.** Admin sees each restaurant's sales minus commission and each rider's earnings → approves withdrawals → marks paid (manual in the demo).

## 7. Architecture

The apps keep their existing GraphQL calls; we add a GraphQL server that answers them and stores data in Supabase.

&#91;embedded content: system architecture · clients, server, data\]

The apps never hold a Supabase key, so all rules live in one place (the server).

| Decision | Choice | Why |
| --- | --- | --- |
| Database | Supabase Postgres | Orders, menus and staff are relational; free tier for the demo |
| API | Node.js 20 + Apollo Server 4, TypeScript | Apps already speak GraphQL; no front-end rewrite |
| Live updates | `graphql-ws` subscriptions, Postgres LISTEN/NOTIFY between server instances | Matches what the apps subscribe to today |
| Server hosting | Railway (Render as fallback) | Needs a long-running process for WebSockets; Vercel functions cannot hold them |
| Web hosting | Vercel, one project per web app | Next.js native; preview links per branch |
| Mobile builds | Expo EAS (cloud) | Builds APK and iOS without a local Mac |
| Images | Supabase Storage, public bucket for menu images | Same account, CDN-served |
| Repo layout | Monorepo: existing app folders + `backend/` + `pos/` | One place for the buyer to receive |

## 8. Data model

About 30 Postgres tables in six domains; every table has `id` (uuid), `created_at` and `updated_at`, and money is stored in minor units (integer cents).

| Domain | Table | Key columns | Links to |
| --- | --- | --- | --- |
| Accounts | `users` | name, email, phone, password\_hash, role, is\_active | — |
| Accounts | `addresses` | label, line, lat, lng, is\_default | users |
| Accounts | `sessions` | refresh\_token\_hash, device, expires\_at | users |
| Accounts | `otp_codes` | phone\_or\_email, code\_hash, expires\_at, attempts | — |
| Accounts | `staff` | pin\_hash, staff\_role (waiter, cashier, kitchen, manager) | users, restaurants |
| Restaurants | `restaurants` | name, slug, logo, cover, address, lat, lng, is\_open, commission\_rate, tax\_rate, service\_charge | owner (users), zones |
| Restaurants | `opening_hours` | day, opens, closes | restaurants |
| Restaurants | `cuisines`, `banners` | name, image, sort | restaurants (banners) |
| Menu | `categories` | name, sort, is\_active | restaurants |
| Menu | `food_items` | name, description, image, is\_available, station | categories |
| Menu | `variations` | name, price, discounted\_price | food\_items |
| Menu | `addon_groups`, `addon_options` | min, max / name, price | food\_items (many-to-many) |
| Orders | `orders` | order\_no, type (delivery, pickup, dine\_in, qr), status, subtotal, tax, delivery\_fee, tip, discount, total, payment\_method, payment\_status, scheduled\_for | users, restaurants, riders, tables, coupons |
| Orders | `order_items` | qty, unit\_price, notes, kds\_status | orders, food\_items, variations |
| Orders | `order_item_addons` | name, price | order\_items |
| Orders | `order_status_events` | from\_status, to\_status, actor, at | orders |
| Orders | `payments` | method, amount, stripe\_intent\_id, status | orders |
| Delivery | `riders` | is\_online, vehicle, current\_lat, current\_lng, last\_seen\_at | users, zones |
| Delivery | `zones` | name, polygon (geojson), delivery\_fee, min\_order | — |
| Delivery | `rider_earnings`, `withdrawals` | amount, status | riders |
| Delivery | `chat_messages` | body, sender | orders |
| Dine-in | `floors`, `tables` | name, seats, x, y, shape, qr\_token, state | restaurants |
| Dine-in | `bills`, `bill_splits` | status, total / share, paid | orders, tables |
| Dine-in | `shifts` | opened\_by, float, closed\_by, counted\_cash, z\_report | staff, restaurants |
| Dine-in | `receipts` | number, pdf\_url, printed\_at | bills |
| Growth | `coupons` | code, type, value, min\_order, valid\_from, valid\_to, usage\_limit | restaurants (optional) |
| Growth | `reviews` | rating, comment | orders, users, restaurants |
| Growth | `favourites` | — | users, restaurants |
| Growth | `loyalty_accounts`, `loyalty_ledger` | balance / points, reason | users, orders |
| Stock | `ingredients`, `recipes`, `stock_movements` | unit, on\_hand, reorder\_level / qty per item / delta, reason | restaurants, food\_items |
| Platform | `settings`, `audit_log` | key, value / actor, action, entity, before, after | — |

Tables added for the confirmed features (5.10, 5.11):

| Domain | Table | Key columns | Links to |
| --- | --- | --- | --- |
| Subscriptions | `plans`, `subscriptions` | price, interval, free\_delivery\_min, member\_discount / status, renews\_at, gateway\_ref | users |
| Finance | `cash_ups` | expected\_cash, counted\_cash, card\_total, variance, reason | shifts |
| Finance | `expense_categories`, `expenses` | name / amount, vat\_amount, date, receipt\_url | restaurants |
| Finance | `suppliers`, `supplier_bills`, `bill_payments` | name, trn / number, due\_date, total, vat\_amount, status / amount, paid\_at | restaurants, stock\_movements |
| Tax | `tax_invoices` | invoice\_no (sequential per restaurant), type (simplified, full), seller\_trn, buyer\_trn, net, vat, total, pint\_ae\_payload | orders, bills |
| Owner app | `device_tokens`, `alerts` | token, platform / type, severity, read\_at | users, restaurants |

## 9. API scope

The demo needs about 80 of the \~400 operations the apps call; the rest get schema-correct empty answers so no screen crashes. Names below are taken from the app code as it stands.

| Domain | Operations to implement fully (demo) | Used by |
| --- | --- | --- |
| Auth | `Login`, `CreateUser`, `SendOtpToPhoneNumber`, `SendOtpToEmail`, `VerifyOtp`, `EmailExist`, `PhoneExist`, `ForgotPassword`, `ResetPassword`, `ChangePassword`, `RiderLogin`, `RestaurantLogin`, `ownerLogin`, `AppleAuthNonce` | All apps |
| Profile | `UpdateUser`, `CreateAddress`, `EditAddress`, `DeleteAddress`, `SelectAddress`, `UserFavourite`, `deactivated` | Web, customer app |
| Config | `Configuration`, `Zones`, `Cuisines`, `Banners`, `Tips`, `getCountries`, `getCitiesByCountry`, `GetVersions` | All apps |
| Browse | `Restaurants`, `RestaurantByIdAndSlug`, `TopRatedVendors`, `GetMostOrderedRestaurants`, `GetRecentOrderRestaurants`, `NearByRestaurantsCuisines`, `SearchFood`, `GetFoodDetails`, `PopularItems`, `RelatedItems`, `GetReviewsByRestaurant` | Web, customer app |
| Cart and checkout | `GetUserCart`, `UserCartData`, `ClearCart`, `CalculateCheckout`, `Coupon`, `PlaceOrder`, `AbortOrder` | Web, customer app |
| Orders (customer) | `Orders`, `GetUsersActiveOrders`, `GetUsersPastOrders`, `OrderDetailsPage`, `OrderTracking`, `ReviewOrder` | Web, customer app |
| Store | `Restaurant`, `Orders`, `AcceptOrder`, `CancelOrder`, `OrderPickedUp`, `ToggleStore`, `UpdateTimings`, `muteRing`, `saveRestaurantToken`, `StoreEarnings` | Store app |
| Rider | `rider`, `RiderOrders`, `Order`, `AssignOrder`, `UpdateOrderStatusRider`, `UpdateRiderLocation`, `ToggleRider`, `RiderEarningsGraph`, `TransactionHistory`, `Chat`, `SendChatMessage` | Rider app |
| Admin | Dashboard stats, restaurants CRUD, categories/foods/add-ons CRUD, riders CRUD, zones CRUD, coupons CRUD, orders list (names read from `lib/api` in each admin app during build) | Admin panels |
| POS / KDS / QR (new) | `posTables`, `openTable`, `addItemsToOrder`, `fireToKitchen`, `kdsTickets`, `updateKdsStatus`, `splitBill`, `takePayment`, `closeShift`, `qrMenu`, `qrPlaceOrder` | New `pos/` app |
| Live (subscriptions) | `SubscribePlaceOrder`, `SubscriptionOrder`, `SubscriptionOrderTracking`, `SubscriptionAssignRider`, `SubscriptionZoneOrders`, `SubscriptionNewMessage`, new `kdsTicketChanged`, `tableStateChanged` | All apps |

**Stubbing strategy.** A script reads every operation from the six apps, builds one merged schema file, and the server auto-answers anything without a resolver with an empty list, `null` or `false` (matching the field type). A log line records each stub hit, so we see which ones the demo actually touches.

**Deferred (stubbed).** Single-vendor variants (`SingleVendor*`), subscriptions/plans, support tickets, referral credits, live activities, rider documents, weekly deals.

## 10. Authentication and security

The server owns all identity and permission checks; apps only store a token and show or hide screens.

**Authentication**

- Passwords hashed with argon2id; never logged or returned.
- Access token: JWT, 15-minute expiry, carries user id and role. Refresh token: random, 30 days, stored hashed in `sessions`, rotated on each use.
- OTP: 6 digits, 5-minute expiry, 5 attempts, stored hashed. Demo mode accepts `111111` when `DEMO_MODE=true`; real SMS (Twilio) is a P2 switch.
- Google and Apple sign-in: verify the ID token on the server, then issue our own tokens.
- POS staff: 4-digit PIN checked against `staff.pin_hash` on a device already logged in as the restaurant; lock after 5 wrong tries.
- Super admin: password + TOTP second factor.

**Authorization**

- Every resolver declares allowed roles; restaurant roles are also scoped to their own `restaurant_id`.
- Riders see only orders offered or assigned to them; customers see only their own orders and addresses.
- Manager PIN required for voids, refunds and discounts above the set limit; each is written to `audit_log`.

**Platform security**

- Supabase service key only on the server (Railway variables); row-level security enabled on all tables as a second line.
- HTTPS everywhere; CORS limited to our web domains; rate limits on login, OTP and place-order (per IP and per user).
- GraphQL depth and cost limits; introspection off in production.
- Stripe: card data never touches our server (Payment Element); webhooks verified by signature.
- Secrets out of git: remove the old committed `google-services.json`, `GoogleService-Info.plist` and service-worker keys; use EAS secrets and Vercel environment variables.
- Mobile tokens in SecureStore (Keychain / Keystore); web tokens in httpOnly cookies where the app allows, otherwise memory + refresh.
- Fix the web app's token-expiry bugs (section 12) so expired sessions log out.

## 11. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Speed | API p95 under 300 ms for reads, 600 ms for place-order; menu images served under 200 KB (WebP) |
| Live updates | Status change visible on other screens in under 2 s; rider location every 10 s while on a delivery |
| Scale (demo) | 50 concurrent users and 20 open orders without errors on the smallest Railway plan |
| Reliability | Server restarts itself on crash; health check at `/health`; daily database backup |
| Offline | POS keeps working for cash orders without internet (P2); apps show a clear offline banner |
| Printing | 80 mm ESC/POS thermal printers over network or USB via browser print; PDF fallback |
| Languages | Keep the apps' existing translations; Arabic and English at launch with full right-to-left layout; other translations kept |
| Currency and tax | AED by default; currency, 5% VAT and service charge set per restaurant in admin |
| Accessibility | Tap targets at least 44 px on POS and KDS; text contrast meets WCAG AA |
| Devices | POS and KDS tested on a 10-inch Android tablet and an iPad in Chrome/Safari |
| Observability | Request logs with request id; error tracking (Sentry, free tier) on server and apps |
| Testing | Server unit tests for pricing, status changes and permissions; one Playwright script per demo flow |

## 12. Changes to existing code

The existing apps need 8 bug fixes, a cleanup, a rebrand and new configuration before the demo.

**Bugs found in the customer website (code review, 26 Sep 2026)**

| # | File | Problem | Effect |
| --- | --- | --- | --- |
| 1 | `lib/hooks/useSetApollo.tsx:151` | Error link checks `error.graphQLErrors`, which is never set there | Expired or invalid tokens never log the user out |
| 2 | `lib/context/auth/auth.context.tsx:578` | Guest session cleanup runs on every mount | Guest cart and searches erased on each reload |
| 3 | `lib/hooks/useSetApollo.tsx:103` | `wsClient.close(false, false)` reconnects instead of closing | Extra live sockets pile up on mode switch |
| 4 | `lib/context/User/User.context.tsx:627` | Quantity change mutates previous state | "+" adds 2 in dev; stale cart in production |
| 5 | `lib/context/User/User.context.tsx:571` | New order-status subscription on every profile change, never closed | Each update applied many times |
| 6 | `lib/context/User/User.context.tsx:580` | Page size 300 first, 20 after | Duplicate orders in history |
| 7 | `lib/utils/methods/auth.ts:71` | Token expiry never checked | Expired session looks logged in |
| 8 | `lib/utils/methods/helpers.ts:127` | Days rounded up | "2 Days ago" for a 25-hour-old order |

Also fix: unused `SERVER_URL` lint error in `useSetApollo.tsx:114`. The admin, customer, rider and store apps get the same review before release.

**Cleanup**

- Delete root `index.html` (a saved GitHub page, 1.1 MB), stray root `lib/`, empty root `package-lock.json`.
- Remove audit PDFs and internal notes from app folders (`*_AUDIT.pdf`, `AUDIT-REMEDIATION-*.md`, `QUAL-012_BACKEND_INSTRUCTIONS.md`).
- Decide whether to keep both admin panels or merge single-vendor into multi-vendor.
- Upgrade admin panels from Next.js 14 to the web app's Next.js 16 so all web apps match.

**Rebrand**

- Name, logo, colours, favicon, splash screens and app icons in all six apps.
- App IDs: bundle identifier and Android package (e.g. `com.flippin.customer`, `.rider`, `.store`).
- Replace every link to the old template's websites and privacy/terms pages with our own.
- Rename app folders to `apps/web`, `apps/customer`, `apps/rider`, `apps/store`, `apps/admin`, `apps/admin-single`; keep the original MIT copyright line only inside LICENSE files.

**Configuration**

- Point `NEXT_PUBLIC_SERVER_URL` / `NEXT_PUBLIC_WS_SERVER_URL` (web, admin) and `environment.js` / `environment.ts` (mobile) at our server.
- Remove every hard-coded third-party API server address from the apps.
- Set `VENDOR_MODE` to `MULTI` (or `SINGLE` for a one-restaurant demo) so the mode switch is hidden.
- Our own Firebase, Google Maps, Stripe and Sentry keys through environment variables only.

## 13. Accounts and services the owner sets up

The demo runs for about $5–30 a month plus $99 a year for iOS; everything else fits free tiers. Prices are approximate, as of September 2026.

| Service | Used for | Owner action | Cost |
| --- | --- | --- | --- |
| Supabase | Database, image storage | Pause one of the two active projects (free plan allows 2) or upgrade, so a new `restaurant-demo` project can be created | Free, or $25/mo Pro |
| Railway | GraphQL server | Create account, connect GitHub repo | about $5/mo |
| Vercel | Web, admin, POS hosting | Already connected (team "Murtaza's projects"); Pro needed for commercial use | Free (Hobby) or $20/mo |
| Expo (EAS) | Android and iOS builds | Create account; run `npx eas login` once | Free tier |
| Google Cloud | Maps, Places, Directions | Create project, enable APIs, add billing, restrict keys by app/domain | Free monthly usage covers a demo |
| Firebase | Push notifications (FCM) | Create project; add Android apps; upload FCM key to Expo | Free |
| Stripe | Card payments (test mode) | Create account; copy test keys | Free in test mode |
| Apple Developer | iOS on real iPhones (TestFlight) | Enrol | $99/year |
| Google Play Console | Play Store listing (optional for demo) | Enrol only if publishing | $25 once |
| Sentry | Error tracking | Create account | Free tier |
| Resend | Emails (password reset, receipts) | Create account; verify domain | Free tier |
| Domain | Demo URLs, e.g. `flippin.app` | Buy; point DNS to Vercel | about $10–15/year |

- [ ] Supabase slot freed
- [ ] Brand name, logo and colours decided
- [ ] Railway, Expo, Google Cloud, Firebase, Stripe accounts created
- [ ] Apple Developer enrolled (only for iOS on devices)

For the UAE launch: a payment gateway that supports AED, Apple Pay and Google Pay (Stripe, Network International or Telr), and the restaurant's own TRN for tax invoices. An Accredited Service Provider for e-invoicing is only needed once a restaurant customer falls under the B2B mandate (from 2027).

## 14. Release and build plan

Each surface ships as a public link or an installable file, and the buyer gets one demo kit that ties them together.

| Surface | Build | Delivered as |
| --- | --- | --- |
| Customer website | Vercel project from `apps/web` | `https://flippin.app` |
| Admin panel | Vercel project from `apps/admin` | `https://admin.flippin.app` |
| POS + KDS + QR menu | Vercel project from `apps/pos` | `https://pos.flippin.app`, `/kds`, `/t/<table>` |
| GraphQL server | Railway service from `backend/` | `https://api.flippin.app/graphql` |
| Customer app | `eas build -p android --profile preview` / `-p ios` in `apps/customer` | APK file + TestFlight invite |
| Rider app | same, in `apps/rider` | APK file + TestFlight invite |
| Store app | same, in `apps/store` | APK file + TestFlight invite |

**Demo kit for buyers**

- One landing page with every link, APK downloads and TestFlight instructions.
- A demo login per role (customer, rider, waiter, cashier, kitchen, manager, owner, super admin) and the OTP `111111`.
- Seed data: 3 restaurants, 60+ menu items with photos, 2 zones, 12 tables, 3 riders, coupons, past orders so reports have numbers.
- A "reset demo" button in super admin that restores seed data.
- A 3-minute walkthrough video of both demo flows.
- Feature list, tech stack summary and hosting cost sheet (sections 5, 7 and 13 of this PRD).

## 15. Milestones and roadmap

Work runs in five phases; a phase is done only when its gate passes on the deployed demo, not on a laptop.

&#91;embedded content: roadmap · 5 phases, 5 gates\]

Phases are in order of dependency; durations are not set yet. The shared design system is built in phase 1, and each app is redesigned in the same pass that connects it to real data, so no screen is touched twice. After the first buyer conversations: the items in 5.12 and the P2 items in section 5.

## 16. Execution plan

Each step is its own branch and pull request, and a step is done only when its gate passes on the deployed system.

| Step | Who | Work | Gate |
| --- | --- | --- | --- |
| 0. Setup | Owner | Free a Supabase slot; create Railway, Expo, Google Cloud (Maps, Places, Directions), Firebase and Stripe test accounts; approve merging the rebrand into `main` | Accounts exist; keys entered only in hosting settings, never in chat or git |
| 1. API blueprint | Claude | Collect every GraphQL request from the six apps; write `backend/schema.graphql`; validate all requests against it | All app requests validate with zero errors |
| 2. Database | Claude | Supabase migrations for sections 8 and 5.10; row-level security; image bucket; repeatable seed (3 restaurants, 60+ dishes, zones, tables, riders, coupons, past orders) | Seed resets the database to the same state every run |
| 3. Design system | Claude, owner picks style | Mood board with 2–3 directions; owner picks one; shared tokens and components for web (Tailwind) and mobile (NativeWind); Arabic RTL from day one | Owner approves; components render in light, dark, LTR and RTL |
| 4. GraphQL server | Claude | `backend/` on Railway: auth for all roles, menus, cart, checkout, orders, store and rider actions, live updates, auto-stubs with logging; unit tests | Tests pass; deployed `/health` answers |
| 5. Customer web | Claude | Connect to server; fix the 8 review bugs; redesign screens; Playwright script for browse → order → track; deploy on Vercel | Script passes on the live link |
| 6. Store and rider apps | Claude builds, owner tests on phones | Connect and redesign; EAS preview APKs; owner installs on Android (Expo Go for quick checks) | Delivery flow end to end on real phones, updates within 2 s |
| 7. Customer app | Claude builds, owner tests | Same screens as web on Android and iOS; push notifications through Firebase | Order and push work on a real phone |
| 8. POS, KDS, QR, pickup screen | Claude | New `apps/pos` with `/pos`, `/kds`, `/t/<table>`, `/pickup`; UAE tax invoices and receipt PDF; shift close and cash-up | Dine-in and QR orders end to end on a tablet; receipt shows TRN and VAT |
| 9. Admin and finance | Claude | Admin panels on real data; finance (expenses, bills, P&L, VAT report); reports | Admin and finance totals match seeded orders exactly |
| 10. Growth and owner app | Claude | Subscription plan, loyalty, inventory; new `apps/owner` Expo app | Member checkout applies free delivery; owner alerts arrive on a phone |
| 11. Polish and release | Claude and owner | Motion, accessibility, real screenshots replacing old mockups; production builds (Vercel, Railway, APK, TestFlight if Apple account bought); demo kit and video | A new person tries every role in under 15 minutes from the demo kit |

Checks on every pull request: lint, typecheck, server tests, and the Playwright flows against a preview deployment.

## 17. Risks, open questions and licensing

The biggest risk is the backend: matching \~400 operations the apps expect, with no official schema to copy.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Apps expect exact response shapes we must reverse-engineer from queries | Screens break on missing fields | Generate the schema from the apps' own queries; auto-stub everything; test each screen in the demo script |
| Apps may call operations on screens the demo script does not cover | Hidden crash during a buyer demo | Log every unknown operation on the server; run all flows on every build |
| Expo SDK versions differ (53 vs 54) across mobile apps | Build failures | Build each app with its own SDK first; align later |
| Google Maps cost if the demo link spreads | Unexpected bill | Restrict keys by domain/app; set a billing budget alert |
| iOS review and signing | iOS demo delayed | Use TestFlight internal testing; APK and web as the primary demo |
| Old template names left somewhere | Buyer cannot use the product | Full rebrand plus an automated search of code, assets and app IDs before each release |

**Open questions**

- [x] Brand: Flippin
- [x] First market: UAE / Gulf
- [x] Database: Supabase, with Firebase for push notifications
- [ ] Buy the flippin.app domain (or pick another)?
- [ ] Which UAE payment gateway: Stripe, Network International or Telr?
- [ ] Keep single-restaurant admin, or multi-restaurant only?
- [ ] Buy Apple Developer for the first demo?
- [ ] Sell as source code only, or source + hosted demo + setup service?

**Licensing**

- Part of the front-end code is MIT-licensed: selling it is allowed, and the original copyright line must stay inside the LICENSE files (never shown to users).
- Every product name, logo, domain and app ID is our own.
- The backend is written by us from scratch.

**Sources**

- [G2 — Best restaurant POS systems 2026](https://learn.g2.com/best-restaurant-pos-systems)
- [SoftwareSuggest — Toast vs Petpooja](https://www.softwaresuggest.com/compare/toast-pos-vs-petpooja)
- [dev.family — Restaurant app trends 2026](https://dev.family/blog/article/restaurant-app-design-functionality-trends-2026)
- [Deonde — Restaurant loyalty trends 2026](https://deonde.co/blog/restaurant-loyalty-software-trends/)
- [iCoderz — Food delivery app features 2026](https://www.icoderzsolutions.com/blog/food-delivery-app-features/)
- [Hawksford — UAE e-invoicing timeline](https://www.hawksford.com/insights-and-guides/uae-e-invoicing) (search summary; page not opened)
- [Tally — UAE e-invoicing for retail and POS](https://tallysolutions.com/mena/uae-vat/uae-e-invoicing-retail-pos-compliance/) (search summary; page not opened)
- [Paci — UAE VAT invoice mandatory fields](https://paci.ae/blogs/uae-vat-invoice-format-mandatory-fields/) (search summary; page not opened)
