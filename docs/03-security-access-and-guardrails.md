# 03 — Security, Access & Guardrails

Flippin · v1.0 · 27 Sep 2026

The server decides everything. Apps only hide what a user can't do. Any rule that exists only in an app is a bug.

## 1. What we protect, and from whom

| Asset | Main threats | Key controls |
| --- | --- | --- |
| Money (payments, refunds, discounts, cash) | Staff fraud (voids after cash payment, fake discounts), client-side price tampering, replayed webhooks | Server-side pricing, manager PIN + audit, blind cash count, webhook signature + idempotency |
| Customer data (phone, addresses, order history) | Account takeover, IDOR ("change the order id in the URL"), scraping | OTP limits, per-object ownership checks, rate limits, no enumeration |
| Tax records | Deletion, renumbering | Insert-only invoices, gap-free series, 5-year retention |
| Platform secrets (Stripe, Cloudinary, JWT keys) | Leak through the `configuration` API or git | Env vars only, write-only admin fields, secret scanning |
| Availability during service hours | Floods on OTP/place-order, noisy subscriptions | Rate limits, cost limits, per-connection subscription caps |
| Rider location | Stalking | Visible only to the customer on the active order and to admins, kept 30 days |

## 2. Identities and how each logs in

| Actor | Credential | Token | Where stored |
| --- | --- | --- | --- |
| Customer | Phone OTP, email+password, Google, Apple | Access JWT 15 min + refresh 30 days (rotating) | Mobile: `expo-secure-store`. Web: refresh in `HttpOnly; Secure; SameSite=Lax` cookie on `api.flippin.app` scoped to `/rest/auth/refresh`, access token in memory |
| Guest (browsing) | none | Public-access JWT, 24 h, role `guest`, read-only public data | memory/localStorage (no PII) |
| QR guest | table QR token | Table-session JWT 4 h, scope `{restaurant, table, order}` | sessionStorage |
| Rider | phone/email + password (+ OTP on new device, P1) | Access 15 min + refresh 30 days | secure store |
| Store app | restaurant manager email+password | Same as rider | secure store |
| POS/KDS/Pickup **device** | Paired once by a manager | Device credential: non-extractable Ed25519 key in IndexedDB (WebCrypto); device signs a challenge to get a 12 h device JWT | IndexedDB |
| POS **staff** | 4-digit PIN on a paired device | Staff JWT 12 h max, auto-lock 2 min idle; always paired with the device JWT | memory |
| Manager / owner (admin web) | email+password (+ TOTP optional, required for owners from P1) | Access 15 min + refresh 7 days | cookie + memory |
| Super admin | email+password + **TOTP required** | Access 15 min + refresh 12 h, re-auth for sensitive actions | cookie + memory |

**JWT claims:** `sub` (user id), `role`, `rid[]` (restaurant ids), `oid` (organization id), `srole` (staff role), `dev` (device id), `sid` (session id), `iat`, `exp`, `iss=flippin`, `aud=<app>`. Signed with **EdDSA (Ed25519)**; keys rotated yearly with `kid`. The server re-checks `users.is_active` and `sessions.revoked_at` on refresh (not on every request; the 15-min TTL bounds the gap).

**Refresh rotation:** each refresh returns a new refresh token and marks the old one used. Reusing a used token revokes the **whole family** (stolen-token detection) and alerts the user by email.

**Existing apps:** customer, rider, store and web currently have no refresh logic. Ticket FE-003 adds an Apollo `onError` + `TokenRefreshLink`. Until it ships, issue **7-day access tokens to those app audiences only**, and remove that exception the day FE-003 merges.

## 3. Roles and permission matrix

Scopes: **own** = the user's own records; **branch** = restaurants in `rid[]`; **org** = all branches of `oid`; **all** = platform.

| Capability | Customer | Rider | Waiter | Cashier | Kitchen | Manager | Owner | Super admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Browse menus, place own orders | ✓ own | | | | | | | |
| See order | own | offered/assigned | branch dine-in | branch | branch (KDS view, no prices/PII) | branch | org | all |
| Accept/reject online orders | | | | ✓ branch | | ✓ branch | ✓ org | ✓ |
| Open table, add items, send to kitchen | | | ✓ | ✓ | | ✓ | ✓ | |
| Mark items preparing/ready | | | | | ✓ | ✓ | | |
| Discount ≤ limit | | | | ✓ | | ✓ | ✓ | |
| Discount > limit, void sent item, refund | | | | needs manager PIN / owner approval | | ✓ | ✓ | ✓ |
| Take payment, open/close shift | | | | ✓ | | ✓ | | |
| See cash variance before counting | | | | ✗ (blind count) | | ✓ | ✓ | |
| 86 items, busy mode, open/close restaurant | | | | ✓ | ✓ (86 only) | ✓ | ✓ | ✓ |
| Menu, tables, QR, staff PINs | | | | | | ✓ branch | ✓ org | ✓ |
| Finance, VAT report, P&L | | | | | | view branch | ✓ org | ✓ |
| Commission, zones, platform settings, plans | | | | | | | | ✓ |
| Accept delivery offers, update location | | ✓ own | | | | | | |
| Approve rider withdrawals | | | | | | | | ✓ |
| Impersonate (support) | | | | | | | | ✓ read-only, audited, banner shown |

