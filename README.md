# Flippin

Flippin is a multi-category local delivery marketplace launching in Saudi Arabia: restaurants first, plus grocery, pharmacy, and shops. It is Arabic-first (RTL) with English support, priced in SAR with 15% VAT. This monorepo holds the customer, rider, and store apps and the admin dashboards; the backend (`flippin-api`) is planned for Phase 1.

## Apps

| Folder | Tech | Used by |
| --- | --- | --- |
| `flippin-app` | Expo / React Native | Customers (mobile) |
| `flippin-rider` | Expo / React Native | Delivery riders |
| `flippin-store` | Expo / React Native | Store and restaurant owners |
| `flippin-web` | Next.js, PWA | Customers (website) |
| `flippin-admin` | Next.js | Super-admin, vendors, stores |
| `flippin-singlevendor-admin` | Next.js | Single-vendor operators |

## Status

Phase 0 (rebrand to Flippin) is done. The backend `flippin-api` (Node, Apollo GraphQL, MongoDB, Redis) is Phase 1 and is not in this repo yet. Apps point at `https://api.rms.flippin.pk/graphql` (staging: `https://api-staging.rms.flippin.pk/graphql`), so they will not load data until it exists.

## Getting started

Requires Node 22+. Run these inside the app folder.

Web apps (`flippin-web`, `flippin-admin`, `flippin-singlevendor-admin`):

```bash
npm ci
cp .env.example .env.local   # fill in the six NEXT_PUBLIC_FIREBASE_* values
npm run dev
```

The six Firebase values are `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, and `_APP_ID`. The `predev` and `prebuild` scripts use them to generate the Firebase service worker.

Mobile apps (`flippin-app`, `flippin-rider`, `flippin-store`):

```bash
npm ci
npx expo start
```

Firebase config files come from EAS file environment variables `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`.

## Vendor mode

The apps support `SINGLE`, `MULTI`, and `TOGGLE` vendor modes via `EXPO_PUBLIC_VENDOR_MODE` (mobile) and `NEXT_PUBLIC_VENDOR_MODE` (web). See [VENDOR_MODE_CONFIGURATION.md](VENDOR_MODE_CONFIGURATION.md).

## Brand guard

A script keeps stale names out of the codebase:

```bash
npm run brand:check    # fails on forbidden legacy names
npm run test:scripts   # tests for the brand and Firebase service-worker scripts
```

Brand colours: Neon Green `#00FD54`, Midnight Forest `#001B0A`, Frosted White `#FFFFFF`, link green `#007A29`. Fonts: Satoshi (Latin) and IBM Plex Sans Arabic.

## Docs

- [Product requirements](docs/flippin/01-PRD.md)
- [Features](docs/flippin/02-FEATURES.md)
- [Flows](docs/flippin/03-FLOWS.md)
- [Plan](docs/flippin/04-PLAN.md)

## Credits

Flippin includes software derived from an open-source MIT-licensed project. See [NOTICE.md](NOTICE.md).

## License

MIT. See [LICENSE](LICENSE).
