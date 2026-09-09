/**
 * The mobile app's configuration.
 *
 * A JS config rather than app.json so `extra` can be built from the
 * environment. No key is committed: EAS injects these per build profile, and a
 * developer supplies them locally through `mobile/.env` (gitignored). The names
 * are listed in `.env.example`.
 *
 * `extra` is what `expo-constants` reads at runtime, and it is what the mobile
 * platform adapter's `env` capability is built from (MOB-006).
 */
module.exports = () => ({
  expo: {
    name: 'Nowry',
    slug: 'nowry',
    // The EAS account that owns this project (chosen 2026-09-08).
    owner: 'dirias',
    version: '0.1.0',
    orientation: 'portrait',
    // Deep links use the same route names as the web client, so a link maps
    // without a translation table (see docs/architecture.md).
    scheme: 'nowry',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      bundleIdentifier: 'com.nowry.app',
      supportsTablet: false
    },
    android: {
      package: 'com.nowry.app',
      edgeToEdgeEnabled: true
    },
    plugins: ['expo-router', 'expo-status-bar', 'expo-localization', 'expo-web-browser', 'expo-notifications'],
    experiments: {
      typedRoutes: false
    },
    extra: {
      // Written by hand because `eas init` cannot edit a dynamic config.
      // Identifies this project on EAS; not a secret.
      eas: { projectId: '6e825267-fab2-4276-97a0-f285d1098001' },
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      apiTimeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT || 10000),
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      // Google issues one client ID per platform (MOB-017, ADR-028). The wrong
      // one fails with redirect_uri_mismatch rather than anything useful.
      googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FB_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FB_MSG_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FB_APP_ID
      }
    }
  }
})