Implementation:
- GraphQL directive `@auth(roles: [...], scope: OWN|BRANCH|ORG|ALL)` on every field of `Query`/`Mutation`/`Subscription`. **CI fails if any root field has no `@auth`** (public fields use `@auth(public: true)` explicitly).
- Object-level check in `policy.ts` after loading the row: `assertCanAccess(ctx, order)` compares `order.restaurant_id ∈ ctx.rid`, `order.customer_id = ctx.sub`, etc. Never trust ids from args alone. **Return `NOT_FOUND` rather than `FORBIDDEN`** for other people's objects, so ids can't be probed.
- Field-level: KDS and rider resolvers never return prices, phone numbers or full addresses beyond what the step needs (rider sees the customer phone only between PICKED and DELIVERED plus 1 h, through a masked relay number when that feature ships).

## 4. Authentication details

| Control | Setting |
| --- | --- |
| Password hashing | argon2id, m=19 MiB, t=2, p=1 (OWASP 2025 baseline); rehash on login if params change |
| Password rules | min 10 chars, checked against the top 100k breached passwords list (bundled); no composition rules |
| OTP | 6 digits from CSPRNG, HMAC-SHA256 stored, 5 min TTL, 5 attempts per code, **3 sends per phone per 15 min, 10 per day**, 20 per IP per hour; resend cool-down 30 s; constant-time compare |
| Demo OTP `111111` | Only when `DEMO_MODE=true` **and** the phone is in the seeded demo list. The server refuses to start if `DEMO_MODE=true` and `PUBLIC_URL` is not the demo domain |
| Enumeration | `EmailExist`/`PhoneExist` are required by the apps: rate-limit to 10/min per IP and return the same timing; forgot-password always answers "If an account exists, we sent a link" |
| Social login | Verify Google ID token (`aud` in allowed client ids) / Apple identity token (JWKS, `aud` = bundle ids, nonce from `AppleAuthNonce`); link by verified email only |
| PIN | 4 digits (6 optional per restaurant), argon2id hash + HMAC lookup with server pepper; unique per restaurant; 5 wrong → staff locked 15 min, 20 wrong on a device in 10 min → device locked, manager alert; no "weak PIN" list (1234, 0000, 1111, birth years 19xx) |
| TOTP | RFC 6238, 30 s, ±1 window, secret AES-256-GCM encrypted, 10 one-time recovery codes (hashed) |
| Session list | "Signed-in devices" in profile/admin with revoke; password change revokes all other sessions |

## 5. Secrets and configuration

1. All secrets live in `/opt/flippin/.env` on the VM (root, `600`) and in Vercel/EAS environment settings. **Nothing in git.** Add `gitleaks` to CI and pre-commit.
2. The inherited admin `save*Configuration` mutations (Stripe, Twilio, SendGrid, Cloudinary, Google, Firebase, PayPal) become:
   - **Public config** (publishable Stripe key, Maps browser key, Firebase web config, currency) → returned by `configuration`.
   - **Secrets** (Stripe secret, webhook secret, Cloudinary secret, Twilio token, SendGrid/Resend key) → **write-only**: the mutation stores them AES-256-GCM encrypted in `settings` with `is_secret=true`, and the query returns only `{ isSet: true, last4, updatedAt }`. Env vars override DB values. Only super admin with fresh TOTP (≤ 5 min) can write.
3. Remove the committed `google-services.json` (×3), `GoogleService-Info.plist`, and the two `firebase-messaging-sw.js` keys; create new Firebase projects; **treat the old keys as leaked** (they belong to the template vendor anyway). Purge them from history with `git filter-repo` before the repo is shown to a buyer.
4. Google Maps keys: browser key restricted by HTTP referrer (`*.flippin.app/*`), Android keys by package + SHA-1, iOS by bundle id, server key by VM IP. API restrictions per key. Budget alert $1.
5. Replace every hard-coded `*.enatega.com` and `railway.app` server URL in the apps. Otherwise the apps could send user tokens to a third-party server.

## 6. Database access and RLS

