# Flippin — Owner Checklist (Phase 0 hand-off)

Everything on branch `rebrand/flippin` that can be done in code is done. The items below need **your accounts, files or eyes**. Tick them off in order.

## 1. Accounts & ownership (do first)
- [ ] Create GitHub org **`flippin-sa`** (or tell Claude your real org — one constant in `scripts/brand/rebrand.mjs` and the `activity-controller` URL in `flippin-app/package.json` change).
- [ ] Fork `github.com/enatega/activity-controller` into that org. Confirm commit `72b42897aa97ce4e000ecec95d610efa46f54979` exists. **`flippin-app` won't `npm ci` until this exists.**
- [ ] Push this repo to `github.com/flippin-sa/flippin`, open a PR from `rebrand/flippin` → `main`, let the **Brand guard** workflow run.
- [ ] Expo: create org `flippin`; in each of `flippin-app`, `flippin-rider`, `flippin-store` run `npx eas-cli init` (creates new EAS project IDs — the old vendor's IDs were removed).
- [ ] Domain: `rms.flippin.pk` DNS on Cloudflare; plan subdomains `api.`, `api-staging.`, `admin.`, `store-admin.`, `assets.`. (To change domain later: `DOMAIN` / `BUNDLE_PREFIX` in `scripts/brand/rebrand.mjs`, then re-run on a branch.)
- [ ] Confirm bundle IDs before first store upload — they can never change after publishing: `pk.flippin.customer`, `pk.flippin.rider`, `pk.flippin.store`.

## 2. Secrets — new projects (old ones were the previous vendor's)
- [ ] **Firebase** project `flippin`: add Android apps `pk.flippin.customer`, `pk.flippin.rider`, `pk.flippin.store`, iOS app `pk.flippin.customer`, and one Web app.
  - Mobile: upload files as EAS file env vars — `GOOGLE_SERVICES_JSON` (all three apps) and `GOOGLE_SERVICE_INFO_PLIST` (customer app). Replace the local untracked `google-services.json` / `GoogleService-Info.plist` copies (they still contain the old vendor's config).
  - Web: put the six `NEXT_PUBLIC_FIREBASE_*` values in `.env.local` of `flippin-web`, `flippin-admin`, `flippin-singlevendor-admin` (see each `.env.example`). `npm run dev/build` refuses to start without them — by design.
- [ ] **Sentry**: create projects; set `EXPO_PUBLIC_SENTRY_DSN` in `flippin-rider/eas.json` (currently empty) and equivalents for other apps via admin config later.
- [ ] **Google Cloud**: new OAuth clients for Google Sign-In; set `EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID` etc. (iOS Google Sign-In is disabled with a warning until set).
- [ ] Old vendor keys still exist in **git history** (before commit `ddb23c6`). They aren't Flippin's, but never reuse them. CI scans the working tree only (`gitleaks --no-git`).

## 3. Brand files (Tasks 8–9 — need your assets / downloads)
- [ ] **Fonts**: download Satoshi (fontshare.com, free commercial licence) + IBM Plex Sans Arabic (Google Fonts). Then Claude can wire them (plan Task 8).
- [ ] **Assets** (plan Task 9) — export from your brand board:
  - App icon 1024×1024 (Midnight Forest tile + green mark), Android adaptive foreground + `#001B0A` background, splash light/dark, notification icon (white mark, 96px), favicon set, `192.png`/`512.png`, OG image 1200×630.
  - Replace `flippin-store/lib/assets/video/mobile-splash.mp4` (old splash video — contains old-brand metadata).
- [ ] Confirm the exact **Frosted White** hex (currently `#FFFFFF`).

## 4. Visual checks (contrast pass left these for a human)
Run the apps and check these render readable (dark text on Neon Green; dark-green text on white):
- flippin-app: `Status.js:60`, `Item.js:111`, `Menu.js:909–911` (cart badge), `RateAndReview.js:137`, `ActiveOrdersList.js:143`, `PastOrdersList.js:149`, `ScheduledOrdersList.js:168`, Pink theme `primary: '#00D447'` used as text.
- flippin-rider: chat time text (`chat/main/index.tsx:280`), wallet recent-transactions icon.
- flippin-web: decorative strokes in `banner-card`, `assets/svg/location.tsx`; `SideList.tsx:176` dark-mode text on neon.
- flippin-web/DESIGN.md neutrals (Warm Ivory `#f7f6f0`, Pale Sage `#e5ecda`) — retune to the Flippin palette in a design pass.

## 5. Phase 0 remaining verification (plan Task 11)
- [ ] `npm ci` + type-check + lint in all six apps (downloads packages — say "go" and Claude runs it).
- [ ] `npm run build` for the three web apps (needs Firebase env from §2).
- [ ] One EAS preview build of `flippin-app` (needs §1 Expo + §2 Firebase).
- [ ] `/code-review` on the PR, then merge.

## 6. Then: Phase 1 — `flippin-api`
Ask Claude: *"Write the detailed plan for Phase 1 from docs/flippin/04-PLAN.md."*
