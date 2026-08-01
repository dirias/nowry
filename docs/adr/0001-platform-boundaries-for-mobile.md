# ADR 0001: Platform boundaries for mobile readiness

- Status: Accepted
- Date: 2026-08-02
- Branch: `agent/mobile-migration-prep`
- Production base: `dev` (must not be modified directly)

## Context

Nowry's web client is a React application that currently mixes reusable application/API logic with browser-only capabilities such as `window`, `CustomEvent`, `localStorage`, and browser navigation.

The planned native client will target iOS and Android with React Native/Expo. Direct browser dependencies prevent safe reuse of API and domain logic across web and native clients.

## Decision

Introduce explicit platform boundaries before extracting shared code.

Browser-only capabilities will live under `src/platform/browser/` and expose small adapters for:

- storage
- application events
- navigation

Application and API code should consume these boundaries rather than browser globals directly.

This is an incremental migration. We will not introduce a shared package (`@nowry/core`) until both web and native clients prove which code is genuinely shared.

## Security rules

1. Firebase remains the source of truth for authentication state.
2. New native code must not persist Firebase ID tokens manually unless a concrete requirement proves it necessary.
3. Native Firebase Auth persistence should use the Firebase-supported React Native persistence mechanism.
4. If Nowry later introduces application-owned secrets/session tokens, native secret material must use an OS-backed secure store (for example iOS Keychain / Android Keystore via Expo SecureStore), not AsyncStorage.
5. No secrets, request bodies, or user-generated content should be attached to telemetry by default.

## Compatibility rules

- Existing web behavior must remain unchanged while browser access is centralized.
- `dev` remains production and is never edited directly for this migration.
- Mobile-specific UI will be implemented natively; DOM/MUI components are not treated as shared code.
- API services and domain/state logic are candidates for reuse only after browser dependencies are removed.

## Testing rules

Every new platform adapter must have focused unit tests where practical. Refactors should be small enough to review independently and should preserve existing public behavior.

Before any migration PR is eligible for merge, the web application must pass its existing lint, test, and production build checks.

## Consequences

### Positive

- Reduces coupling between domain logic and the browser.
- Makes native implementation easier without a risky rewrite.
- Improves testability of error handling, storage, and navigation behavior.
- Creates a clear location for platform-specific behavior.

### Trade-offs

- Adds a thin indirection layer to the current web client.
- Some duplication between web and native adapters is intentional.
- Shared-package extraction is deferred until there is evidence that it reduces maintenance rather than increasing abstraction cost.

## Follow-up work

1. Finish moving browser dependencies out of API/auth infrastructure.
2. Audit session/onboarding storage separately from authentication storage.
3. Define the native Firebase bootstrap and persistence strategy.
4. Define Expo Router navigation boundaries.
5. Create `nowry-mobile` only after the reusable-core boundary is stable enough to avoid copying browser-specific code.
