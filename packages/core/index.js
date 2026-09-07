/**
 * @nowry/core — the logic both Nowry clients share.
 *
 * Two rules govern every file in this package, and both are load-bearing:
 *
 *   1. NO JSX (ADR-031). `react-scripts` 5 runs its JSX-capable babel-loader
 *      only over `nowry/src`, and webpack resolves this package's symlink to
 *      its real path outside that directory, where the fallback loader has no
 *      JSX transform. A provider here is written with `React.createElement`.
 *
 *   2. NO BROWSER GLOBALS (ADR-026). No `window`, `document`, `localStorage`,
 *      `sessionStorage` or `navigator`, and no `react-dom` or `@mui/*` import.
 *      Anything the environment supplies arrives through the platform port.
 *
 * Both are enforced by the `packages/core/**` override in `.eslintrc.js`.
 */

export { CORE_BOUNDARY, BoundaryContext, BoundaryProvider, readBoundary } from './boundary'

export {
  configurePlatform,
  resetPlatform,
  isPlatformConfigured,
  storage,
  notify,
  auth,
  env,
  telemetry,
  session,
  alerts,
  PlatformNotConfiguredError,
  PlatformAlreadyConfiguredError,
  PlatformAdapterError
} from './platform'
