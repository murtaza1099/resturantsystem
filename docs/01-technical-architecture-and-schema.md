# 01 — Technical Architecture & Schema

Flippin · v1.0 · 27 Sep 2026 · Decisions locked: Oracle Cloud for the API, Supabase Postgres, Stripe only, POS on PC + Android tablet (browser), multi-restaurant admin only.

## 1. System at a glance

```
 CLIENTS                                   ORACLE CLOUD VM (Always Free, Ubuntu 24.04 ARM)        MANAGED SERVICES
 ┌───────────────────────┐                ┌──────────────────────────────────────────┐        ┌────────────────────────┐
 │ apps/web (Next 16)    │──HTTPS/WSS────▶│ Caddy (TLS, reverse proxy, :443)         │        │ Supabase Postgres 17   │
 │ apps/admin (Next 16)  │                │   ├─ /graphql  (HTTP + graphql-ws)       │──SQL──▶│  (session pooler 5432) │
 │ apps/pos  (Next 16)   │                │   ├─ /rest/*   (Stripe, uploads, pdf)    │        └────────────────────────┘
 │   /pos /kds /t /pickup│                │   └─ /health                             │        ┌────────────────────────┐
 │ apps/customer (Expo)  │                │ services/api  (Node 22, Apollo Server 5) │──────▶ │ Stripe (Checkout, hooks)│
 │ apps/rider    (Expo)  │                │ services/worker (BullMQ jobs)            │──────▶ │ Cloudinary (images)     │
 │ apps/store    (Expo)  │                │ Redis 7 (pub/sub, rate limits, queues)   │──────▶ │ FCM / Expo Push         │
 │ apps/owner    (Expo)  │                │ Docker Compose, systemd, fail2ban        │──────▶ │ Resend (email)          │
 └───────────────────────┘                └──────────────────────────────────────────┘        │ Google Maps             │
 Print bridge (optional, on the POS PC) ◀── WebSocket localhost ── apps/pos                    │ Sentry, PostHog         │
                                                                                               │ Oracle Object Storage   │
                                                                                               │  (nightly DB backups)   │
                                                                                               └────────────────────────┘
```

Rules:
1. **No app talks to the database.** Every client talks only to `api.flippin.app`. No Supabase key exists in any app.
2. **One source of truth for money, tax and order status:** `packages/core`, imported by the API and by the POS (for offline totals).
3. **The GraphQL contract is fixed by the existing apps.** The server adapts to the apps, never the other way round, except for the listed bug fixes.

## 2. Monorepo layout

```
flippin/
├─ apps/
│  ├─ web/            # customer website (from enatega-multivendor-web)
│  ├─ admin/          # super admin + owner + manager web (from enatega-multivendor-admin)
│  ├─ pos/            # NEW: /pos, /kds, /t/[token], /pickup  (Next.js 16 PWA)
│  ├─ customer/       # Expo (from enatega-multivendor-app)
│  ├─ rider/          # Expo (from enatega-multivendor-rider)
│  ├─ store/          # Expo (from enatega-multivendor-store)
│  └─ owner/          # NEW Expo, phase 10
├─ services/
│  ├─ api/            # Apollo Server + Fastify REST
│  ├─ worker/         # BullMQ jobs (push, email, receipts, scheduled orders, backups)
│  └─ print-bridge/   # tiny Node app for raw ESC/POS on the POS PC (P1)
├─ packages/
│  ├─ core/           # money, tax, charges, order state machine, invoice numbering (pure TS, 100% unit tested)
│  ├─ schema/         # schema.graphql + generated TS types (graphql-codegen)
│  ├─ db/             # SQL migrations (Supabase CLI format), seed, Kysely types
│  ├─ ui-tokens/      # colours, type, spacing → Tailwind + NativeWind presets
│  ├─ i18n/           # shared en/ar strings for new screens
│  └─ config/         # eslint, tsconfig, prettier
├─ infra/
│  ├─ docker-compose.yml   # api, worker, redis, caddy
│  ├─ Caddyfile
│  └─ scripts/             # backup.sh, keepalive.sh, deploy.sh
├─ docs/                   # these documents
└─ .github/workflows/      # ci.yml, deploy-api.yml, eas-preview.yml
```

Tooling: **pnpm workspaces + Turborepo**. Each Expo app keeps its own SDK version until ticket FE-012 aligns them all on Expo 54.

## 3. Technology choices

| Layer | Choice | Why | Free? |
| --- | --- | --- | --- |
| Runtime | Node.js 22 LTS, TypeScript 5.9, ESM | LTS until 2027; matches app tooling | Yes |
| GraphQL | Apollo Server 5 on Fastify 5 (`@as-integrations/fastify`) | Apps use Apollo Client 3 | Yes |
| Subscriptions | `graphql-ws` on the same port, path `/graphql` | Apps already use `graphql-ws` / `subscriptions-transport-ws` (check per app, API-004) | Yes |
| Pub/sub | Redis 7 (`graphql-redis-subscriptions`) | Lets you run 2 API processes later; no LISTEN/NOTIFY needed | Yes (self-hosted) |
| DB access | **Kysely** (typed SQL) + `pg` | Plain SQL, easy row locks (`FOR UPDATE`), no ORM magic around money | Yes |
| Migrations | Supabase CLI (`supabase/migrations/*.sql`) | Local Postgres via `supabase start`, same SQL in prod | Yes |
| Validation | Zod on every input | Shared with the POS | Yes |
| Jobs | BullMQ on Redis | Retries, delays (scheduled orders, OTP expiry, receipts) | Yes |
| Auth | `jose` (JWT, EdDSA keys), `@node-rs/argon2`, `otplib` (TOTP) | Fast, audited | Yes |
| Payments | Stripe Checkout (hosted) + webhooks; Stripe Terminal later | Existing apps already open Checkout | Test mode free |
| Images | Cloudinary signed uploads | Existing apps already upload there | Free plan |
| Push | Expo Push Service (wraps FCM/APNs) | Expo apps already use `expo-notifications` | Yes |
| Email | Resend | 3,000/month free | Yes |
| PDF | `@react-pdf/renderer` in the worker | Arabic font (Noto Naskh Arabic / IBM Plex Sans Arabic) embedded | Yes |
| Maps | Google Maps (existing code) | Keys restricted per app | 10k calls/SKU/month |
| Errors | Sentry | 5k errors/month | Yes |
| Analytics | PostHog | 1M events/month | Yes |
| Web hosting | Vercel Hobby (demo), Pro when commercial | Next.js native | Yes (demo) |
| API hosting | Oracle Cloud Always Free VM | Your choice; always on; you learn Linux, Docker, TLS | Yes |

