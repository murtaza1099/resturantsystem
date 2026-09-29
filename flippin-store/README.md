# Flippin Store

The Flippin store and vendor mobile app (Expo / React Native) for managing orders and menus.

Part of the Flippin monorepo. See the [root README](../README.md) for the overview, status, and brand guard.

## Setup

Requires Node 22+.

```bash
npm ci
npx expo start
```

## Environment

Build profiles and public env vars (API URL, `EXPO_PUBLIC_VENDOR_MODE`) are defined in `eas.json`. Firebase files are supplied through EAS file env vars `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`.

The backend `flippin-api` is Phase 1, so the app will not load data until it exists.
