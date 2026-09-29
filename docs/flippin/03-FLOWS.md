# Flippin — Flow Document

Companion to [01-PRD.md](01-PRD.md) and [02-FEATURES.md](02-FEATURES.md). Diagrams are Mermaid (render on GitHub, VS Code, Obsidian).

## Index
| ID | Flow | Actors |
|---|---|---|
| F-00 | System architecture | all |
| F-01 | First launch & onboarding | Customer |
| F-02 | Authentication | Customer / all |
| F-03 | Address & zone detection | Customer, API |
| F-04 | Browse → cart → checkout | Customer |
| F-05 | Scheduled order | Customer, API |
| F-06 | Payment (Moyasar / COD / wallet) | Customer, API, Moyasar |
| F-07 | Order lifecycle (state machine) | all |
| F-08 | Vendor order handling | Store |
| F-09 | Rider dispatch & delivery | Rider, API, Admin |
| F-10 | Chat | Customer ↔ Rider |
| F-11 | Cancellation | Customer, Store, Admin |
| F-12 | Grocery substitution | Store, Customer |
| F-13 | Refund | Admin, API, Moyasar |
| F-14 | Ratings & reviews | Customer |
| F-15 | Invoice & ZATCA QR | API |
| F-16 | Support ticket | Customer, Admin |
| F-17 | Account deletion / data export (PDPL) | Customer, API |
| F-18 | Vendor / store onboarding | Vendor, Admin |
| F-19 | Money: ledger, COD settlement, payouts | API, Admin, Rider, Store |
| F-20 | Rider onboarding | Rider, Admin |
| F-21 | Notifications matrix | API |
| F-22 | Rebrand & release pipeline | Developer |

---

## F-00 System architecture

```mermaid
flowchart LR
  subgraph Clients
    CA[flippin-app<br/>Expo]:::c
    CW[flippin-web<br/>Next.js]:::c
    SA[flippin-store<br/>Expo]:::c
    RA[flippin-rider<br/>Expo]:::c
    AD[flippin-admin<br/>Next.js]:::c
  end
  subgraph OracleVM["Oracle Always-Free VM (Coolify)"]
    CADDY[Caddy / Traefik TLS]
    API[flippin-api<br/>Apollo GraphQL + graphql-ws]
    WK[Workers<br/>BullMQ jobs]
    MDB[(MongoDB)]
    RDS[(Redis<br/>cache · pubsub · queues)]
  end
  CF[Cloudflare DNS/CDN]
  R2[(Cloudflare R2<br/>images · backups)]
  MOY[Moyasar<br/>mada/ApplePay/STCPay]
  PUSH[Expo Push / FCM]
  MAIL[Resend email]
  SMS[SMS OTP provider]
  MAPS[Google Maps / OSM]
  OBS[Sentry · PostHog · UptimeRobot]

  Clients --> CF --> CADDY --> API
  API <--> MDB
  API <--> RDS
  WK <--> RDS
  WK <--> MDB
  API --> R2
  API <--> MOY
  MOY -- webhook --> API
  WK --> PUSH & MAIL & SMS
  Clients --> MAPS
  Clients & API --> OBS
  classDef c fill:#001B0A,color:#00FD54,stroke:#00FD54
```

## F-01 First launch & onboarding

```mermaid
flowchart TD
  A[Open app] --> B{Version OK?}
  B -- no --> B1[Force update screen]
  B -- yes --> C[Pick language AR/EN<br/>default = device, AR if SA]
  C --> D[Ask location permission]
  D -- granted --> E[Get GPS → reverse geocode]
  D -- denied --> F[Search address manually / pick on map]
  E --> G[F-03 zone check]
  F --> G
  G -- served --> H[Home: Restaurants tab]
  G -- not served --> I[Not in your area yet<br/>join waitlist]
  H --> J{Logged in?}
  J -- no --> K[Browse as guest<br/>login asked at checkout]
  J -- yes --> L[Personalised home]
```

## F-02 Authentication

```mermaid
sequenceDiagram
  actor U as User
  participant App
  participant API as flippin-api
  participant P as Google/Apple
  participant M as Email/SMS
  U->>App: Choose method
  alt Google / Apple
    App->>P: Native sign-in
    P-->>App: ID token
    App->>API: loginWithProvider(idToken)
    API->>P: Verify token signature
  else Email OTP (free)
    App->>API: sendOtp(email)
    API->>M: Email 6-digit code (Resend)
    U->>App: Enter code
    App->>API: verifyOtp(email, code)
  else Phone OTP (paid SMS)
    App->>API: sendOtp(phone)
    API->>M: SMS code (rate-limited 3/15 min)
    U->>App: Enter code
    App->>API: verifyOtp(phone, code)
  end
  API-->>App: accessToken (15 min) + refreshToken (30 d, rotating)
  App->>API: registerDevice(pushToken)
  Note over App,API: On 401 → refreshToken mutation → retry once → else logout
```

