# Flippin — Master Build Plan (Roadmap)

Companion to [01-PRD.md](01-PRD.md), [02-FEATURES.md](02-FEATURES.md), [03-FLOWS.md](03-FLOWS.md).

**Builder:** solo developer + Claude Code. **Budget:** free tiers only (unavoidable costs: PRD §12).
**Method:** each phase gets its own detailed, test-first plan in `docs/superpowers/plans/` just before it starts (so it reflects what was learned in the previous phase). Phase 0 is already written:
→ [`docs/superpowers/plans/2026-09-29-flippin-phase0-rebrand.md`](../superpowers/plans/2026-09-29-flippin-phase0-rebrand.md)

Durations assume ~25–30 focused hours/week. They are estimates, not promises.

---

## Timeline at a glance

| Phase | Name | Est. weeks | Ends with |
|---|---|---|---|
| 0 | Foundation & full rebrand | 2 | All 6 apps say Flippin, build, and pass the brand check |
| 1 | `flippin-api` core | 6 | Backend on Oracle VM serving auth, zones, catalog, orders, subscriptions |
| 2 | Restaurant MVP (closed beta) | 5 | Real restaurant orders end-to-end with 5 restaurants, 5 riders, friends & family |
| 3 | Public launch — one city | 3 | Apps live on App Store/Play; 50 restaurants onboarded |
| 4 | Multi-category (grocery, pharmacy, shops) | 4 | Non-food stores live with large catalogs & substitutions |
| 5 | Growth features | 4 | Loyalty, Plus membership, referrals, scheduled orders, campaigns |
| 6 | Scale & hardening | ongoing | ZATCA Phase 2, SDK alignment, performance, paid infra when needed |

Total to public launch ≈ **16 weeks**; to full feature set ≈ **24 weeks**.

---

## Phase 0 — Foundation & full rebrand (2 weeks)

**Goal:** One repo, everything named Flippin, own secrets, CI enforcing it.
**Detailed plan:** `docs/superpowers/plans/2026-09-29-flippin-phase0-rebrand.md`

Workstreams:
1. Accounts (free): GitHub, Expo, Firebase project "flippin", Sentry org, PostHog, Cloudflare, Oracle Cloud, Resend. Register the domain (decision PRD §17).
2. Brand guard script + CI (fails on any "enatega").
3. Folder rename `enatega-*` → `flippin-*`.
4. Scripted text rebrand (EN + AR + FA spellings, URLs, bundle IDs).
5. App identity: names, slugs, schemes, bundle IDs, EAS projects.
6. Secrets: remove Enatega Firebase/Sentry; env-driven configs.
7. Brand tokens: colours, fonts (Satoshi + IBM Plex Sans Arabic), assets.
8. NOTICE credit, README/DESIGN/PRODUCT docs rewritten.
9. Verify: every app installs, type-checks, builds; `npm run brand:check` passes.

**Exit criteria:** brand check green in CI; each app launches showing Flippin branding (pointing at a not-yet-running API is expected).

---

## Phase 1 — `flippin-api` core (6 weeks)

**Goal:** Own backend implementing the GraphQL contract the apps already use, deployed free.

Folder: `flippin-api/` (new). Stack: Node 22, TypeScript, Apollo Server 4, `graphql-ws`, Mongoose, ioredis, BullMQ, zod, pino, vitest, mongodb-memory-server.

| Week | Deliverable |
|---|---|
| 1 | **Contract extraction:** script collects every `gql` document from the 6 apps into `flippin-api/contract/operations/*.graphql`; hand-write SDL modules; **CI test `contract.test.ts` validates every client operation against the server schema** and prints the remaining gap count. Project skeleton, config, logging, health check, Docker. |
| 2 | Auth module (F-02): users, roles, JWT access/refresh rotation, email OTP (Resend), Google/Apple token verify, SMS provider adapter (interface + console driver for dev), device tokens, rate limit. RBAC directive `@auth(roles: [...])`. |
| 3 | Geo & catalog: zones (GeoJSON + 2dsphere), vendors, stores (restaurants), shop types, cuisines, categories, items (food), variations, options, add-ons, banners; R2 pre-signed uploads; search index. |
| 4 | Pricing engine (B-06) with exhaustive unit tests (VAT 15% inclusive, fees, coupons, tips, wallet); cart quote; `placeOrder` with idempotency; order state machine (F-07) as a pure module with transition table tests. |
| 5 | Real-time: Redis pub/sub + `graphql-ws`; all 16 subscriptions; BullMQ jobs: store accept timeout, payment expiry, dispatch rounds (F-09); notifications service (Expo push + email). |
| 6 | Payments: Moyasar adapter + signed webhook + refunds (F-06, F-13); ledger (F-19) double-entry with invariants tests; ZATCA QR (F-15). **Deploy:** Oracle VM + Coolify (API, MongoDB, Redis), Cloudflare DNS, nightly `mongodump` → R2, UptimeRobot. |

