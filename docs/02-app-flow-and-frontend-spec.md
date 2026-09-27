# 02 — App Flow & Frontend Specification

Flippin · v1.0 · 27 Sep 2026

Nine surfaces, one design system, one API. For every screen: **purpose → data (GraphQL op) → states → actions → rules**. "Existing" means the screen exists in the Enatega code and is connected + redesigned, not rebuilt.

## 1. Global frontend rules

| Rule | Detail |
| --- | --- |
| Languages | English + Arabic on every customer-facing surface, receipts and POS/KDS. Locale switch in settings; default from device. Admin: English first, Arabic P1 |
| RTL | Web: `<html dir>` from locale (`DirectionHandler` exists in web). Tailwind logical classes only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`); lint rule bans `ml-/mr-/pl-/pr-/left-/right-` in new code. Mobile: `I18nManager.forceRTL` + app reload; icons that point (back, chevrons) are mirrored |
| Numbers and money | Always Western digits (0-9) in both languages (the UAE norm on receipts). Format `AED 12.50` / `12.50 د.إ`. One helper `formatMoney(fils, currency, locale)` in `packages/core` |
| Phone | `+971` default, E.164 stored, input mask `5X XXX XXXX` |
| Dates | `Asia/Dubai` for restaurant-facing screens; device time zone for customers; relative time ("25 min ago", "1 day ago" using floor, fixing bug #8) |
| Loading | Skeletons shaped like the content, never full-screen spinners after the first paint |
| Empty states | Illustration + one line + one action ("No orders yet → Browse restaurants") |
| Errors | Map API error codes to friendly text (§10); never show raw GraphQL messages. Retry button on network errors |
| Offline | Top banner "You're offline, showing saved data" on every app; POS shows a device-status pill |
| Realtime | Subscriptions for live screens, plus a 30 s polling fallback when the socket is down (store app already does this) |
| Accessibility | WCAG 2.2 AA contrast, 44 px targets (48 px on POS/KDS), labels on all icons, focus rings on web, Dynamic Type up to 130% on mobile |
| Performance | Web: LCP < 2.5 s on 4G mid Android, CLS < 0.1, JS < 200 KB gz per route; images WebP/AVIF via Cloudinary `f_auto,q_auto,w_…`; mobile: cold start < 3 s, lists virtualised (FlashList) |
| Analytics | PostHog events: `view_restaurant`, `add_to_cart`, `begin_checkout`, `place_order`, `payment_succeeded`, `order_delivered`; no PII in properties |

## 2. Design system (`packages/ui-tokens`)

- **Tokens:** `color.{bg, surface, surface-2, border, text, text-muted, primary, primary-contrast, success, warning, danger, info}`, each with light and dark values; `radius.{sm 6, md 10, lg 16, pill}`; `space` 4-pt scale; `shadow.{1,2,3}`; `motion.{fast 120ms, base 200ms, slow 320ms}`, easing `cubic-bezier(.2,.8,.2,1)`.
- **Type:** Latin **Inter**, Arabic **IBM Plex Sans Arabic** (both free, OFL). Scale 12/14/16/18/20/24/30/36; line-height 1.4 for Arabic.
- **Status colours (shared across POS/KDS/apps):** Pending = info, Accepted/Preparing = warning, Ready = success, Picked = primary, Delivered/Completed = muted, Cancelled = danger. Table states: free = surface, seated = info, ordered = warning, bill requested = primary, dirty = muted striped.
- **Core components (web + native twins):** Button, IconButton, Input, PhoneInput, OTPInput, Select, Sheet/BottomSheet, Dialog, Toast, Tabs, Chip, Badge, Card, ListItem, Skeleton, EmptyState, ErrorState, MoneyText, QtyStepper, StatusPill, Timeline, MapView wrapper, ImageWithFallback, KPI card, DataTable (admin).
- Output: `tailwind-preset.js` (web) and `nativewind-preset.js` (mobile) generated from one `tokens.json`. Storybook (web) is the visual reference, with light/dark × LTR/RTL snapshots.

## 3. Navigation maps

```
CUSTOMER WEB / APP
Splash → (first run) Language → Location permission → Address pick ─┐
                                                                     ▼
