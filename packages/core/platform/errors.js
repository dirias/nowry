/**
 * Errors the port raises. They are named types rather than bare `Error`s so a
 * caller can tell a misconfiguration apart from a genuine failure inside an
 * adapter, and so the message always says which capability was involved.
 */

export class PlatformNotConfiguredError extends Error {
  constructor(capability) {
    super(
      `@nowry/core: "${capability}" was used before configurePlatform() ran. ` +
        'Each client must call configurePlatform() once, at its entry point, ' +
        'before anything imports a shared module.'
    )
    this.name = 'PlatformNotConfiguredError'
    this.capability = capability
  }
}

export class PlatformAlreadyConfiguredError extends Error {
  constructor() {
    super(
      '@nowry/core: configurePlatform() was called more than once. ' +
        'A second call would leave two adapters live for the same capability. ' +
        'Use resetPlatform() if you are in a test.'
    )
    this.name = 'PlatformAlreadyConfiguredError'
  }
}

export class PlatformAdapterError extends Error {
  constructor(capability, detail) {
    super(`@nowry/core: the "${capability}" adapter is invalid — ${detail}.`)
    this.name = 'PlatformAdapterError'
    this.capability = capability
  }
}
