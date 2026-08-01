/**
 * Browser application event adapter.
 *
 * Keeps DOM CustomEvent usage at the platform boundary. Callers only depend
 * on emit/subscribe semantics, which can be replaced by a native event bus in
 * React Native without changing API or domain logic.
 */
export const emitAppEvent = (name, detail) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export const subscribeAppEvent = (name, handler) => {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {}
  }

  const listener = (event) => handler(event?.detail)
  window.addEventListener(name, listener)

  return () => window.removeEventListener(name, listener)
}