Rules: OTP 6 digits, 5-minute expiry, 5 attempts, then 15-minute lock. Phone must be verified before first COD order. Riders/stores/admins use credentials created by admin (+ admin 2FA).

## F-03 Address & zone detection

```mermaid
flowchart TD
  A[Lat/Lng] --> B[API: zoneFor point<br/>MongoDB $geoIntersects on zones]
  B -- none --> C[Not served → waitlist]
  B -- zone Z --> D[Vendors: active, in Z,<br/>within delivery radius,<br/>open now or schedulable]
  D --> E[Compute per-vendor ETA & fee<br/>distance × zone rules]
  E --> F[Home rails & category tabs]
```

## F-04 Browse → cart → checkout

```mermaid
flowchart TD
  H[Home] --> V[Vendor page]
  S[Search] --> V
  V --> I[Item sheet: variation, add-ons, required options]
  I -->|Add| C{Cart has other vendor?}
  C -- yes --> C1[Confirm: replace cart?]
  C -- no --> CT[Cart]
  C1 --> CT
  CT --> CO[Checkout]
  CO --> A1[Delivery or pickup]
  A1 --> A2[Address · ASAP/scheduled]
  A2 --> A3[Voucher · tip · notes · cutlery]
  A3 --> A4[API: priceQuote → server-calculated totals incl. VAT]
  A4 --> A5{Logged in & phone verified if COD?}
  A5 -- no --> L[F-02 login] --> A4
  A5 -- yes --> P[F-06 payment]
  P -- success --> O[Order placed → F-07]
  P -- fail --> CO
```

Server validation on `placeOrder`: vendor open/not paused, items available, options valid, min order, zone, coupon valid, price matches quote (else return new quote), COD limit, idempotency key.

## F-05 Scheduled order

```mermaid
flowchart LR
  A[Customer picks slot<br/>≥ 45 min ahead, within vendor hours] --> B[Order status SCHEDULED<br/>payment captured or COD]
  B --> C[BullMQ job at slot − prep time − 15 min]
  C --> D{Vendor open?}
  D -- yes --> E[Status PENDING → F-08]
  D -- no --> F[Auto-cancel + full refund + notify]
```

## F-06 Payment

```mermaid
sequenceDiagram
  actor U as Customer
  participant App
  participant API
  participant MOY as Moyasar
  App->>API: placeOrder(cart, method, idempotencyKey)
  API->>API: Re-price, validate, create order (status PENDING_PAYMENT or PENDING)
  alt Card / mada / Apple Pay / STC Pay
    API-->>App: paymentIntent (amount halalas, orderId, publishable key)
    App->>MOY: Moyasar form / Apple Pay sheet (3-D Secure)
    MOY-->>App: redirect / callback with paymentId
    MOY->>API: Webhook payment_paid (signed)
    API->>API: Verify signature + fetch payment from Moyasar + amount match
    API->>API: Order → PENDING, ledger entries, publish SubscribePlaceOrder
    API-->>App: SingleVendorPaymentSuccess / order status
  else Cash on delivery
    API->>API: Check COD limit & phone verified → Order PENDING
  else Wallet
    API->>API: Debit wallet (ledger) → rest via card/COD if partial
  end
  Note over API: Unpaid card orders expire after 15 min → CANCELLED (no charge)
```

Never mark paid from client callback alone — only after webhook or server-side fetch.

## F-07 Order lifecycle (state machine)

Statuses kept compatible with existing apps: `SCHEDULED, PENDING, ACCEPTED, ASSIGNED, PICKED, DELIVERED, COMPLETED, CANCELLED, CANCELLEDBYREST, REFUNDED`. "Ready" is stored as timestamp `readyAt` (no new status → no client breakage).

```mermaid
stateDiagram-v2
  [*] --> SCHEDULED: scheduled order
  [*] --> PENDING: ASAP order paid / COD
  SCHEDULED --> PENDING: job fires
  SCHEDULED --> CANCELLED: customer / vendor closed
  PENDING --> ACCEPTED: store accepts (prep time)
  PENDING --> CANCELLEDBYREST: store rejects / timeout
  PENDING --> CANCELLED: customer cancels (free)
  ACCEPTED --> ASSIGNED: rider accepts offer
  ACCEPTED --> PICKED: pickup order collected / own-delivery
  ASSIGNED --> PICKED: handshake code at store
  ASSIGNED --> ACCEPTED: rider unassigned (re-dispatch)
  PICKED --> DELIVERED: rider delivers (photo/OTP)
  DELIVERED --> COMPLETED: after 24 h, no dispute → settle
  ACCEPTED --> CANCELLED: admin only
  ASSIGNED --> CANCELLED: admin only
  CANCELLED --> REFUNDED: prepaid → refund
  CANCELLEDBYREST --> REFUNDED
  DELIVERED --> REFUNDED: partial/complete refund via support
```

