// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom does not implement window.matchMedia — polyfill it so hooks/components
// relying on media queries (e.g. useIsMobile, Phase 17 mobile calendar) don't
// crash in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  })
}

/*
 * Configure the @nowry/core platform port for every web test.
 *
 * The app does this once in `src/index.js`, before the first render. Tests
 * never run that file, so any shared module reading storage, telemetry or the
 * session through the port would raise PlatformNotConfiguredError. Wiring the
 * real web adapter here means the suite exercises the same adapters production
 * does, rather than a stub that could drift from them.
 *
 * A test that needs to control a capability can call `resetPlatform()` and
 * configure its own — `webPlatform.test.js` does exactly that.
 */
import { configurePlatform, isPlatformConfigured } from '@nowry/core'
import { webPlatform } from './platform/webPlatform'

if (!isPlatformConfigured()) {
  configurePlatform(webPlatform)
}
