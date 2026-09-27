# Flippin PRD review (27 Sep 2026)

The PRD is strong: the right product for the market, a sensible "reuse six apps, write one backend" plan, and correct UAE e-invoicing dates. It is not build-ready yet. It has 9 conflicts with the actual code and 8 market gaps. Every fix below is already built into documents 01–04.

## A. Checked against the repo

| PRD says | Repo actually has | Verdict |
| --- | --- | --- |
| 6 apps, about 4,200 files | 6 `enatega-*` apps, 4,187 files | Correct |
| About 186 queries, 185 mutations, 33 subscriptions | 183 / 185 / 32 unique names | Correct (close enough) |
| Web on Next.js 16 / React 19; admins on Next.js 14 | web `next ^16.2.10`; admin `^14.2.35`; single-admin `14.2.5` | Correct |
| Customer and rider on Expo 53, store on Expo 54 | Same | Correct |
| Old Firebase files committed | `google-services.json` ×3, `GoogleService-Info.plist`, 2 `firebase-messaging-sw.js` | Correct; remove them and rotate the keys |
| Images in **Supabase Storage** | Every app uploads straight to **Cloudinary** (`upload_preset`, `CLOUDINARY_*`) | **Conflict.** Keep Cloudinary (free tier) and sign uploads on the server |
| Stripe **Payment Element** | Apps open `SERVER_REST_URL/stripe/create-checkout-session` in a webview and watch for `stripe/success` / `stripe/cancel` | **Conflict.** Backend must serve **REST** Stripe Checkout routes, not only GraphQL |
| 15-minute JWT + rotating refresh token | Only the admin app has refresh logic; customer, rider, store and web send one Bearer token until it expires | **Conflict.** Add a refresh link to 4 apps (ticket FE-003) or users get logged out every 15 min |
| "Ids are uuid" | Apps read `_id` on 160+ places (Mongo-style) | **Conflict.** Database uses uuid; GraphQL exposes it as `_id: ID!` |
| One status model with 10 states | Apps hard-code `PENDING, ACCEPTED, ASSIGNED, PICKED, DELIVERED, COMPLETED, CANCELLED, CANCELLEDBYREST` | **Conflict.** Keep these strings on the wire; add dine-in states in a separate field (see doc 01 §6) |
| RLS "as a second line" with the service key | Service key bypasses RLS | **Wrong.** Server must use its own Postgres role that RLS applies to, and the public Data API must be closed |
| `Configuration` query is harmless | Admin writes Stripe secret key and Twilio token via `save*Configuration`; clients read `configuration` publicly | **Security gap.** Secrets become write-only and live in env vars (doc 03 §5) |
| Repo layout `backend/` + `pos/` (§7) vs `apps/` (§1) | — | **Inconsistent.** Use `apps/*` + `services/api` + `packages/*` |
| Deferred list says "subscriptions/plans" stubbed (§9), but §5.10 makes Flippin Plus P1 | — | **Inconsistent.** Plus is P1 in phase 10 |

## B. Checked against the market (UAE, Sep 2026)

Competitors buyers will compare you with: **Foodics** (UAE/KSA leader: POS, KDS, loyalty, aggregator sync, 60+ marketplace apps), **Sapaad**, **Oracle Micros** (hotels), plus **Deliverect/Grubtech** for aggregator sync.