Every transition: validated by role, written to `order.statusHistory`, published on `SubscriptionOrder` / `SubscriptionOrderTracking`, triggers F-21 notifications, and logged in audit if done by admin.

## F-08 Vendor order handling

```mermaid
flowchart TD
  N[New order PENDING] --> AL[Store app: loud repeating alert + push]
  AL --> D{Action within 3 min?}
  D -- accept --> T[Set prep time 10–60 min] --> ACC[ACCEPTED → dispatch starts F-09<br/>timed so rider arrives at readyAt]
  D -- reject --> R[Reason: busy / item out / closing] --> CR[CANCELLEDBYREST → F-13 refund]
  D -- timeout --> TO[Auto-reject + admin alert + store set to busy]
  ACC --> RD[Mark ready → readyAt]
  RD --> HS[Rider shows code → store confirms handshake] --> PK[PICKED]
```

## F-09 Rider dispatch & delivery

```mermaid
sequenceDiagram
  participant API
  participant R as Rider app
  participant S as Store app
  actor C as Customer
  API->>API: On ACCEPTED: schedule dispatch at readyAt − travel time
  loop Until assigned (max 5 rounds)
    API->>API: Find online riders in zone, not busy, nearest by road ETA
    API->>R: SubscriptionZoneOrders / push offer (30 s)
    alt Rider accepts
      R->>API: assignOrder
      API->>API: ASSIGNED (atomic, first wins)
    else Declines / timeout
      API->>API: Next rider
    end
  end
  Note over API: No rider after 5 rounds → Admin dispatch alert (SubscriptionDispatcher)
  R->>API: Location every 5–10 s (SubscriptionRiderLocation → customer)
  R->>S: Arrive, show handshake code
  S->>API: StoreOrderHandshake confirm → PICKED
  R->>C: Deliver (collect cash if COD)
  R->>API: markDelivered (+ photo / customer OTP if > SAR 300)
  API->>C: DELIVERED → ask rating
```

Own-delivery stores (S-18): store staff account acts as rider for its own orders; dispatch step skipped.

## F-10 Chat

```mermaid
flowchart LR
  C[Customer] -- sendChatMessage --> API --> P[(messages by orderId)]
  API -- SubscriptionNewMessage --> R[Rider]
  R -- reply --> API -- SubscriptionNewMessage --> C
  API -. push if app backgrounded .-> C & R
```
Chat open from ASSIGNED to DELIVERED + 1 h; read-only after. Phone numbers hidden in text (regex mask) — P2 masked calling.

## F-11 Cancellation policy

| When | Who | Result |
|---|---|---|
| PENDING (before accept) | Customer | Free cancel, full refund |
| ACCEPTED / ASSIGNED | Customer | Request → support; vendor may charge food cost (admin decides) |
| Any before PICKED | Store | Allowed with reason → full refund, store penalty counter |
| Any | Admin | Allowed, choose refund amount + who bears cost (platform/store/rider) |
| PICKED onward | — | No cancel; use F-16 problem report |

## F-12 Grocery substitution

```mermaid
flowchart TD
  A[Store picking items] --> B{Item unavailable?}
  B -- no --> Z[Continue]
  B -- yes --> C{Customer preference}
  C -- replace similar --> D[Store picks replacement ≤ original price +10%] --> E[Customer notified, can reject in 5 min]
  C -- call me --> F[Store calls / chat] --> G[Agreed item or remove]
  C -- refund item --> H[Remove item]
  E & G & H --> I[API re-prices order; difference refunded to original method / wallet]
```

## F-13 Refund

```mermaid
flowchart LR
  T[Trigger: cancel / reject / support] --> A[Admin or rule decides amount]
  A --> B{Paid by}
  B -- card/mada/ApplePay --> M[Moyasar refund API] --> W[Webhook refunded]
  B -- wallet --> WL[Credit wallet]
  B -- COD not yet paid --> N[No money movement]
  M & WL --> L[Ledger: reverse entries, set cost bearer] --> S[Order REFUNDED + notify customer]
```
Default for support complaints: instant wallet credit (fast, no gateway fee); card refund on request.

## F-14 Ratings & reviews
DELIVERED → push "Rate your order" → rate vendor (1–5 + tags + comment) and rider (1–5 + tags) → vendor rating = rolling average of last 200; ratings ≤ 2 open an auto support ticket; reviews moderated (profanity filter, admin hide).

