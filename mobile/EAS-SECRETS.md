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

**Custom URI schemes are OFF by default on a new Android OAuth client.** This is
the one that costs an evening. Google now creates Android clients with the
setting disabled, and this app's redirect IS a custom URI scheme, so the client
refuses the request before anything else is checked. It reaches the consent
screen, shows the app's name and logo, and returns:

> Error 400: invalid_request — Custom URI scheme is not enabled for your Android client.

The fix is a toggle, not code: Google Cloud console → APIs and Services →
Credentials → the Android client → Advanced settings → enable **Custom URI
scheme** → Save. It takes a few minutes to propagate.

Worth knowing because the same two words, `invalid_request`, are also what a
wrong client id and an unregistered fingerprint produce. Only the details dialog
separates them, which is why `googleSignIn.js` now puts the redirect and the
client id into the error it throws.

**Google's own rules, which are not obvious and fail identically when broken.**
Both of these surface as `redirect_uri_mismatch`, which reads like a typo in the
client ID rather than a wrong flow, so they are stated here and asserted in
`googleSignIn.test.js`:

- **The redirect is `com.nowry.app:/oauthredirect` — package name, ONE slash —
  and `com.nowry.app` must be the FIRST scheme in `app.config.js`.** Each part
  was established by being wrong first, and each wrong answer is recorded
  because Google reports two of the three identically:
  - **`nowry://oauthredirect`** — refused, `invalid_request`, redirect named in
    the details. The scheme must be the package name.
  - **`com.nowry.app://oauthredirect`** — refused the same way. A custom scheme
    URI has no authority component, and Google checks the difference.
  - **`com.nowry.app:/oauthredirect` while `nowry` was the first scheme** —
    accepted by Google, code returned, and the app never saw it. Expo's Linking
    delivers every callback on the FIRST declared scheme, and
    `openAuthSessionAsync` resolves only for a URL matching the redirect it was
    given. A mismatch does not error: it leaks past the listener to the router,
    which shows "Unmatched Route" with the authorization code in the URL.

  Nothing is typed into the Google console for the redirect; an Android client
  is identified by its package and fingerprint. The scheme order is asserted by
  a test, because getting it backwards fails silently in one direction.
- **The flow is authorization code with PKCE**, not implicit. Google does not
  issue an `id_token` straight to an installed app, and a public client has no
  secret to send.

The Android client also needs the **SHA-1 of the signing certificate the build
actually uses**, which is EAS's, not a local debug keystore:

```bash
cd mobile && npx eas-cli credentials
# Android → the profile you are building → Keystore → read the SHA-1 fingerprint
```

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
