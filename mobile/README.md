# nowry-mobile

The Expo + React Native client. Expo SDK 57, Expo Router, bundling for iOS and
Android; not yet installed on a device, which needs an Expo account (MOB-005).

    npm install          # at the repository root — links this workspace
    cp .env.example .env # REQUIRED — see below
    npm start -w nowry-mobile

## `mobile/.env` is not optional

A development build loads its JavaScript from **Metro**, and Metro evaluates
`app.config.js` on the developer's machine. The variables EAS holds are baked
into the build's own copy and are irrelevant while you are developing.

Without this file the app starts, reaches `initializeAuth`, and dies with
`auth/invalid-api-key` — an error that points at Firebase and says nothing about
the cause. `src/platform/firebase.js` now throws a message naming the fix
instead.

`app.config.js` is evaluated once when the dev server starts, so creating the
file while the server is running changes nothing. Restart it.

## Two things this scaffold got right the hard way

**One React per bundle.** Expo SDK 57 requires React 19; the web client is on
18.3.1 under CRA and Joy. `@nowry/core` lives outside this directory, so Metro
resolved its `react` by walking up to the repository root and picking up the web
app's copy, while everything here used 19 — two React instances of two versions
in one bundle, which crashes the first shared hook. `@nowry/core` declares react
as a PEER dependency and `metro.config.js` pins `react` and `react-native` to
this client's copy. The bundle is checked by counting React's own version
literal: 19.2.3 once, 18.3.1 never.

**`disableHierarchicalLookup` stays off.** Expo's monorepo guide recommends it.
It is wrong for an npm workspace: npm hoists, several packages sit in a nested
`node_modules` (`@expo/metro-runtime` under `expo-router` among them), and
disabling the upward walk makes Metro unable to find them.

## Configuration

No key is committed. `app.config.js` builds `extra` from the environment; EAS
injects per profile and a developer supplies `mobile/.env` locally. See
`EAS-SECRETS.md` — the Firebase values are the same as the web app's, because
ADR-028 keeps the Firebase JS SDK on both clients.

## The deploy must not install this workspace

`.github/workflows/frontend-deploy.yml` builds only the web client and runs
`npm ci --workspace=@nowry/core --include-workspace-root`, which leaves this
workspace's 151MB of React Native and Expo out of the job. Verified from a wiped
tree; keep it that way.

## Beta build (ADR-039, GTM-009)

The phone joins the private beta through internal distribution, not a store
listing. `eas build --profile beta --platform android` produces an internal
APK; cohort 1 onward installs through the Play Console internal testing
track, cohort 0 may install the APK directly. The build reads
`EXPO_PUBLIC_API_URL` from the EAS environment it is built in (see
EAS-SECRETS.md): point it at the dev API for the beta. Google sign-in on
Android needs the beta build's signing SHA-1 registered in Firebase. While
`BETA_INVITE_REQUIRED` is on, the register screen asks for the invite code
and checks it before creating a Firebase account; a refused Google sign-in is
signed out and told why. There is no waitlist on the phone: testers arrive
with codes.
