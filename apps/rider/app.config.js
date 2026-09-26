const fs = require('fs')
const path = require('path')
const hasFile = (f) => fs.existsSync(path.join(__dirname, f))
const easProjectId = process.env.EAS_PROJECT_ID

const iosGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ||
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY
const androidGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.ANDROID_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY

module.exports = {
  expo: {
    name: 'Flippin Rider',
    description: 'Flippin restaurant management system: order food, track delivery and manage restaurants.',
    version: '1.1.95',
    slug: 'flippin-rider',
    orientation: 'portrait',
    icon: './lib/assets/images/icon.png',
    assetBundlePatterns: ['lib/assets/**/*'],
    scheme: 'com.flippin.rider',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Flippin Multivendor Rider uses your precise location during active deliveries so customers and dispatchers can follow delivery progress even when the app is not in use.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        'expo-splash-screen',
        {
          // Solid per-theme background, no visible logo. The plugin requires an
          // image to generate the native splashscreen_logo drawable, so we pass
          // a 1x1 transparent PNG — only the background color shows. The animated
          // pin / wordmark is drawn by the JS AnimatedSplash component, whose
          // first frame uses these same colors so the handoff shows no flash.
          backgroundColor: '#f4f8f5', // light
          image: './lib/assets/images/splashTransparent.png',
          imageWidth: 1,
          resizeMode: 'contain',
          dark: {
            backgroundColor: '#0b1225', // dark
            image: './lib/assets/images/splashTransparent.png'
          }
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            // Google Play requires new releases to target Android 16 (API 36).
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: '36.0.0'
          }
        }
      ],
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG || 'flippin',
          project: 'flippin-rider-app',
          url: 'https://sentry.io/'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'The app accesses your photos for license, vehicle plate and profile image. Please allow these to continue using the app.'
        }
      ],
      'expo-font',
      'expo-secure-store'
    ],
    platforms: ['ios', 'android'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.flippin.rider',
      config: {
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {})
      },
      icon: './lib/assets/images/icon.png',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '$(PRODUCT_NAME) uses your precise location while you use the app to support pickup and delivery navigation.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          '$(PRODUCT_NAME) shares your precise location during active deliveries so customers and dispatchers can follow delivery progress even when the app is not in use.',
        UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      versionCode: 96,
      ...(hasFile('google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
      config: {
        googleMaps: {
          ...(androidGoogleMapsApiKey ? { apiKey: androidGoogleMapsApiKey } : {})
        }
      },
      package: 'com.flippin.rider',
      icon: './lib/assets/images/appIcon.png',
      adaptiveIcon: {
        foregroundImage: './lib/assets/images/appIcon.png',
        backgroundColor: '#ffffff'
      }
    },
    extra: {
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {})
    },
    experiments: {
      typedRoutes: true
    }
  }
}