Home (search, cuisines, banners, restaurant cards) ─▶ Restaurant ─▶ Item sheet ─▶ Cart ─▶ Checkout ─▶ Pay (Stripe webview / COD) ─▶ Order tracking ─▶ Rate
   │                                                                                                     ▲
   ├─ Search results                                                                                     │ push / deep link flippin://order/:id
   ├─ Orders (active / past) ─▶ Order detail ─▶ Reorder / Help ─────────────────────────────────────────┘
   ├─ Favourites
   └─ Profile ─▶ Addresses, Payment (saved via Stripe), Flippin Plus, Loyalty, Language, Notifications, Privacy (export/delete), Logout
Auth is asked **only at checkout** (guest browsing with public-access token).

QR (/t/:token) Menu (table banner) ─▶ Item ─▶ Cart ─▶ "Send to kitchen" ─▶ Live bill ─▶ Add more | Call waiter | Request bill ─▶ Pay (card) | Pay at counter ─▶ Rate / join loyalty

POS  Device pairing (once) ─▶ PIN pad ─▶ Floor map ─▶ Table order screen ─▶ Payment ─▶ Receipt
                                  ├─▶ Takeaway / Delivery order screen
                                  ├─▶ Online orders inbox (accept / reject)
                                  ├─▶ Shift (open, pay-in/out, close + cash count, Z report)
                                  └─▶ Manager tools (voids, refunds, 86 items, busy mode, reprint)