- The API connects as **`api_rw`**, a custom Postgres role (not `postgres`, not `service_role`), with `USAGE` on schema `app` and DML grants only. Migrations run as a separate `migrator` role from CI.
- Supabase's **Data API is switched off** (Project Settings → Data API → disable), and schema `app` is not in "Exposed schemas". The `anon` and `authenticated` roles get `REVOKE ALL ON SCHEMA app`.
- RLS is **enabled on every table** as defence in depth. Per request, the API sets context inside its transaction:
  ```sql
  select set_config('app.user_id', $1, true), set_config('app.role', $2, true), set_config('app.restaurant_ids', $3, true);
  ```
  Example policy:
  ```sql
  alter table app.orders enable row level security;
  create policy orders_access on app.orders for all to api_rw using (
    current_setting('app.role', true) = 'super_admin'
    or customer_id::text = current_setting('app.user_id', true)
    or rider_id::text    = current_setting('app.user_id', true)
    or restaurant_id::text = any (string_to_array(current_setting('app.restaurant_ids', true), ','))
  );
  ```
  Background jobs use a `worker` role with `BYPASSRLS`, limited to the tables they touch.
- Triggers: `tax_invoices`, `audit_log`, `order_status_events`, `payments` (except status/refunded columns), `loyalty_ledger` block UPDATE/DELETE.
- Migrations are reviewed SQL, applied by CI only. No manual edits in the Supabase dashboard in production.

## 7. API guardrails

| Guardrail | Setting |
| --- | --- |
| Transport | HTTPS only (HSTS 1 year), TLS 1.2+, WSS only |
| CORS | Allow-list: `flippin.app`, `admin.`, `pos.`, Vercel preview pattern `https://flippin-*-murtaza.vercel.app` (preview only in non-prod). Credentials allowed only for admin/pos/web origins |
| CSRF | Cookie is used only on `/rest/auth/refresh`, `SameSite=Lax` + required `X-Requested-With` header + origin check |
| GraphQL | Max depth 10, max aliases 15, cost limit 5,000 per operation, max 50 root fields, batching off, introspection and field suggestions **off** in production, persisted-query allow-list for new apps (P1) |
| Body size | 256 KB JSON; uploads never go through the API (Cloudinary direct, signed) |
| Rate limits (Redis, sliding window) | login 5/min per account + 20/min per IP; OTP as §4; `PlaceOrder` 5/min per user, 30/min per IP; `qrPlaceOrder` 6/min per table; call-waiter 1/min per table; search 60/min per IP; everything else 300/min per token |
| Subscriptions | Auth on connect **and** per subscription; max 20 subscriptions per socket, 5 sockets per user; idle timeout 10 min without ping; re-check permissions when a token expires (close with 4401) |
| Validation | Zod schema per input: lengths (names ≤ 120, notes ≤ 140, instructions ≤ 300), qty 1–99, lat/lng ranges, uuid formats, enum values, money ≥ 0 and ≤ AED 100,000 per order |
| Errors | Masked: clients get `{code, message}` from the §14 list in doc 02; stack traces only in Sentry. No SQL or internal ids in messages |
| Idempotency | `PlaceOrder`, `qrPlaceOrder`, `takePayment`, `refundPayment`, `closeShift`, Stripe session creation: repeat key → same response |
| Concurrency | State changes use `WHERE status = $expected`; POS edits use `orders.version`; counters use row locks |
| Headers (web apps) | CSP with nonces (`script-src 'self' 'nonce-…' https://js.stripe.com https://maps.googleapis.com`), `frame-ancestors 'none'` (except Stripe), `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` (geolocation only on web/pos), `X-Content-Type-Options nosniff` |

## 8. Payments and money guardrails

1. **Price authority:** the server recomputes every total with `packages/core`. Client-sent prices are ignored.
2. **Paid means webhook:** an order becomes paid only on `checkout.session.completed` / `payment_intent.succeeded`, verified with `Stripe-Signature` (tolerance 5 min) and de-duplicated in `processed_webhooks`. The success URL never marks anything paid.
3. **Amount check:** webhook amount and currency must equal `orders.total` (or the split share); a mismatch → flag order, alert super admin.
4. **Card data** never touches Flippin (Stripe-hosted Checkout → PCI DSS **SAQ A**). No card numbers in logs, notes or chat (regex scrubber on free-text fields).
5. **Refunds:** only to the original method; `sum(refunds) ≤ payment.amount`; above AED 200 (setting) needs owner approval; always writes audit + credit note.
6. **Cash:** blind close (cashier counts before seeing expected); variance > AED 20 (setting) → alert; pay-outs require a reason; drawer opens are logged (bridge).
7. **Voids after payment are impossible:** a paid order can only be refunded (credit note), never voided.
8. **Discount abuse:** coupon per-user limits checked inside the order transaction; manual discounts > limit need a PIN from a *different* staff member with manager role.
9. **COD caps:** new customers limited to AED 300 COD for their first 3 orders; riders have a `cash_in_hand` ceiling (e.g. AED 1,000) after which no new COD offers are sent.
10. **Tips** go 100% to the rider (delivery) or the staff tip pool (dine-in), are excluded from commission and are shown separately in reports.

