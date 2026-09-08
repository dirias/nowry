/**
 * The mobile notification sink.
 *
 * The web adapter dispatches a DOM CustomEvent because its shared code runs in
 * a browser and its provider listens on `window`. There is no `window` here, so
 * the transport is an in-process emitter: the port's `notify` publishes, and the
 * mobile notification provider subscribes and renders a Toast.
 *
 * Deliberately tiny rather than pulling in an event-emitter dependency. It has
 * one channel and at most a handful of subscribers.
 */
const subscribers = new Set()

export const publishNotification = (message, severity = 'error') => {
  subscribers.forEach((fn) => {
    try {
      fn({ message, severity })
    } catch {
      // One bad subscriber must not stop the others hearing about it.
    }
  })
}

export const subscribeToNotifications = (fn) => {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

/** The same shape, for the session's unauthorized signal. */
const unauthorizedSubscribers = new Set()

export const publishUnauthorized = () => {
  unauthorizedSubscribers.forEach((fn) => {
    try {
      fn()
    } catch {
      // As above.
    }
  })
}

export const subscribeToUnauthorized = (fn) => {
  unauthorizedSubscribers.add(fn)
  return () => unauthorizedSubscribers.delete(fn)
}