KDS  Device pairing ─▶ Station select ─▶ Ticket board (+ recall, all-day counts)
PICKUP TV  Device pairing ─▶ Preparing | Ready columns
STORE APP  Login ─▶ Orders (New / Preparing / Ready / Done) ─▶ Order detail ─▶ Accept with time / Reject / Ready ─▶ Menu on-off ─▶ Earnings ─▶ Settings
RIDER APP  Login ─▶ Home (online toggle, map) ─▶ Offer card ─▶ Active delivery (pickup → drop) ─▶ Proof ─▶ Earnings / Wallet / Withdraw ─▶ Profile
ADMIN      Login (+2FA for super admin) ─▶ Dashboard ─▶ Orders · Restaurants · Menu · Tables & QR · Staff · Riders · Zones · Coupons · Banners · Loyalty · Plans · Inventory · Finance · Reports · Settings · Audit log
OWNER APP  Login ─▶ Today (KPIs by branch) ─▶ Approvals ─▶ Alerts ─▶ Finance ─▶ Branch controls
```

## 4. Customer web (`apps/web`) and app (`apps/customer`)

Same screens and logic on both; web adds SEO pages.

| Screen | Data | States | Actions & rules |
| --- | --- | --- | --- |
| Address picker | `Zones`, Places Autocomplete, `CreateAddress` | no permission, searching, out-of-zone | Map pin required; area + building + apartment; "Out of delivery area" if not in any zone, with pickup still offered |
| Home | `Restaurants(lat,lng)`, `Cuisines`, `Banners`, `TopRatedVendors`, `GetRecentOrderRestaurants` | skeleton, empty zone, error | Card: photo, name, rating, ETA range, delivery fee, "Closed · opens 12:00", "Busy" badge. Closed restaurants sorted last and still allow scheduled orders |
| Search | `SearchFood`, restaurant search | typing (debounce 250 ms), no results | Searches EN + AR; recent searches kept locally |
| Restaurant | `RestaurantByIdAndSlug`, `PopularItems` | loading, closed banner, busy banner | Sticky category tabs scroll-spy; sold-out items greyed with "Sold out"; calories + allergen icons; switching restaurant with non-empty cart asks "Start a new cart?" |
| Item sheet | `GetFoodDetails` | — | Variation required (radio), add-on groups enforce min/max with inline error, notes (140 chars), qty stepper; price updates live |
| Cart | `UserCartData`/local cart | empty | Sticky bar "View cart · 3 items · AED 54.00"; fixes bug #4 (immutable updates) |
| Checkout | `CalculateCheckout`, `Coupon`, `Tips` | recalculating, price changed, below min order | One page: delivery/pickup toggle, address, schedule (15-min slots within opening hours), coupon, loyalty redeem, tip (0/5/10%/custom), payment method, bill breakdown **exactly from server** (subtotal, discount, charges, delivery fee, VAT, tip, total). Place button disabled while recalculating |
| Pay | `PlaceOrder` → REST Stripe Checkout | processing, failed, cancelled | `PlaceOrder` creates the order `PENDING` with `payment_status=pending` for card; webview opens Checkout; success page → poll `OrderTracking` until webhook marks paid (max 30 s, then "We're confirming your payment"). Cancel → order stays unpaid → auto-cancelled after 15 min. Idempotency key per checkout attempt |
| Tracking | `OrderTracking` + `SubscriptionOrderTracking` + rider location | each status, cancelled, delivered | Timeline + map (rider marker animates between 10 s updates), ETA, call/chat rider after assignment, cancel button only while PENDING (60 s) |
| Rate | `ReviewOrder` | — | 1–5 stars + comment; shown once after COMPLETED |
| Orders | `GetUsersActiveOrders`, `GetUsersPastOrders` (cursor pagination 20, fixes bug #6) | empty | Reorder puts available items into the cart and says which were unavailable |
| Profile | `UpdateUser`, addresses, `deactivated` | — | Delete account = PDPL flow (doc 03 §9) with 2-step confirm |
| Flippin Plus (P1) | `plans`, `subscribe` | trial, active, cancelling | Stripe Checkout in subscription mode; savings counter |
| Loyalty (P1) | balance, ledger | — | Points history; redeem toggle at checkout |

**Auth screens (existing):** phone → OTP (6 boxes, auto-read SMS on Android, resend after 30 s, 5 tries) → name (new users) → done. Email/password and Google/Apple as alternatives. Apple sign-in is **mandatory on iOS** if Google is offered (App Store rule 4.8).

**Web-only:** `/[emirate]/[restaurant-slug]` SSR pages with JSON-LD `Restaurant` + `Menu`, sitemap.xml, hreflang en/ar, Open Graph images.

**Bug fixes carried into this phase (from PRD §12):** #1 error-link reads `error.graphQLErrors` properly and logs out on `UNAUTHENTICATED`; #2 guest cleanup only on explicit logout; #3 `wsClient.dispose()` on mode switch; #4 immutable cart update; #5 single subscription keyed by user id with cleanup; #6 constant page size + cursor; #7 check `exp` before use and refresh; #8 floor days.

## 5. QR table ordering (`apps/pos` route `/t/[token]`)

| Step | Behaviour |
| --- | --- |
| Open | `qrMenu(token)` returns restaurant, table name, menu (channel `qr` prices), and whether a bill is open. Invalid/rotated token → "Ask staff for a new QR". Restaurant closed → read-only menu |
| Identity | Guest session: anonymous device token scoped to **this table's open order**, 4 h TTL. Name optional. Phone asked only for loyalty |
| Order | Cart → "Send to kitchen" → `qrPlaceOrder` (idempotent). First order opens the table order (status OPEN→ACCEPTED if `auto_accept`, else POS must confirm: restaurant setting `qr_requires_confirmation`, default **true** to stop pranks) |
| Live bill | Subscribes to `order:{id}`; shows items with kitchen status chips |
| Call waiter / Request bill | Rate-limited (1 per 60 s); appears on POS floor map as a flashing table |
| Pay | Card via Stripe Checkout for the remaining amount or a split share; or "Pay at counter". After full payment: e-receipt link + rating |
| Guardrails | Max 30 items per send, max order value setting, no ordering while table is `free` unless the restaurant allows self-seating |

## 6. POS (`apps/pos` route `/pos`)

**Layout (landscape, ≥ 1024 px; 800 px tablets get a compact variant):** left rail (Floor, Orders, Takeaway, Online, Shift, Tools), centre (menu grid or floor), right (ticket panel with totals). Everything reachable in ≤ 2 taps. Keyboard shortcuts on PC: `/` search, `F2` pay, `F4` send, `Esc` back, digits in PIN/amount pads.

| Screen | Data | Actions & rules |
| --- | --- | --- |
| Pairing | `registerPosDevice` | Manager email+password once; choose device kind + name; stores device token |
| PIN pad | `staffPinLogin` | Staff tiles (photo/initials) → 4-digit PIN; 5 wrong → locked 15 min; auto-lock after 2 min idle (configurable) |
| Floor map | `posTables`, `tableStateChanged` | Tables coloured by state, elapsed-time badge, covers, waiter initials; tap free table → covers → order; long-press → move/merge; bill-requested tables pulse |
| Order screen | `menu`, `openTable`, `addItemsToOrder` | Category tabs, grid tiles (image optional, price, sold-out lock), search, item modal for variations/add-ons/notes, seat & course number; items stay **unsent** (dashed) until "Send"; "Hold" per course; "Fire course 2" later |
| Send | `fireToKitchen` | Creates KDS tickets per station, prints kitchen chit if printer configured; sent items can only be voided (reason + manager PIN above limit) |
| Discounts | `applyDiscount` | % or amount, order or item, reason required; above `discount_limit_bp` → manager PIN or remote approval (owner app) |
| Split / merge / move | `splitBill`, `mergeTables`, `moveOrder` | Split by seat, by item (drag), or equally N ways; totals re-computed by `core`; each split pays separately |
| Payment | `takePayment` | Tender buttons (exact, 50, 100, 200, 500), numeric pad, change due large; card terminal (enter last 4 + approval code optional); split tender; tip on card; "Full tax invoice" toggle asks buyer name/TRN/address |
| Receipt | `/print/receipt/:id` | Auto-print (setting), reprint (logged), email/WhatsApp link to e-receipt |
| Takeaway / phone order | `createPosOrder` | Customer name/phone optional; pickup time |
| Online inbox | `SubscribePlaceOrder` | New delivery/pickup orders with loud chime; accept with prep time / reject with reason; same actions as store app |
| Shift | `openShift`, `cashMovement`, `closeShift` | Open with float; blind cash count by denomination on close; shows variance only **after** count; Z report print; one open shift per device |
| Tools | `toggleItem`, `setBusy`, `voidOrder`, `refundPayment` | 86 items (until end of day / until turned on), busy mode (+15/+30 min to ETAs or pause online orders), manager-only refunds |

**Device states:** online (green), reconnecting (amber), offline (red; cash-only mode when P2 ships), printer error (red icon + "Print as PDF" fallback).

## 7. Kitchen display (`/kds`)

- Dark high-contrast theme, font ≥ 20 px, readable from 2 m, landscape 1080p TV or tablet.
- Ticket card: order no, type icon (dine-in table name / takeaway / delivery with rider ETA / aggregator logo), elapsed timer, items grouped by course with qty large, modifiers indented, notes highlighted in yellow, allergen warning in red.
- Timer colours: normal < target, **amber** ≥ target, **red** ≥ target × 1.5 (target = item prep time or restaurant default).
- Tap item → preparing → ready; tap header → bump whole ticket; "Recall" last 10 bumped; "All-day" panel shows totals per item across open tickets.
- Station filter (`grill`, `fryer`, `drinks`, `desserts`, `expo`). The **expo** station sees all items and bumps the order to READY.
- New ticket: sound (distinct per type) + 2 s flash. Works in Chrome kiosk; keeps screen awake.

## 8. Pickup-ready TV (`/pickup`)

Two columns **Preparing | Ready** (Arabic/English headers), large order numbers, restaurant logo, chime + highlight when an order moves to Ready, auto-remove 2 min after COMPLETED or after staff taps "collected" on POS. No customer names (privacy).

## 9. Store app (`apps/store`, existing)

- Tabs: New · Preparing · Ready · Done. New order: full-screen alert with repeating ring + vibration until acknowledged (`muteRing`), even when the phone is locked (high-priority push + notification channel with custom sound on Android; critical alerts not available without Apple entitlement → time-sensitive notification on iOS).
- Accept with prep time chips (10/15/20/30/45) → Ready → sees assigned rider + ETA → Handed over.
- Toggles: restaurant open/closed, busy mode, items on/off (search). Earnings: today/week, by payment method.

## 10. Rider app (`apps/rider`, existing)

- Home: online toggle (requires location "Always" on Android via background task; on iOS "While using" + background location mode), current zone, today's earnings.
- Offer card: pickup name + distance, drop area (no exact address until accepted), estimated earning, 30 s countdown, Accept/Decline; "already taken" toast on race loss.
- Active job: steps **Go to restaurant → Arrived → Picked up (checks order is READY) → Go to customer → Arrived → Delivered**; call/chat buttons; open in Google Maps/Waze; COD shows "Collect AED X"; proof of delivery (photo or 4-digit code the customer sees) P1.
- Location: every 10 s while on a job, every 60 s while online and idle; batched when offline.
- Earnings: per order list, weekly chart, wallet balance, cash in hand, withdraw request.

## 11. Admin (`apps/admin`)

Role-aware sidebar (super admin, owner, manager see different sections; doc 03 §3).

| Area | Must-haves |
| --- | --- |
| Dashboard | KPI cards (sales, orders, AOV, cancel rate, avg prep time), sales by hour chart, channel split, top items, live orders count; date range + branch filter |
| Orders | DataTable with filters (status, type, channel, date, branch, payment), detail drawer with timeline, payments, invoice, refunds, audit |
| Menu | Categories drag-sort, item editor (EN/AR fields side by side, image crop 4:3 → Cloudinary signed upload), variations, add-on groups, channel prices, calories/allergens, station, bulk edit (price %, availability), CSV import/export |
| Tables & QR | Floor editor (drag, resize, rotate, snap grid), table names/seats, print QR sheet (A4, 6 per page, logo + table name), rotate QR token |
| Staff | Invite managers by email; add waiters/cashiers/kitchen with PIN (shown once), role, branch; reset PIN; deactivate |
| Restaurants | Profile, TRN, address/map, hours, charges, prices include VAT, invoice prefix, prep time, auto-accept, QR confirmation, discount limit, commission (super admin only) |
| Riders & zones | Map polygon drawing, fees, min order; riders list with live map, documents (P2) |
| Growth | Coupons, banners, cuisines, loyalty settings, Plus plans |
| Inventory (P1) | Ingredients, recipes per variation, stock count, receive stock (links supplier bill), low-stock alerts |
| Finance | Cash-ups per shift, expenses, suppliers & bills, P&L, **VAT report** (output VAT from invoices, input VAT from bills/expenses, per quarter, CSV/XLSX), payout statements |
| Reports | Best sellers, peak hours heatmap, sales by staff, by channel, discounts & voids report, food cost % |
| Settings (super admin) | Platform config; **secrets are write-only fields** ("•••• set 12 Sep") |
| Audit log | Filter by actor, action, entity, date |

All tables: server-side pagination, sort, search, column chooser, CSV export (up to 50k rows via worker job + download link).

## 12. Owner app (`apps/owner`, phase 10)

Today (sales, orders, AOV per branch and channel, live), Approvals (refunds/discounts above limit: approve/decline in ≤ 2 taps, 5-min expiry), Alerts (refund > X, void, cash variance > X, low stock, restaurant closed during hours), Finance (P&L, VAT due, unpaid bills), Branch controls (open/close, 86 items). Biometric unlock.

## 13. Notifications matrix

| Event | Customer | Store/POS | Rider | Owner | Channel |
| --- | --- | --- | --- | --- | --- |
| Order placed | ✓ confirmation | ✓ loud ring | | | push, socket |
| Accepted (with ETA) | ✓ | | | | push |
| Rejected / cancelled | ✓ with reason + refund note | ✓ | ✓ if assigned | | push, email |
| Ready for pickup | ✓ (pickup orders) | | ✓ | | push |
| Offer to riders | | | ✓ zone riders | | push, socket |
| Rider assigned / picked | ✓ | ✓ | | | push |
| Delivered | ✓ + rate prompt | | | | push |
| Call waiter / bill requested | | ✓ POS | | | socket |
| Refund/void/discount above limit | | | | ✓ approval | push |
| Cash variance, low stock | | | | ✓ | push, email digest |
| Payment receipt / tax invoice | ✓ | | | | email |

## 14. Error code → message map (shared `packages/i18n`)

`UNAUTHENTICATED` → "Please sign in again" · `FORBIDDEN` → "You don't have access to this" · `RESTAURANT_CLOSED` → "This restaurant just closed. You can schedule for later." · `ITEM_UNAVAILABLE` → "{item} just sold out" · `OUT_OF_ZONE` → "We don't deliver here yet" · `MIN_ORDER` → "Add AED {x} more to order" · `PRICE_CHANGED` → "Prices were updated. Please review your total." · `COUPON_INVALID` · `PAYMENT_FAILED` → "Payment didn't go through. You haven't been charged." · `ORDER_STATE_CHANGED` → "This order was updated by someone else" (auto-refresh) · `RATE_LIMITED` → "Too many tries. Try again in {n} s" · `PIN_LOCKED` · `SHIFT_NOT_OPEN` · `OFFLINE_NOT_ALLOWED`.

## 15. Frontend quality gates (every PR)

Typecheck, ESLint (incl. RTL class rule, `no-restricted-globals` fixed for browser APIs), unit tests (Vitest/Jest), Playwright on web/pos/admin preview URLs for the demo flows, Maestro flows for mobile (P1), Lighthouse CI budget on web home + restaurant page, and an automated **"no Enatega string"** check (`rg -i "enatega|ninjascode"` excluding LICENSE files) that must return nothing.
