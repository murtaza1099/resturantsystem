import { STORE_SERVER_MODES, StoreServerMode } from "@/lib/mode/store-mode";

export interface StoreEnvironment {
  GRAPHQL_URL: string;
  WS_GRAPHQL_URL: string;
  PUBLIC_ACCESS_REQUIRED: boolean;
}

const MULTI_VENDOR_ENVIRONMENT: StoreEnvironment = {
  GRAPHQL_URL: "https://api.rms.flippin.pk/graphql",
  WS_GRAPHQL_URL: "wss://api.rms.flippin.pk/graphql",
  // GRAPHQL_URL: "https://api-backup.rms.flippin.pk/graphql",
  // WS_GRAPHQL_URL: "wss://api-backup.rms.flippin.pk/graphql",
  PUBLIC_ACCESS_REQUIRED: true,
};

const requireReleaseEndpoint = (name: string, value: string | undefined, scheme: string) => {
  if (!__DEV__ && (!value || !value.startsWith(scheme))) {
    throw new Error(`${name} must be configured with ${scheme} for release builds.`);
  }
  return value;
};

const getSingleVendorEnvironment = (): StoreEnvironment => ({
  GRAPHQL_URL:
    requireReleaseEndpoint(
      "EXPO_PUBLIC_SINGLE_VENDOR_GRAPHQL_URL",
      process.env.EXPO_PUBLIC_SINGLE_VENDOR_GRAPHQL_URL,
      "https://",
    ) ?? "https://api.rms.flippin.pk/graphql",
  WS_GRAPHQL_URL:
    requireReleaseEndpoint(
      "EXPO_PUBLIC_SINGLE_VENDOR_WS_GRAPHQL_URL",
      process.env.EXPO_PUBLIC_SINGLE_VENDOR_WS_GRAPHQL_URL,
      "wss://",
    ) ?? "wss://api.rms.flippin.pk/graphql",
  PUBLIC_ACCESS_REQUIRED: true,
});

const getEnvVars = (
  mode: StoreServerMode = STORE_SERVER_MODES.MULTI,
): StoreEnvironment =>
  mode === STORE_SERVER_MODES.SINGLE
    ? getSingleVendorEnvironment()
    : MULTI_VENDOR_ENVIRONMENT;

export default getEnvVars;