## 4. Oracle Cloud: what to do, and when

Do nothing on Oracle until **ticket INF-001** (phase 1, after the schema exists). Until then everything runs on your laptop with `docker compose up`.

### Step 1: Account (do this in phase 0, it can take days)
1. Sign up at cloud.oracle.com. A card is needed for verification only.
2. **Home region:** pick **UAE East (Dubai)** for the lowest latency to customers. If the A1 (ARM) shape shows "out of capacity" for days, the Always Free A1 shape is only available in your home region, and you **cannot change the home region later**. Pick **Germany Central (Frankfurt)** or **UK South (London)** if Dubai has no A1 capacity. Supabase must be in the **same region family** (Supabase has Frankfurt `eu-central-1` and London `eu-west-2`, plus Mumbai `ap-south-1`; no UAE region). **Recommendation: Oracle Frankfurt + Supabase Frankfurt** (≈ 110 ms to Dubai users; DB calls stay within Frankfurt, under 5 ms).
3. Upgrade to **Pay As You Go** once it is active. Always Free resources stay free, and PAYG accounts are not subject to idle-instance reclamation. Then set a **Budget** of $1 with an email alert at 50%.

### Step 2: Network (INF-001)
1. Networking → Virtual Cloud Networks → "Start VCN Wizard" → *VCN with Internet Connectivity*.
2. Security List for the public subnet: allow ingress TCP **22** (your IP only), **80**, **443** from `0.0.0.0/0`. Nothing else.