## 9. Privacy (UAE PDPL) and retention

| Data | Retention | Notes |
| --- | --- | --- |
| Tax invoices, VAT records, payments | 5 years minimum (never deleted, anonymised on account deletion) | FTA requirement; confirm with tax adviser |
| Orders | 5 years (linked to invoices), customer fields anonymised on deletion | |
| Rider locations | 30 days | Cron purge |
| Chat messages | 90 days | |
| OTP codes, idempotency keys | 24 h | |
| Audit log | 5 years | |
| Logs (app) | 14 days | No PII in logs |
| Backups | 14 daily + 8 weekly, encrypted at rest (OCI default) | |

- Privacy policy + terms pages (EN/AR) under our domain before any real user.
- Consent: marketing opt-in unchecked by default; stored in `consents`.
- **Export my data** (JSON, emailed link, 24 h) and **delete my account** (30-day grace, then anonymise `users`, delete addresses/favourites/device tokens, keep invoices with name replaced by "Deleted user").
- Where data is stored: Supabase (EU region) and Oracle (EU region). The privacy policy must state cross-border transfer; for UAE government/regulated clients later, move to a UAE region.

## 10. Uploads and content

- Cloudinary **signed uploads only**: `/rest/uploads/sign` (auth required) returns a signature for folder `restaurants/{rid}/…`, `allowed_formats=jpg,png,webp`, `max_file_size=5MB`, eager transform to WebP ≤ 1600 px, strips EXIF (and so GPS). The unsigned preset used by the template is **deleted** in Cloudinary.
- Reviews and chat: length limits, profanity filter (EN/AR word list), links stripped in reviews, report/hide by manager/admin.
- Menu text rendered as text, never HTML (no `dangerouslySetInnerHTML`).

## 11. Infrastructure hardening (Oracle VM)

- SSH key-only, port 22 open to your IP only (update the security list when your IP changes, or use Oracle Bastion, which is free), `fail2ban`, `unattended-upgrades` for security patches, automatic reboot at 04:00 if required.
- Only 80/443 public. Redis and API ports are bound to the Docker network, never to `0.0.0.0`. Redis with `requirepass` and `protected-mode yes`.
- Containers run as non-root, `read_only: true` filesystems where possible, `no-new-privileges`, memory limits (API 1 GB, worker 512 MB, Redis 256 MB).
- Images pinned by digest; Dependabot (already in repo) for npm + Docker + GitHub Actions; `npm audit --omit=dev` high/critical fails CI.
- GitHub: branch protection on `main` (PR + passing CI), required signed commits optional, secret scanning + push protection on, deploy key limited to the VM (read-only GHCR token on the VM).
- Oracle: MFA on the console login, a separate IAM user for CLI backups with rights only to the backup bucket, budget alerts.

## 12. Audit log: what is always written

Login success/failure (admin, POS PIN), session revoke, password/PIN change, role change, staff create/deactivate, menu price change, item 86/un-86, discount, void, refund, payment, shift open/close/variance, cash pay-in/out, drawer open, invoice issue/credit note, settings change (secret values never stored, only "changed"), commission change, withdrawal approval, impersonation start/stop, data export/delete requests.

## 13. Incident basics

- Severity 1 (payments wrong, data leak, down during service): rotate the affected keys (runbook per key), put up a status banner via `settings.maintenance`, restore from backup if data is corrupted, write a post-mortem.
- Kill switches (super admin settings, applied within 30 s via Redis): pause all online ordering, disable card payments (COD/cash only), force logout all sessions, read-only mode.

## 14. Guardrails for building with AI (Claude / any code assistant)

Paste this block into `CLAUDE.md` at the repo root so every session follows it:

```
- Never put secrets, keys or .env values in code, commits, chat or logs. Use env vars listed in docs/01 §12.
- Never let an app talk to Supabase directly. All data goes through services/api.
- All money math goes through packages/core (integer fils). No floats for money outside resolver output.
- Every new GraphQL root field needs @auth(...) and a policy.ts object check. Add a test for "other user's id returns NOT_FOUND".
- Every order status change goes through core/orderMachine + a conditional UPDATE + order_status_events in one transaction.
- Never UPDATE/DELETE tax_invoices, audit_log, payments history. Corrections are new rows.
- Do not change the shape of existing GraphQL operations used by the apps; extend with new optional fields only.
- Run: pnpm typecheck && pnpm lint && pnpm test && pnpm schema:validate before every commit.
- Do not add dependencies without saying why; prefer the ones in docs/01 §3.
- One ticket per branch/PR; the PR description lists the ticket id and its acceptance criteria with ✓/✗.
```