| # | Gap | Why it matters in the UAE | Fix |
| --- | --- | --- | --- |
| 1 | **Service charge** is a default P0 field | Dubai bans service charges outside hotels. Dubai **hotel** outlets add a 7% municipality fee, and VAT is charged on top of it. Abu Dhabi hotels have their own fees | Replace "service charge" with a configurable **charges engine** (name, %, applies-to, taxable yes/no, order). Defaults per emirate |
| 2 | Prices "VAT-inclusive **or** exclusive" | UAE consumer prices must be shown including VAT | Default inclusive; exclusive only for B2B catering |
| 3 | Aggregator sync is P2 | In Dubai most delivery volume comes through Talabat, Deliveroo, Careem and Noon. Buyers ask about this first | Keep direct APIs at P2, but add **a Deliverect/Grubtech/UrbanPiper connector** as P1: one integration covers all four |
| 4 | No multi-brand / cloud kitchen | Many Dubai kitchens run 3–10 virtual brands | `brands` table: one kitchen, several brands, one KDS (P1) |
| 5 | "Other Gulf countries are configuration" | Saudi Arabia (ZATCA Phase 2) requires signed XML, QR, hash chain and real-time reporting. That is **new code** | Say "UAE first; KSA needs a ZATCA module" |
| 6 | No data-protection line | UAE PDPL (Federal Decree-Law 45/2021) | Consent, export and delete-my-data (doc 03 §9) |
| 7 | Missing daily-ops features competitors have | 86 an item on all channels, busy mode, combos/meal deals, happy-hour pricing, channel pricing (dine-in vs delivery), allergens and calories | Added as P0/P1 tickets |
| 8 | Arabic on thermal receipts | Most ESC/POS printers have no Arabic font | Print receipts as an **image** (render in the browser, rasterise), not as text |

## C. Checked against "free for now"

| Service | Real 2026 free limit | Impact |
| --- | --- | --- |
| Railway | $5 one-time trial, then $5/mo | Replaced with **Oracle Cloud Always Free** (your choice) |
| Oracle Always Free | Ampere A1 reportedly cut to **2 OCPU / 12 GB** in June 2026; 2 AMD micro VMs; 200 GB disk; 20 GB object storage; 10 TB egress | More than enough for the API + Redis. Idle free-tier VMs can be reclaimed; upgrade the account to Pay-As-You-Go (still $0) to avoid that |
| Supabase | 2 projects, 500 MB DB, 1 GB storage, **pauses after 7 days idle**, no downloadable backups on free | Daily keep-alive + nightly `pg_dump` to Oracle Object Storage |
| Supabase networking | Direct DB is IPv6-only; the **session pooler (port 5432)** is IPv4 and supports LISTEN/NOTIFY | Use the session pooler URL from the VM |
| Vercel Hobby | Free, but **non-commercial use only** | Fine for the demo; Pro ($20) when a buyer pays |
| Expo EAS | 15 Android + 15 iOS builds per month | Build locally with `eas build --local` when you run out |
| Google Maps | $200 credit replaced (Mar 2025) by **10,000 free calls per Essentials SKU per month** | Restrict keys; set a $1 budget alert |
| Apple | $99/yr is **required** for TestFlight | No free way; use Expo Go and Android APKs until then |
| Cloudinary | Free plan, 25 monthly credits | Enough for 60+ menu photos |

## D. Will it "produce everything perfectly"?

Not without these three changes, which the documents make:
1. **Build the schema from the apps first** (ticket API-001). Every screen depends on exact field names.
2. **Add REST routes** for Stripe Checkout, Stripe webhooks, uploads signing, receipts and health, next to GraphQL.
3. **Treat money, tax and status transitions as a tested core library** (`packages/core`), shared by server and POS, before any screen work.

Sources: [Supabase free limits](https://uibakery.io/blog/supabase-pricing) · [Railway plans](https://docs.railway.com/pricing/plans) · [Render free](https://render.com/docs/free) · [Expo plans](https://docs.expo.dev/billing/plans/) · [Google Maps March 2025](https://developers.google.com/maps/billing-and-pricing/march-2025) · [UAE e-invoicing](https://www.hawksford.com/insights-and-guides/uae-e-invoicing) · [VATupdate on MD 243/244](https://www.vatupdate.com/2026/07/18/uae-two-ministerial-decisions-set-e-invoicing-scope-and-timeline/) · [UAE simplified invoice](https://www.wafeq.com/en-ae/tax-and-reporting/vat-invoice-requirements-in-uae) · [Dubai service charge](https://blog.slantco.com/what-is-the-service-fee-for-restaurants-in-dubai/) · [Dubai municipality fee](https://blog.slantco.com/what-is-the-tax-on-restaurants-in-dubai/) · [Foodics](https://www.foodics.com/) · [Supabase pooler](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Oracle free tier change](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/) · [Apple Pay in WebView](https://github.com/react-native-webview/react-native-webview/issues/2577)
