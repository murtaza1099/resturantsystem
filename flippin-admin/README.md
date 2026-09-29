# Flippin Admin

The Flippin admin dashboard (Next.js) for super-admins, vendors, and stores in multivendor mode.

Part of the Flippin monorepo. See the [root README](../README.md) for the overview, status, and brand guard.

## Setup

Requires Node 22+.

```bash
npm ci
cp .env.example .env.local   # fill in the six NEXT_PUBLIC_FIREBASE_* values
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and set the six Firebase values (`NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`) plus the API and vendor mode settings listed there. `predev` and `prebuild` generate the Firebase service worker from them.

## Scripts

- `npm run dev` starts the dev server.
- `npm run build` then `npm start` runs a production build.
