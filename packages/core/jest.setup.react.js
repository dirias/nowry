/**
 * Setup for the hooks and contexts, which need a document to render into.
 *
 * The port is NOT configured here. A hook that reads storage or telemetry says
 * so by failing with PlatformNotConfiguredError, and its test opts in with
 * `configureTestPlatform()`. Configuring it globally would hide which hooks
 * actually depend on the environment, which is the one thing this package is
 * trying to keep visible.
 */
import '@testing-library/jest-dom'

/*
 * React 18 only treats `act()` as an act scope when this flag is set. Without
 * it, updates queued inside `act` are not flushed before the assertion runs,
 * and a hook test reads stale state — which looks exactly like a logic bug and
 * is not one. CRA's own setup sets this; a standalone jest config has to.
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true
