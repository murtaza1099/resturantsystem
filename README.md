<div align="center">
  <img src="./brand/flippin-logo-dark.svg" alt="Flippin" width="220">
  <h2>Flippin Restaurant Management System</h2>
  <i>Online ordering, delivery, POS and restaurant management in one platform.</i>
</div>

## What's inside

| App | Folder | Tech | For |
| --- | --- | --- | --- |
| Customer website | `apps/web` | Next.js 16, React 19 | Customers ordering on the web |
| Customer app | `apps/customer` | Expo (React Native) | Customers on Android and iOS |
| Rider app | `apps/rider` | Expo (React Native) | Delivery riders |
| Store app | `apps/store` | Expo (React Native) | Restaurants accepting and preparing orders |
| Admin panel | `apps/admin` | Next.js 14 | Platform and restaurant admins (multi-restaurant) |
| Admin panel (single restaurant) | `apps/admin-single` | Next.js 14 | One restaurant brand |

Planned: `backend/` (GraphQL server on Supabase) and `apps/pos` (POS, kitchen display and QR table ordering).

All apps talk to one GraphQL API. Set its address with each app's environment variables (below).

## Getting started

Requirements: Node.js 20+, npm, and for mobile apps the Expo CLI (`npx expo`) and an Expo account for builds.

| App | Develop | Build |
| --- | --- | --- |
| Web | `cd apps/web && npm install && npm run dev` | `npm run build` |
| Admin | `cd apps/admin && npm install && npm run dev` | `npm run build` |
| Admin (single) | `cd apps/admin-single && npm install && npm run dev` | `npm run build` |
| Customer app | `cd apps/customer && npm install && npx expo start` | `npx eas build -p android --profile preview` |
| Rider app | `cd apps/rider && npm install && npx expo start` | `npx eas build -p android --profile preview` |
| Store app | `cd apps/store && npm install && npx expo start` | `npx eas build -p android --profile preview` |

### Environment variables

| App | Variables |
| --- | --- |
| Web, admin | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_WS_SERVER_URL` (API address, e.g. `https://api.flippin.app/`) |
| Mobile apps | See `environment.config.js` / `environment.ts` and the `env` blocks in `eas.json` |
| Mobile builds | `EAS_PROJECT_ID` (from `npx eas init`), `SENTRY_ORG` (rider app), Google Maps keys (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_*`) |

`api.flippin.app` and the other `flippin.app` addresses in the code are placeholders until the domain and API are live.

### Firebase (push notifications)

Firebase config files are not committed. Add your own:

- `apps/customer/google-services.json` and `apps/customer/GoogleService-Info.plist`
- `apps/rider/google-services.json`
- `apps/store/google-services.json`
- Web and admin service workers: replace the `YOUR_FIREBASE_*` values in `apps/web/public/serviceWorker.js`, `apps/web/public/sw.js` and `apps/*/public/firebase-messaging-sw.js`

The mobile apps build without these files; push notifications stay off until they are added.

## Brand assets

The logo lives in `brand/`. To change it, edit `brand/flippin-mark.svg`, then regenerate every icon, splash image and favicon:

```bash
node scripts/generate-brand-assets.cjs
```

## Vendor mode

See [VENDOR_MODE_CONFIGURATION.md](./VENDOR_MODE_CONFIGURATION.md) to run the apps in single-restaurant, multi-restaurant or switchable mode.

## License

MIT. See [LICENSE](./LICENSE).