**Exit criteria:** contract test shows 100% of P0 operations valid; all unit/integration tests pass; staging API live at `api-staging.<domain>`; admin can log in and create a zone, vendor, store and menu.

---

## Phase 2 — Restaurant MVP / closed beta (5 weeks)

**Goal:** A real restaurant order placed, paid, cooked, dispatched, delivered and settled.

| Week | Deliverable |
|---|---|
| 1 | Point all apps to staging API via env; fix contract mismatches app by app; remove/flag Stripe & PayPal screens; add Moyasar checkout (web: Moyasar form; app: Moyasar SDK / Apple Pay); COD. |
| 2 | Customer flow polish: Arabic RTL pass on every MVP screen, brand contrast fixes, cutlery toggle, VAT breakdown, ZATCA receipt screen + email. |
| 3 | Store app: busy mode, item sold-out toggle, auto-reject timeout UI, loud alert, handshake. Rider app: offer countdown, COD cash-held, proof photo. |
| 4 | Admin: dispatch board live, COD reconciliation (A-19), refund action, commission per store, withdrawal approvals; audit log. |
| 5 | **Beta:** 5 restaurants, 5 riders, ~30 testers in one district. Maestro smoke flows (customer order, store accept, rider deliver); Cypress (admin/web). Daily bug triage. Load test API with k6 (free) at 5× beta load. |

**Exit criteria:** ≥ 100 real beta orders, completion ≥ 95%, zero payment mismatches in ledger reconciliation, crash-free ≥ 99%.

---

## Phase 3 — Public launch, one city (3 weeks)

- Legal: CR/VAT registration done, Arabic privacy policy & terms (PDPL), TGA rider compliance verified, Moyasar live keys (KYC).
- Store listings AR/EN, screenshots, privacy nutrition labels, background-location justification (rider).
- EAS production builds + submit (iOS/Android); web + admin on production Coolify apps behind Cloudflare.
- Onboard to 50 restaurants (F-18) — CSV menu import helper.
- Monitoring: Sentry alerts, payment-webhook failure alert, uptime, daily backup restore test.
- Launch playbook: soft launch district → full city; promo code for first orders; rider guaranteed minimum for first 4 weeks.

**Exit criteria:** apps approved and public; 50 live restaurants; on-call runbook written.

## Phase 4 — Multi-category (4 weeks)

- Shop-type specific UX: grocery grid, sub-categories, weight items, stock quantities, low-stock alerts (C-47, V-04, V-05).
- CSV bulk catalog import; image bulk upload to R2.
- Substitution flow (F-12) end-to-end; pharmacy OTC rules (C-48).
- Onboard first 10 grocery/pharmacy/flower/shops.

## Phase 5 — Growth (4 weeks)

- Scheduled orders (F-05), referrals (C-101), vouchers wallet, Flippin Points (C-103), Flippin Plus (C-102), push campaigns (A-17), PostHog funnels & cohort dashboards, reorder rails, reviews replies, own-delivery mode for stores (S-18), fraud rules (A-25).

## Phase 6 — Scale & hardening (ongoing)

- ZATCA Phase 2 (Fatoora) when notified; VAT reports (A-20).
- Align Expo SDKs (53→latest across apps) and Next.js versions (admin 14 → 16).
- Performance budgets, image CDN resizing, query indexes review.
- Move to paid infra when free VM > 70% CPU sustained or > 1,000 orders/day: bigger VM, MongoDB Atlas M10, managed Redis.
- Masked calling, batched rider orders, surge pricing, second city.

---

## How to run each phase with Claude Code

1. Start a session in the repo: *"Write the detailed plan for Phase N from docs/flippin/04-PLAN.md"* → Claude uses the writing-plans skill → saves to `docs/superpowers/plans/`.
2. Execute with **superpowers:subagent-driven-development** (one fresh agent per task, review between tasks) or **superpowers:executing-plans**.
3. Before merging each phase: run `/code-review` on the branch, fix findings, run the full test suite (`superpowers:verification-before-completion`).
4. Update this roadmap's status table.

## Definition of "perfect" (release quality bar)

- `npm run brand:check` passes (no Enatega leakage).
- All CI jobs green: typecheck, lint, unit, contract, build for every app.
- Every P0/P1 feature in 02-FEATURES.md has a passing test or a Maestro/Cypress flow.
- Arabic RTL reviewed on every screen by a native speaker.
- WCAG AA contrast on web; brand contrast rules respected.
- No secrets in git (`gitleaks` CI job).
- Backups restore-tested; runbook for outage, payment failure, rider shortage.
