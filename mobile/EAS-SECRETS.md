# EAS environment variables

No key is committed. `app.config.js` reads these from the environment; EAS
supplies them per build profile, and a developer supplies them locally through
`mobile/.env`.

Per ADR-028 the mobile client runs the same Firebase JS SDK as the web client,
so every `EXPO_PUBLIC_FB_*` value is the **same** as the web app's matching
`REACT_APP_FB_*` value. There is no separate Firebase app to register for email
and password sign-in. Google sign-in is the exception and gets its own OAuth
client IDs in MOB-017.

Set them once per profile, after `npx eas-cli login`:

    npx eas-cli env:create --scope project --environment development --name EXPO_PUBLIC_API_URL --value "http://<your-lan-ip>:8001"
    npx eas-cli env:create --scope project --environment production  --name EXPO_PUBLIC_API_URL --value "https://<deployed-api>"

    # and, for each environment, the six Firebase values:
    #   EXPO_PUBLIC_FB_API_KEY  EXPO_PUBLIC_FB_AUTH_DOMAIN  EXPO_PUBLIC_FB_PROJECT_ID
    #   EXPO_PUBLIC_FB_STORAGE_BUCKET  EXPO_PUBLIC_FB_MSG_SENDER_ID  EXPO_PUBLIC_FB_APP_ID

`EXPO_PUBLIC_SENTRY_DSN` is optional and stays unset until MOB-008.

## Why the development API URL is not `localhost`

A phone runs the app on its own device. `localhost` there is the phone, not this
machine. Use the Mac's LAN address for a device build. A simulator running on
the same Mac can use `http://localhost:8001`.

## Google sign-in (MOB-017)

Google issues a **separate OAuth client ID per platform**, and the wrong one
fails with `redirect_uri_mismatch` rather than anything that names the problem.
Three are needed, from the Google Cloud console of the project Firebase already
uses:

| Variable | Google client type | Notes |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` | iOS | bundle id `com.nowry.app` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | Android | package `com.nowry.app`, plus the build's SHA-1 |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` | Web | already exists — it is what the web client uses |

The Android one needs the signing certificate's SHA-1 fingerprint. For an EAS
build that is EAS's own keystore, not a local one:

    npx eas-cli credentials

Then set them per environment:

    npx eas-cli env:create --scope project --environment development \
      --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS --value "<...>.apps.googleusercontent.com"

Until they are set, the button raises a message naming the missing variable
rather than failing at Google with an opaque redirect error.

**The account is not a duplicate.** Both clients hand Firebase a
`GoogleAuthProvider` credential for the same Google identity in the same
Firebase project, so Firebase resolves them to one user. Nothing in the mobile
flow creates an account.
