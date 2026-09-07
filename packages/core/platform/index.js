/**
 * The platform port.
 *
 * `@nowry/core` never reaches an environment directly. Everything a shared
 * module needs from the outside world — persistence, a way to tell the user
 * something, the current auth token, configuration — arrives through this port,
 * and each client supplies its own adapter once at startup.
 *
 * The point is not portability in the abstract. It is that a shared module can
 * be tested with no environment at all, and that the number of places knowing
 * about `localStorage` or MMKV is one per client rather than one per call site.
 *
 * The storage interface is deliberately SYNCHRONOUS (ADR-027). `localStorage`
 * is synchronous and so is MMKV, so the ~33 call sites that move here in MOB-004
 * change by rename rather than by growing an `await` that would ripple into
 * every caller. An adapter that can only be asynchronous does not fit this port,
 * and swapping to one is a deliberate migration, not a drop-in.
 *
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => string | null} get
 * @property {(key: string, value: string) => void} set
 * @property {(key: string) => void} remove
 *
 * @typedef {(message: string, severity?: string) => void} NotifyAdapter
 *
 * @typedef {Object} AuthAdapter
 * @property {() => object} instance          the client's Firebase Auth object (ADR-028)
 * @property {() => object | null} currentUser
 * @property {(forceRefresh?: boolean) => Promise<string | null>} getIdToken
 * @property {() => Promise<object>} signInWithGoogle  web uses a popup, mobile expo-auth-session
 *
 * @typedef {Object} TelemetryAdapter
 * @property {(error: Error, options?: object) => void} captureException
 * @property {(message: string, options?: object) => void} captureMessage
 * @property {(breadcrumb: object) => void} addBreadcrumb
 *
 * @typedef {Object} SessionAdapter
 * @property {(options?: {redirect?: boolean}) => void} onUnauthorized
 * @property {() => void} onSignedOut
 *
 * @typedef {Object} EnvAdapter
 * @property {string} apiUrl
 * @property {number} apiTimeout
 * @property {string | undefined} sentryDsn
 *
 * @typedef {Object} PlatformAdapters
 * @property {StorageAdapter} storage
 * @property {NotifyAdapter} notify
 * @property {AuthAdapter} auth
 * @property {EnvAdapter} env
 * @property {TelemetryAdapter} telemetry
 * @property {SessionAdapter} session
 */
import { PlatformNotConfiguredError, PlatformAlreadyConfiguredError, PlatformAdapterError } from './errors'

export { PlatformNotConfiguredError, PlatformAlreadyConfiguredError, PlatformAdapterError }

/** @type {PlatformAdapters | null} */
let adapters = null

const isFunction = (value) => typeof value === 'function'

/**
 * Validation runs at configure time rather than at first use, so a client that
 * wires the port wrongly fails at startup with a message naming the problem,
 * instead of at whatever call site happens to touch it first.
 */
const validate = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    throw new PlatformAdapterError('platform', 'configurePlatform() expects an object of adapters')
  }

  const { storage, notify, auth, env, telemetry, session } = candidate

  if (!storage || !isFunction(storage.get) || !isFunction(storage.set) || !isFunction(storage.remove)) {
    throw new PlatformAdapterError('storage', 'it must provide get(key), set(key, value) and remove(key)')
  }
  if (!isFunction(notify)) {
    throw new PlatformAdapterError('notify', 'it must be a function taking (message, severity)')
  }
  if (
    !auth ||
    !isFunction(auth.instance) ||
    !isFunction(auth.currentUser) ||
    !isFunction(auth.getIdToken) ||
    !isFunction(auth.signInWithGoogle)
  ) {
    throw new PlatformAdapterError('auth', 'it must provide instance(), currentUser(), getIdToken(forceRefresh) and signInWithGoogle()')
  }
  if (!env || typeof env !== 'object') {
    throw new PlatformAdapterError('env', 'it must be an object carrying apiUrl, apiTimeout and sentryDsn')
  }
  if (typeof env.apiUrl !== 'string' || env.apiUrl.length === 0) {
    throw new PlatformAdapterError('env', 'apiUrl must be a non-empty string')
  }
  if (typeof env.apiTimeout !== 'number' || !Number.isFinite(env.apiTimeout)) {
    throw new PlatformAdapterError('env', 'apiTimeout must be a finite number of milliseconds')
  }
  if (
    !telemetry ||
    !isFunction(telemetry.captureException) ||
    !isFunction(telemetry.captureMessage) ||
    !isFunction(telemetry.addBreadcrumb)
  ) {
    throw new PlatformAdapterError(
      'telemetry',
      'it must provide captureException(error, options), captureMessage(message, options) and addBreadcrumb(breadcrumb)'
    )
  }
  if (!session || !isFunction(session.onUnauthorized) || !isFunction(session.onSignedOut)) {
    throw new PlatformAdapterError('session', 'it must provide onUnauthorized(options) and onSignedOut()')
  }
}