## F-15 Invoice & ZATCA QR

```mermaid
flowchart LR
  D[DELIVERED] --> N[Sequential invoice no. per seller]
  N --> T[Build TLV: 1 seller name · 2 VAT no. · 3 ISO timestamp · 4 total incl. VAT · 5 VAT amount]
  T --> Q[Base64 → QR code]
  Q --> P[Receipt page + PDF in R2 + email via Resend]
```
Two invoices when needed: vendor → customer (food) and Flippin → customer (delivery/service fees); Flippin → vendor (commission) monthly. Confirm model with accountant. Phase 2 (Fatoora API clearance/reporting) in plan Phase 6.

## F-16 Support ticket
Customer: Order → "Report a problem" → pick reason (missing item, wrong item, late, quality, rider behaviour, other) → photo optional → ticket created with order snapshot → auto-rules (e.g. missing item ≤ SAR 30 → instant wallet credit) → else admin queue → admin chats, resolves (refund F-13 / credit / reject) → customer notified → CSAT thumbs up/down.

## F-17 Account deletion & data export (PDPL)
Request in app → re-authenticate → 14-day grace (login cancels) → job: anonymise user (name → "Deleted user", phone/email hashed), delete addresses, tokens, devices; keep orders/invoices for tax retention period (anonymised) → confirmation email. Export: job builds JSON (profile, addresses, orders) → signed R2 link emailed, expires in 7 days.

## F-18 Vendor / store onboarding

```mermaid
flowchart TD
  A[Web: Partner with Flippin form] --> B[Lead in admin]
  B --> C[Admin call + contract + commission agreed]
  C --> D[Collect: CR, VAT no., Balady/SFDA licence, IBAN, logo, menu]
  D --> E[Admin creates vendor + store, zone, hours, commission]
  E --> F[Menu entered by admin/vendor or CSV import]
  F --> G[Test order on staging]
  G --> H[Store goes live — appears in discovery]
```

## F-19 Money: ledger, COD settlement, payouts

Double-entry ledger accounts per order: `customer`, `vendor:{id}`, `rider:{id}`, `platform:commission`, `platform:fees`, `vat:payable`, `gateway:clearing`, `rider:cash_held`.

```mermaid
flowchart TD
  O[COMPLETED order] --> V[Vendor earns: food total − commission − store coupons]
  O --> R[Rider earns: base + km + tip]
  O --> P[Platform: commission + delivery/service fees − platform coupons]
  COD[COD order] --> CH[Rider cash_held += order total]
  CH --> RS[Rider settles: deposit cash / netted from earnings]
  V & R --> W[Wallet balance]
  W --> WR[Withdrawal request → IBAN]
  WR --> AP{Admin approve}
  AP -- yes --> BT[Manual bank transfer weekly<br/>mark paid + reference]
  AP -- no --> RJ[Reject with reason]
```
Riders with cash_held > SAR 1,000 stop receiving COD orders until settled.

## F-20 Rider onboarding
Web `/rider` form → lead → documents (Iqama/ID, licence, vehicle registration, freelance permit / company letter per TGA rules, IBAN, photo) → admin verifies → account created, zone + vehicle set → training checklist in app → first shift. Documents expiry tracked; expired → auto offline.

## F-21 Notifications matrix

| Event | Customer | Store | Rider | Admin |
|---|---|---|---|---|
| Order placed | push + in-app | alarm + push | — | live board |
| Accepted (ETA) | push | — | — | — |
| Rejected / timeout | push + refund note | — | — | alert (timeout) |
| Rider offer | — | — | push + sound | — |
| No rider found | — | — | — | alert |
| Rider assigned | push | in-app | — | — |
| Picked up | push | — | — | — |
| Near you (≤ 500 m) | push | — | — | — |
| Delivered | push + e-receipt email | in-app | — | — |
| Chat message | push if bg | — | push if bg | — |
| Refund issued | push + email | — | — | — |
| Withdrawal processed | — | push | push | — |
| Payment webhook failure | — | — | — | email alert |

## F-22 Rebrand & release pipeline

```mermaid
flowchart LR
  A[Branch rebrand/flippin] --> B[Scripted rename<br/>folders · packages · ids · urls]
  B --> C[Manual review: translations, legal, assets]
  C --> D[Replace secrets → env]
  D --> E[CI: typecheck · lint · test · schema-compat · build]
  E --> F[grep -ri enatega = only LICENSE/NOTICE]
  F --> G[Merge → Coolify deploy staging]
  G --> H[EAS build preview → internal testers]
  H --> I[Prod: web/admin via Coolify, apps via EAS submit]
```