### Step 3: VM (INF-001)
1. Compute → Instances → Create. Image **Canonical Ubuntu 24.04 (aarch64)**. Shape **VM.Standard.A1.Flex, 2 OCPU, 12 GB** (or whatever the Always Free limit shows). Boot volume 100 GB.
2. Paste your SSH public key. Assign a public IPv4. Reserve it (Networking → Reserved IPs) so it never changes.
3. On the VM:
   ```bash
   sudo apt update && sudo apt -y upgrade
   sudo apt -y install docker.io docker-compose-v2 fail2ban unattended-upgrades
   sudo usermod -aG docker ubuntu
   # Oracle Ubuntu images ship iptables rules that block 80/443 even when the security list allows them:
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
4. Turn off SSH password login (`PasswordAuthentication no`), keep key-only.

### Step 4: DNS and TLS (INF-002, needs the domain)
1. At your DNS provider: `A api.flippin.app → <reserved IP>`.
2. Caddy obtains and renews Let's Encrypt certificates automatically:
   ```
   api.flippin.app {
     encode zstd gzip
     reverse_proxy /graphql* api:4000
     reverse_proxy /rest/*   api:4000
     reverse_proxy /health   api:4000
     header { Strict-Transport-Security "max-age=31536000; includeSubDomains" -Server }
   }
   ```
   No domain yet? Use `<ip>.sslip.io` as a temporary hostname.

### Step 5: Deploy (INF-003)
- GitHub Actions builds `linux/arm64` images, pushes them to **GHCR** (free), then SSHes into the VM and runs `docker compose pull && docker compose up -d`.
- `restart: unless-stopped` on every container; `/health` checked by Docker healthcheck **and** by UptimeRobot (free, 5-minute interval), which also keeps things warm.

### Step 6: Backups and keep-alive (INF-004)
- `backup.sh` (cron, 02:00 GST): `pg_dump --format=custom` via the session pooler → `oci os object put` to an Always Free Object Storage bucket, keep 14 daily + 8 weekly copies. Monthly: restore test into a local Postgres.
- `keepalive.sh` (cron, daily): one request to the Supabase project so the free project never hits the 7-day idle pause.

### Step 7: When to pay (not before)
| Trigger | Upgrade |
| --- | --- |
| First paying buyer or real restaurant | Supabase Pro ($25), Vercel Pro ($20) |
| iOS demo on real iPhones | Apple Developer ($99/yr) |
| More than ~300 concurrent sockets or CPU > 70% sustained | Second VM + Oracle free load balancer |

## 5. API design

### 5.1 Endpoints
| Path | Protocol | Purpose |
| --- | --- | --- |
| `/graphql` | HTTP POST | All queries and mutations used by the apps |
| `/graphql` | WebSocket (`graphql-transport-ws`, and `graphql-ws` legacy if any app needs it) | Subscriptions. Auth in `connectionParams.authorization` |
| `/rest/stripe/create-checkout-session?id=<orderId>` | GET → 303 redirect | Used by customer app webview (existing code) |
| `/rest/stripe/create-web-checkout-session` | POST | Used by web (existing code) |
| `/rest/stripe/success`, `/rest/stripe/cancel` | GET | Landing pages the webview watches for |
| `/rest/stripe/webhook` | POST (raw body) | **Only** place that marks an order paid |
| `/rest/stripe/account` | GET/POST | Stripe Connect onboarding link for restaurants (P2; stub until then) |
| `/rest/uploads/sign` | POST | Returns Cloudinary signature for an authenticated upload |
| `/rest/receipts/:invoiceId.pdf` | GET (signed URL, 15 min) | Tax invoice PDF |
| `/rest/qr/:tableToken.png` | GET (admin) | Table QR image |
| `/health`, `/ready` | GET | Liveness (process up) / readiness (DB + Redis reachable) |

Existing apps read `SERVER_REST_URL` and append paths **without** `/rest/`. Caddy therefore also maps `/stripe/*` → `/rest/stripe/*` so no app code has to change.

### 5.2 Compatibility layer (the most important engineering decision)
The ~400 operations in the apps are the contract.

1. **API-001 extractor** (`packages/schema/scripts/extract.ts`): walks all six apps, parses every `gql` template with `@graphql-tools/graphql-tag-pluck`, writes `operations/*.graphql` with the source file noted.
2. **Schema by inference + hand review:** output types come from the selection sets, input types from variable definitions (`$input: OrderInput!`). Scalar types that can't be inferred default to `String` and are fixed by hand. Result: `packages/schema/schema.graphql`.
3. **Gate:** `graphql-inspector validate 'operations/**/*.graphql' schema.graphql` returns 0 errors in CI.
4. **Auto-stubs:** a resolver-default plugin answers any unimplemented field with a type-correct empty value (`[]`, `null`, `false`, `0`, `""` for non-null strings) and logs `stub_hit{operation,field}` to Sentry/PostHog. The demo script must produce **zero** stub hits on the demo paths.
5. **ID mapping:** every type has `_id: ID!` resolved from the `id uuid` column. Never expose sequential integers except display numbers (`orderId: "FL-000123"`).
6. **Money mapping:** DB stores integer fils (`bigint`); GraphQL returns `Float` in AED (`amount / 100`), because the apps expect floats. All server math is in integers; conversion happens only in the resolver layer via `core/money.toMajor()`.
7. **Status mapping:** see §6.3.
8. **Dead-field policy:** fields the apps request but Flippin doesn't use (e.g. `webAmplitudeApiKey`) resolve to `null`/`""`.

### 5.3 Resolver structure
```
services/api/src/
  modules/<domain>/{schema-ext.graphql, resolvers.ts, service.ts, repo.ts, policy.ts, *.test.ts}
  domains: auth, users, config, restaurants, menu, cart, checkout, orders, dispatch, riders,
           pos, kds, tables, payments, invoices, finance, loyalty, plans, inventory, reports, admin, audit
  plugins/ {auth-context, rbac-directive, depth-cost-limit, stub-default, request-id, error-mask}
```
- `repo.ts`: SQL only. `service.ts`: business rules, transactions. `policy.ts`: who may do it. `resolvers.ts`: thin mapping.
- Every mutation that creates money or state takes an optional `idempotencyKey` (header `Idempotency-Key` for REST; new POS mutations take it as an argument). Stored in `idempotency_keys` for 24 h.

### 5.4 Realtime channels (Redis pub/sub topics)
| Topic | Published when | Subscribers |
| --- | --- | --- |
| `order:{orderId}` | any change to that order | customer tracking, QR guest |
| `restaurant:{id}:orders` | new / changed order for restaurant | store app, POS, admin |
| `restaurant:{id}:kds:{station}` | ticket item status change | KDS screens |
| `restaurant:{id}:tables` | table state change | POS floor map |
| `restaurant:{id}:pickup` | order READY / collected | pickup TV |
| `zone:{id}:offers` | order ready for dispatch | online riders in zone |
| `rider:{id}` | assignment, cancellation | rider app |
| `order:{id}:chat` | new chat message | rider + customer |
| `rider:{id}:location` | location update (throttled 10 s) | customer tracking, admin map |
| `owner:{id}:alerts` | alert row inserted | owner app, admin |

Each subscription resolver runs `policy.canSubscribe(ctx, args)` **before** attaching. Payloads are re-read from the DB after the event, never trusted from the message.

### 5.5 Background jobs (services/worker)
`push.send`, `email.send`, `invoice.render_pdf`, `order.scheduled_release` (moves scheduled orders to PENDING at `scheduled_for − prep time`), `order.auto_cancel_unaccepted` (after N min), `dispatch.reoffer` (widen radius every 60 s), `loyalty.credit`, `stock.deduct`, `report.daily_rollup` (03:00 GST), `backup.verify`, `demo.reset`.

## 6. Order lifecycle

### 6.1 Canonical states (stored in `orders.status`)
```
DELIVERY / PICKUP lane
PENDING ─accept─▶ ACCEPTED ─kds start─▶ PREPARING ─kds ready─▶ READY ─rider assigned─▶ ASSIGNED ─picked─▶ PICKED ─delivered─▶ DELIVERED ─(auto, rating window)─▶ COMPLETED
   │                  │                                   │ (pickup: customer collects) ─────────────────────────────────────▶ COMPLETED
   └─reject─▶ CANCELLED (reason, actor)   any state before PICKED ─cancel─▶ CANCELLED (refund rules)

DINE-IN / QR lane (orders.type = dine_in | qr)
OPEN ─fire─▶ ACCEPTED ─▶ PREPARING ─▶ READY ─▶ SERVED ─(more items: stays SERVED, new ticket)─▶ BILL_REQUESTED ─paid in full─▶ COMPLETED
   └─void (manager PIN)─▶ CANCELLED
```
Note: rider assignment can happen **before** READY (rider drives while food cooks). `ASSIGNED` is then a flag (`rider_id` set) while status stays `PREPARING/READY`; the transition to `PICKED` requires `status = READY`.

### 6.2 Transition table (enforced in `packages/core/orderMachine.ts`)
| From | To | Who | Side effects |
| --- | --- | --- | --- |
| PENDING | ACCEPTED | store/POS/manager | set `prep_minutes`, create KDS tickets, push customer |
| PENDING | CANCELLED | store (reject), customer (within 60 s), system (auto-cancel) | refund if paid, release stock |
| ACCEPTED | PREPARING | KDS (first item started) | — |
| PREPARING | READY | KDS (all items ready) | pickup TV, dispatch offer if delivery and no rider |
| READY/PREPARING | (rider_id set) | rider accept (atomic) | push customer |
| READY | PICKED | rider | start live tracking |
| PICKED | DELIVERED | rider | cash collected recorded for COD, rider earning row |
| DELIVERED | COMPLETED | system after 2 h | loyalty credit, stock final |
| READY | COMPLETED | POS/store (pickup handed over) | loyalty credit |
| READY | SERVED | waiter | — |
| SERVED | BILL_REQUESTED | waiter / QR guest | POS alert |
| BILL_REQUESTED | COMPLETED | cashier when `amount_paid ≥ total` | tax invoice issued, table → free |
| any non-final | CANCELLED | manager PIN (POS) / admin | audit log, credit note if invoiced |

Every transition writes `order_status_events` inside the **same transaction** as the update, using `UPDATE orders SET status=$to WHERE id=$id AND status=$from` (0 rows → conflict error `ORDER_STATE_CHANGED`).

### 6.3 Wire mapping for existing apps (`orderStatus` field)
| Canonical | Sent to existing apps | Extra fields |
| --- | --- | --- |
| PENDING | `PENDING` | |
| ACCEPTED, PREPARING, READY (no rider) | `ACCEPTED` | `preparationStatus`, `isReady` |
| any with rider, before PICKED | `ASSIGNED` | |
| PICKED | `PICKED` | |
| DELIVERED | `DELIVERED` | |
| COMPLETED | `COMPLETED` (web/app history) | |
| CANCELLED by restaurant | `CANCELLEDBYREST` | `reason` |
| CANCELLED other | `CANCELLED` | `reason` |
New apps (POS, KDS, owner) read the canonical `status` field.

## 7. Money, tax and charges (`packages/core`)

- **Unit:** integer minor units (`fils`), `bigint` in DB, `number` in TS guarded ≤ 2^53. Currency per restaurant (`AED`, exponent 2).
- **Price entry:** `restaurants.prices_include_vat` default **true**.
- **Calculation order (per line, then per order):**
  1. line base = (variation price + Σ add-on prices) × qty
  2. line discounts (item-level promos, happy hour)
  3. order discounts (coupon, manual, member %) allocated **pro-rata** to lines (largest-remainder so fils add up)
  4. charges from `restaurant_charges` in `sort` order (e.g. Dubai hotel 7% municipality fee), each `taxable` or not
  5. delivery fee (taxable, standard rate)
  6. VAT per line at `tax_rate_bp` (500 = 5%). If prices include VAT: `vat = round(gross × rate / (10000 + rate))`
  7. tip: **outside VAT scope**, not discounted, not in invoice taxable total
  8. rounding: half-up to 1 fil per line; invoice VAT = Σ line VAT; optional cash rounding to 0.25 AED shown as a separate "rounding" line (cash only)
- **Output:** `{ lines[], subtotal, discountTotal, charges[], deliveryFee, taxableAmount, vatTotal, tip, rounding, grandTotal }`. The same function runs in `CalculateCheckout`, `PlaceOrder`, POS, and invoice rendering. Property-based tests (fast-check): Σ lines = totals, never negative, VAT inclusive/exclusive round-trip within 1 fil per line.
- **Server always recomputes.** Client totals are ignored except to show a "prices changed" message if they differ.

## 8. Database schema (Postgres 17 on Supabase)

Conventions: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (trigger), money `bigint` fils, rates in basis points `int`, soft delete `deleted_at timestamptz` where noted. All tables in schema `app` (not `public`, so Supabase's Data API exposes nothing). RLS **enabled** on every table (see doc 03 §6).

### 8.1 Enums
```sql
create schema app;
create type app.user_role      as enum ('customer','rider','staff','owner','super_admin');
create type app.staff_role     as enum ('waiter','cashier','kitchen','manager');
create type app.order_type     as enum ('delivery','pickup','dine_in','qr');
create type app.order_status   as enum ('OPEN','PENDING','ACCEPTED','PREPARING','READY','SERVED','BILL_REQUESTED','PICKED','DELIVERED','COMPLETED','CANCELLED');
create type app.item_kds_status as enum ('queued','fired','preparing','ready','served','voided');
create type app.payment_method as enum ('cash','card_online','card_terminal','apple_pay','google_pay','wallet','loyalty','cod');
create type app.payment_status as enum ('pending','requires_action','succeeded','failed','refunded','partially_refunded');
create type app.table_state    as enum ('free','seated','ordered','bill_requested','dirty');
create type app.invoice_type   as enum ('simplified','full','credit_note');
create type app.channel        as enum ('web','customer_app','pos','qr','store','aggregator','phone');
```

### 8.2 Accounts
```sql
create table app.users (
  id uuid primary key default gen_random_uuid(),
  role app.user_role not null,
  name text not null,
  email citext unique,
  phone text unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),   -- E.164, +971...
  password_hash text,                       -- argon2id; null for OTP/social-only users
  email_verified_at timestamptz, phone_verified_at timestamptz,
  totp_secret_enc bytea,                    -- super admin 2FA, encrypted (doc 03 §5)
  locale text not null default 'en', marketing_opt_in boolean not null default false,
  is_active boolean not null default true, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.oauth_identities (user_id uuid references app.users on delete cascade, provider text check (provider in ('google','apple')), subject text, primary key (provider, subject));
create table app.sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app.users on delete cascade,
  family_id uuid not null,                  -- rotation family; reuse of an old token revokes the family
  refresh_token_hash bytea not null unique, device text, ip inet, user_agent text,
  expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table app.otp_codes (
  id uuid primary key default gen_random_uuid(), target text not null, purpose text not null,
  code_hash bytea not null, attempts smallint not null default 0, expires_at timestamptz not null, consumed_at timestamptz
);
create index on app.otp_codes (target, purpose) where consumed_at is null;
create table app.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app.users on delete cascade,
  label text, area text not null, building text, apartment text, street text, landmark text, instructions text,
  location geography(point,4326) not null, is_default boolean not null default false, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_default_address on app.addresses(user_id) where is_default and deleted_at is null;
create table app.device_tokens (user_id uuid references app.users on delete cascade, token text primary key, platform text, app text, last_seen_at timestamptz);
create table app.consents (user_id uuid references app.users on delete cascade, kind text, granted boolean, at timestamptz default now(), primary key (user_id, kind, at));
```

### 8.3 Organisations, restaurants, staff
```sql
create table app.organizations ( -- the owner's company (legal entity, TRN)
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references app.users,
  legal_name text not null, legal_name_ar text, trn text check (trn ~ '^[0-9]{15}$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.brands (id uuid primary key default gen_random_uuid(), organization_id uuid not null references app.organizations, name text not null, name_ar text, logo_url text);
create table app.zones (
  id uuid primary key default gen_random_uuid(), name text not null, area geography(polygon,4326) not null,
  delivery_fee_base bigint not null, fee_per_km bigint not null default 0, min_order bigint not null default 0, is_active boolean default true
);
create table app.restaurants ( -- one physical branch
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references app.organizations,
  brand_id uuid references app.brands, zone_id uuid references app.zones,
  name text not null, name_ar text, slug text unique not null, logo_url text, cover_url text,
  address text not null, emirate text not null default 'DXB', location geography(point,4326) not null,
  phone text, currency char(3) not null default 'AED', timezone text not null default 'Asia/Dubai',
  prices_include_vat boolean not null default true, tax_rate_bp int not null default 500,
  commission_bp int not null default 0, delivery_radius_m int default 7000,
  default_prep_minutes int not null default 20, auto_accept boolean not null default false,
  is_open boolean not null default true, busy_until timestamptz,   -- busy mode
  discount_limit_bp int not null default 1000,                     -- above this needs manager PIN
  invoice_prefix text not null,                                    -- e.g. 'DXB1'
  is_active boolean not null default true, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.restaurant_charges ( -- replaces "service charge"
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants,
  name text not null, name_ar text, rate_bp int, fixed_amount bigint, applies_to app.order_type[] not null,
  taxable boolean not null default true, sort int not null default 0, is_active boolean default true,
  check ((rate_bp is null) <> (fixed_amount is null))
);
create table app.opening_hours (restaurant_id uuid references app.restaurants on delete cascade, weekday smallint check (weekday between 0 and 6), opens time, closes time, primary key (restaurant_id, weekday, opens));
create table app.staff (
  id uuid primary key default gen_random_uuid(), user_id uuid references app.users,  -- managers have a user; waiters may not
  restaurant_id uuid not null references app.restaurants, display_name text not null, staff_role app.staff_role not null,
  pin_hash text not null, pin_lookup bytea not null,   -- HMAC(pepper, restaurant_id||pin) for uniqueness + lookup
  failed_pin_attempts smallint not null default 0, locked_until timestamptz, is_active boolean default true,
  unique (restaurant_id, pin_lookup)
);
create table app.pos_devices (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants,
  name text not null, kind text check (kind in ('pos','kds','pickup')), station text,
  device_secret_hash bytea not null, invoice_series text not null,  -- per-device series for offline numbering
  last_seen_at timestamptz, revoked_at timestamptz, unique (restaurant_id, invoice_series)
);
```

### 8.4 Menu
```sql
create table app.menus (id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, name text, channels app.channel[] not null default '{web,customer_app,pos,qr,store}');
create table app.categories (id uuid primary key default gen_random_uuid(), menu_id uuid not null references app.menus on delete cascade, name text not null, name_ar text, sort int default 0, is_active boolean default true, available_from time, available_to time);
create table app.items (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, category_id uuid references app.categories,
  name text not null, name_ar text, description text, description_ar text, image_url text,
  station text not null default 'main', is_available boolean not null default true, sold_out_until timestamptz,  -- "86"
  calories int, allergens text[] not null default '{}', is_veg boolean, tax_rate_bp int,  -- null = restaurant default
  sort int default 0, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.variations (id uuid primary key default gen_random_uuid(), item_id uuid not null references app.items on delete cascade, name text not null, name_ar text, price bigint not null check (price >= 0), compare_at_price bigint, sku text, is_default boolean default false);
create table app.channel_prices (variation_id uuid references app.variations on delete cascade, channel app.channel, price bigint not null, primary key (variation_id, channel));
create table app.addon_groups (id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, name text not null, name_ar text, min_select int not null default 0, max_select int not null default 1, check (max_select >= min_select));
create table app.addon_options (id uuid primary key default gen_random_uuid(), group_id uuid not null references app.addon_groups on delete cascade, name text not null, name_ar text, price bigint not null default 0, is_available boolean default true);
create table app.item_addon_groups (item_id uuid references app.items on delete cascade, group_id uuid references app.addon_groups on delete cascade, sort int default 0, primary key (item_id, group_id));
create table app.combos (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, name text, price bigint not null);           -- P1
create table app.combo_slots (combo_id uuid references app.combos on delete cascade, slot int, category_id uuid references app.categories, qty int default 1, primary key (combo_id, slot));
create table app.price_rules (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, name text, rate_bp int, weekdays smallint[], starts time, ends time, item_ids uuid[], is_active boolean); -- happy hour, P1
create table app.cuisines (id uuid primary key default gen_random_uuid(), name text unique, name_ar text, image_url text);
create table app.restaurant_cuisines (restaurant_id uuid references app.restaurants on delete cascade, cuisine_id uuid references app.cuisines, primary key (restaurant_id, cuisine_id));
create table app.banners (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, title text, image_url text, action text, sort int, starts_at timestamptz, ends_at timestamptz);
```

### 8.5 Dine-in
```sql
create table app.floors (id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, name text not null, sort int default 0);
create table app.tables (
  id uuid primary key default gen_random_uuid(), floor_id uuid not null references app.floors on delete cascade, restaurant_id uuid not null references app.restaurants,
  name text not null, seats int not null default 4, shape text default 'square', x int, y int, w int, h int,
  qr_token text unique not null,            -- 22-char random, rotatable
  state app.table_state not null default 'free', current_order_id uuid, unique (restaurant_id, name)
);
create table app.shifts (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, device_id uuid references app.pos_devices,
  opened_by uuid not null references app.staff, opened_at timestamptz not null default now(), opening_float bigint not null,
  closed_by uuid references app.staff, closed_at timestamptz, counted_cash bigint, expected_cash bigint, variance bigint, variance_reason text, z_report jsonb
);
create unique index one_open_shift_per_device on app.shifts(device_id) where closed_at is null;
create table app.cash_movements (id uuid primary key default gen_random_uuid(), shift_id uuid not null references app.shifts, kind text check (kind in ('pay_in','pay_out','drop')), amount bigint not null, reason text not null, staff_id uuid references app.staff, at timestamptz default now());
```

### 8.6 Orders and payments
```sql
create table app.orders (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants,
  order_no text not null,                   -- display: 'FL-000123', per restaurant
  type app.order_type not null, channel app.channel not null, status app.order_status not null,
  customer_id uuid references app.users, guest_name text, guest_phone text,
  table_id uuid references app.tables, covers smallint, waiter_id uuid references app.staff,
  address_snapshot jsonb, delivery_location geography(point,4326), zone_id uuid references app.zones,
  rider_id uuid references app.users, assigned_at timestamptz,
  scheduled_for timestamptz, prep_minutes int, accepted_at timestamptz, ready_at timestamptz, picked_at timestamptz, delivered_at timestamptz, completed_at timestamptz,
  instructions text, coupon_id uuid, loyalty_points_used int default 0,
  subtotal bigint not null, discount_total bigint not null default 0, charges_total bigint not null default 0, delivery_fee bigint not null default 0,
  vat_total bigint not null, tip bigint not null default 0, rounding bigint not null default 0, total bigint not null,
  amount_paid bigint not null default 0, pricing_snapshot jsonb not null,   -- full output of core.calculate()
  cancel_reason text, cancelled_by uuid, idempotency_key text,
  version int not null default 0,           -- optimistic locking for POS edits
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (restaurant_id, order_no), unique (customer_id, idempotency_key)
);
create index on app.orders (restaurant_id, status, created_at desc);
create index on app.orders (customer_id, created_at desc);
create index on app.orders (rider_id) where status in ('PREPARING','READY','PICKED');
create table app.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references app.orders on delete cascade,
  item_id uuid references app.items, variation_id uuid references app.variations,
  name_snapshot text not null, name_ar_snapshot text, variation_name text, qty int not null check (qty > 0),
  unit_price bigint not null, line_discount bigint not null default 0, line_vat bigint not null, line_total bigint not null,
  notes text, station text not null, course smallint default 1, kds_status app.item_kds_status not null default 'queued',
  fired_at timestamptz, ready_at timestamptz, seat smallint, voided_at timestamptz, void_reason text, voided_by uuid
);
create table app.order_item_addons (order_item_id uuid references app.order_items on delete cascade, option_id uuid, name_snapshot text not null, price bigint not null, qty int default 1);
create table app.order_status_events (id bigserial primary key, order_id uuid not null references app.orders on delete cascade, from_status app.order_status, to_status app.order_status not null, actor_type text, actor_id uuid, note text, at timestamptz not null default now());
create table app.kds_tickets (id uuid primary key default gen_random_uuid(), order_id uuid references app.orders on delete cascade, restaurant_id uuid not null, station text not null, seq int not null, fired_at timestamptz default now(), bumped_at timestamptz, recalled_at timestamptz);
create table app.bill_splits (id uuid primary key default gen_random_uuid(), order_id uuid not null references app.orders on delete cascade, label text, amount bigint not null, item_ids uuid[], paid boolean default false);
create table app.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references app.orders, split_id uuid references app.bill_splits,
  method app.payment_method not null, status app.payment_status not null, amount bigint not null, tip bigint default 0, tendered bigint, change_due bigint,
  shift_id uuid references app.shifts, staff_id uuid references app.staff,
  gateway text, gateway_ref text unique, gateway_payload jsonb, refunded_amount bigint not null default 0,
  created_at timestamptz not null default now()
);
create table app.refunds (id uuid primary key default gen_random_uuid(), payment_id uuid not null references app.payments, amount bigint not null, reason text not null, approved_by uuid not null, gateway_ref text, created_at timestamptz default now());
create table app.idempotency_keys (key text primary key, scope text not null, response jsonb, created_at timestamptz default now());
create table app.processed_webhooks (event_id text primary key, received_at timestamptz default now());
create table app.order_counters (restaurant_id uuid primary key references app.restaurants, last_no int not null default 0);
```

### 8.7 Tax invoices (UAE)
```sql
create table app.invoice_counters (restaurant_id uuid references app.restaurants, series text, last_no bigint not null default 0, primary key (restaurant_id, series));
create table app.tax_invoices (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references app.restaurants, order_id uuid references app.orders,
  type app.invoice_type not null, series text not null, number bigint not null, invoice_no text not null,  -- 'DXB1-P01-000123'
  issued_at timestamptz not null default now(), seller_name text not null, seller_address text not null, seller_trn text not null,
  buyer_name text, buyer_address text, buyer_trn text, lines jsonb not null,
  net_total bigint not null, vat_total bigint not null, gross_total bigint not null, currency char(3) not null,
  original_invoice_id uuid references app.tax_invoices,   -- for credit notes
  pint_ae_payload jsonb, asp_status text, pdf_url text,
  unique (restaurant_id, series, number)
);
-- No UPDATE/DELETE allowed on tax_invoices (trigger raises). Corrections = credit_note.
```
Numbering: `UPDATE invoice_counters SET last_no = last_no + 1 WHERE ... RETURNING last_no` inside the payment transaction (gap-free per series). Offline POS devices use their own series (`P01`) and a block reservation of 500 numbers fetched while online (see §10).

### 8.8 Delivery
```sql
create table app.riders (user_id uuid primary key references app.users, zone_id uuid references app.zones, vehicle text, is_online boolean default false, is_available boolean default true, last_location geography(point,4326), last_seen_at timestamptz, cash_in_hand bigint default 0);
create index on app.riders using gist (last_location) where is_online;
create table app.rider_locations (rider_id uuid, order_id uuid, location geography(point,4326), at timestamptz default now()); -- keep 30 days
create table app.dispatch_offers (id uuid primary key default gen_random_uuid(), order_id uuid references app.orders, rider_id uuid references app.users, offered_at timestamptz default now(), responded_at timestamptz, response text);
create table app.rider_earnings (id uuid primary key default gen_random_uuid(), rider_id uuid references app.users, order_id uuid references app.orders, amount bigint, kind text, created_at timestamptz default now());
create table app.withdrawals (id uuid primary key default gen_random_uuid(), user_id uuid references app.users, amount bigint not null, status text default 'requested', approved_by uuid, paid_at timestamptz, created_at timestamptz default now());
create table app.chat_messages (id uuid primary key default gen_random_uuid(), order_id uuid references app.orders on delete cascade, sender_id uuid, body text not null check (length(body) <= 1000), created_at timestamptz default now());
create table app.proof_of_delivery (order_id uuid primary key references app.orders, photo_url text, otp_verified boolean, at timestamptz default now()); -- P1
```
Rider accept: `UPDATE orders SET rider_id=$r, assigned_at=now() WHERE id=$o AND rider_id IS NULL AND status IN ('ACCEPTED','PREPARING','READY') RETURNING id` (0 rows → "already taken").

### 8.9 Growth
```sql
create table app.coupons (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, code citext not null, kind text check (kind in ('percent','amount','free_delivery')), value int not null, max_discount bigint, min_order bigint default 0, valid_from timestamptz, valid_to timestamptz, usage_limit int, per_user_limit int default 1, used_count int default 0, is_active boolean default true, unique (restaurant_id, code));
create table app.coupon_redemptions (coupon_id uuid references app.coupons, user_id uuid, order_id uuid references app.orders, primary key (coupon_id, order_id));
create table app.reviews (id uuid primary key default gen_random_uuid(), order_id uuid unique references app.orders, user_id uuid, restaurant_id uuid, rating smallint check (rating between 1 and 5), comment text, is_hidden boolean default false, created_at timestamptz default now());
create table app.favourites (user_id uuid references app.users on delete cascade, restaurant_id uuid references app.restaurants, primary key (user_id, restaurant_id));
create table app.loyalty_programs (organization_id uuid primary key references app.organizations, points_per_aed numeric(6,2) default 1, aed_per_point_fils int default 5, min_redeem_points int default 100, expiry_days int default 365);
create table app.loyalty_ledger (id bigserial primary key, user_id uuid not null, organization_id uuid not null, order_id uuid, points int not null, reason text not null, expires_at timestamptz, created_at timestamptz default now());
create view app.loyalty_balances as select user_id, organization_id, sum(points) balance from app.loyalty_ledger where expires_at is null or expires_at > now() group by 1,2;
create table app.plans (id uuid primary key default gen_random_uuid(), name text, interval text check (interval in ('month','year')), price bigint, free_delivery_min bigint, member_discount_bp int, trial_days int, stripe_price_id text, is_active boolean);
create table app.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid references app.users, plan_id uuid references app.plans, status text, current_period_end timestamptz, stripe_subscription_id text unique, cancel_at_period_end boolean default false);
```

### 8.10 Stock, finance, platform
```sql
create table app.ingredients (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, name text, unit text, on_hand numeric(12,3) default 0, reorder_level numeric(12,3), unit_cost bigint);
create table app.recipes (variation_id uuid references app.variations on delete cascade, ingredient_id uuid references app.ingredients, qty numeric(12,3), primary key (variation_id, ingredient_id));
create table app.stock_movements (id bigserial primary key, ingredient_id uuid references app.ingredients, delta numeric(12,3) not null, reason text not null, ref_type text, ref_id uuid, unit_cost bigint, at timestamptz default now());
create table app.expense_categories (id uuid primary key default gen_random_uuid(), organization_id uuid, name text);
create table app.expenses (id uuid primary key default gen_random_uuid(), restaurant_id uuid references app.restaurants, category_id uuid references app.expense_categories, amount bigint, vat_amount bigint default 0, supplier_trn text, date date, receipt_url text, note text, created_by uuid);
create table app.suppliers (id uuid primary key default gen_random_uuid(), organization_id uuid, name text, trn text, phone text, email text);
create table app.supplier_bills (id uuid primary key default gen_random_uuid(), supplier_id uuid references app.suppliers, restaurant_id uuid references app.restaurants, number text, issue_date date, due_date date, net bigint, vat_amount bigint, total bigint, status text default 'unpaid', file_url text);
create table app.bill_payments (id uuid primary key default gen_random_uuid(), bill_id uuid references app.supplier_bills, amount bigint, paid_at date, method text);
create table app.daily_rollups (restaurant_id uuid, day date, channel app.channel, orders int, gross bigint, discounts bigint, vat bigint, tips bigint, refunds bigint, food_cost bigint, primary key (restaurant_id, day, channel));
create table app.alerts (id uuid primary key default gen_random_uuid(), organization_id uuid, restaurant_id uuid, type text, severity text, payload jsonb, read_at timestamptz, created_at timestamptz default now());
create table app.settings (key text primary key, value jsonb not null, is_secret boolean default false, updated_by uuid, updated_at timestamptz default now());
create table app.audit_log (id bigserial primary key, actor_type text, actor_id uuid, restaurant_id uuid, action text not null, entity text, entity_id uuid, before jsonb, after jsonb, ip inet, request_id text, at timestamptz not null default now());
-- audit_log: INSERT only (trigger blocks UPDATE/DELETE). Retain 5 years.
create table app.integrations (id uuid primary key default gen_random_uuid(), restaurant_id uuid, provider text, external_store_id text, secret_enc bytea, is_active boolean); -- aggregator middleware, P1
```

Total: ~62 tables. Postgres extensions: `pgcrypto`, `citext`, `postgis`, `pg_trgm` (search on item and restaurant names).

## 9. Search and geo
- Restaurant list: `ST_DWithin(restaurant.location, :point, delivery_radius_m)` **and** point inside an active zone. Sorted by open status, then distance or rating.
- Food search: `pg_trgm` GIN index on `name` and `name_ar`; Arabic normalisation (strip diacritics and tatweel, unify alef forms) in a generated column.
- Delivery fee: `zone.base + fee_per_km × road distance`. Road distance comes from the Google Routes API, cached per (restaurant, geohash7) for 24 h to stay within free limits. Straight-line × 1.3 is used if the API fails.

## 10. POS architecture (PC + Android tablet)
- **App:** `apps/pos`, Next.js 16, installed as a **PWA** (Chrome/Edge on PC, Chrome on Android). Full-screen, wake lock, no browser bar.
- **Device pairing:** manager signs in once on the device → `registerPosDevice` → long-lived device token (in IndexedDB, non-extractable WebCrypto key signs requests). Staff then switch with a PIN.
- **Local data:** Dexie (IndexedDB): menu snapshot, tables, open orders, outbox.
- **Offline (P2, designed now):** mutations go to an **outbox** with client UUIDs and idempotency keys. When the device is offline, cash payments get invoice numbers from the device's reserved block (`reserveInvoiceBlock`, 500 numbers). Sync replays the outbox in order. The server applies each mutation idempotently and the conflict rule is "server wins, show a banner". Card and online payments are disabled while offline.
- **Printing, 3 levels:**
  1. **P0: browser print.** Receipt route `/print/receipt/:id` with `@page { size: 80mm auto; margin: 0 }`; Chrome kiosk mode `--kiosk-printing` on PC prints silently to the default printer. Works with Arabic because the OS renders the fonts.
  2. **P1: print bridge** (`services/print-bridge`, Node, runs on the POS PC or a Raspberry Pi) listens on `ws://localhost:9123`, receives a PNG raster (receipt rendered to canvas in the browser) plus commands, and sends ESC/POS to network printers (TCP 9100) or USB. Also handles the cash drawer kick and kitchen printers per station.
  3. **Android tablet without PC:** WebUSB to a USB printer (Chrome Android), or the bridge running on a Pi on the same Wi-Fi.
- **Card terminals:** P1 "external terminal" mode (cashier types the amount on any bank terminal and records `card_terminal`). Stripe Terminal integration is P2.

## 11. Observability and operations
- Logs: pino JSON with `request_id`, `user_id`, `restaurant_id`, operation name; no bodies, no tokens. Docker log rotation 50 MB × 5.
- Metrics: `/metrics` (Prometheus format, private network only). Grafana Cloud free plan is optional.
- Errors: Sentry in API, worker and all apps; `release = git sha`.
- Uptime: UptimeRobot on `/health` and on each web app.
- SLOs (demo): p95 read < 300 ms, `PlaceOrder` < 600 ms, subscription fan-out < 2 s.

## 12. Environment variables (API)
```
NODE_ENV, PORT=4000, PUBLIC_URL=https://api.flippin.app, WEB_ORIGINS=https://flippin.app,https://admin.flippin.app,https://pos.flippin.app
DATABASE_URL=postgres://api_rw:...@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
REDIS_URL=redis://redis:6379
JWT_PRIVATE_KEY (Ed25519 PEM), JWT_PUBLIC_KEY, JWT_ISSUER=flippin, ACCESS_TTL=900, REFRESH_TTL=2592000
PIN_PEPPER, DATA_ENCRYPTION_KEY (32 bytes, base64)
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
GOOGLE_MAPS_SERVER_KEY, GOOGLE_OAUTH_CLIENT_IDS, APPLE_BUNDLE_IDS
EXPO_ACCESS_TOKEN, RESEND_API_KEY, SENTRY_DSN, POSTHOG_KEY
DEMO_MODE=false, DEMO_OTP=111111
OCI_BUCKET, OCI_NAMESPACE (backups only, in the host's cron env, not the API)
```
Stored in `/opt/flippin/.env` (chmod 600, owner root), never in git. The GitHub Actions deploy job does **not** read secrets from `.env`; it only restarts containers.
