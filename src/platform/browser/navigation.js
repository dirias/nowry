/**
 * Browser navigation adapter.
 *
 * Redirects remain browser-specific while API/domain code consumes a small,
 * testable surface that can later be swapped for Expo Router on native.
 */
export const getCurrentLocation = () => {
  if (typeof window === 'undefined') return { pathname: '/', search: '' }

  return {
    pathname: window.location.pathname,
    search: window.location.search
  }
}

export const redirectTo = (url) => {
  if (typeof window === 'undefined') return
  window.location.assign(url)
}