/**
 * Install this client's adapters. Call once, at the entry point, before any
 * shared module is imported for use.
 *
 * @param {PlatformAdapters} candidate
 */
export const configurePlatform = (candidate) => {
  if (adapters !== null) {
    throw new PlatformAlreadyConfiguredError()
  }
  validate(candidate)
  adapters = candidate
}

/** Tests only. Production code has no reason to unconfigure the port. */
export const resetPlatform = () => {
  adapters = null
}

export const isPlatformConfigured = () => adapters !== null

/**
 * Resolved at call time, never at import time — a shared module is imported
 * long before a client finishes wiring itself up.
 */
const capability = (name) => {
  if (adapters === null) {
    throw new PlatformNotConfiguredError(name)
  }
  return adapters[name]
}

/** Synchronous by contract. See ADR-027. */
export const storage = {
  get: (key) => capability('storage').get(key),
  set: (key, value) => capability('storage').set(key, value),
  remove: (key) => capability('storage').remove(key)
}

export const notify = (message, severity = 'error') => capability('notify')(message, severity)

export const auth = {
  /**
   * The client's Firebase Auth object. Both clients run the same SDK (ADR-028)
   * and differ only in how they construct it, so the port supplies the
   * constructed instance rather than re-implementing the operations.
   */
  instance: () => capability('auth').instance(),
  currentUser: () => capability('auth').currentUser(),
  getIdToken: (forceRefresh = false) => capability('auth').getIdToken(forceRefresh),
  /** The one operation that genuinely differs: popup on web, expo-auth-session on mobile. */
  signInWithGoogle: () => capability('auth').signInWithGoogle()
}

/**
 * Error reporting. The web client runs @sentry/react and the mobile client will
 * run @sentry/react-native; neither can be imported here, so the shared capture
 * points call through this and each client supplies its own SDK. Each adapter is
 * responsible for no-opping when its SDK is not initialised.
 */
export const telemetry = {
  captureException: (error, options) => capability('telemetry').captureException(error, options),
  captureMessage: (message, options) => capability('telemetry').captureMessage(message, options),
  addBreadcrumb: (breadcrumb) => capability('telemetry').addBreadcrumb(breadcrumb)
}

/**
 * What happens when a session ends. The shared layer detects the condition — a
 * 401, an explicit sign-out — and the client decides what that means for the
 * person looking at it. On the web that is an event plus a redirect carrying a
 * return path; on mobile it will be a navigation reset.
 *
 * `redirect` exists because the two web call sites genuinely differ today: the
 * Axios interceptor redirects, and the SSE path only announces. Preserved rather
 * than unified, because unifying them is a behaviour change.
 */
export const session = {
  onUnauthorized: (options = {}) => capability('session').onUnauthorized(options),
  onSignedOut: () => capability('session').onSignedOut()
}

/**
 * Read through getters so `env` behaves like the other capabilities: touching it
 * before configuration raises the same named error rather than reading
 * `undefined` off a frozen empty object.
 */
export const env = Object.defineProperties(
  {},
  {
    apiUrl: { enumerable: true, get: () => capability('env').apiUrl },
    apiTimeout: { enumerable: true, get: () => capability('env').apiTimeout },
    sentryDsn: { enumerable: true, get: () => capability('env').sentryDsn }
  }
)
