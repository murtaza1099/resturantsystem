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
    description:
      "Flippin is a starter kit food ordering app built in React Native using Expo for IOS and Android. It's made keeping good aesthetics in mind as well keeping the best coding practices in mind. Its fully customisable to easily help you in your next food delivery project. https://market.nativebase.io/view/react-native-food-delivery-backend-app",
    version: '1.1.95',
    slug: 'flippin-rider',
    owner: 'flippin',
    orientation: 'portrait',
    icon: './lib/assets/images/icon.png',
    assetBundlePatterns: ['lib/assets/**/*'],
    scheme: 'pk.flippin.rider',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Flippin Rider uses your precise location during active deliveries so customers and dispatchers can follow delivery progress even when the app is not in use.',
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
          organization: 'flippin',
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
      bundleIdentifier: 'pk.flippin.rider',
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
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          ...(androidGoogleMapsApiKey ? { apiKey: androidGoogleMapsApiKey } : {})
        }
      },
      package: 'pk.flippin.rider',
      icon: './lib/assets/images/appIcon.png',
      adaptiveIcon: {
        foregroundImage: './lib/assets/images/appIcon.png',
        backgroundColor: '#ffffff'
      }
    },
    experiments: {
      typedRoutes: true
    }
  }
}
