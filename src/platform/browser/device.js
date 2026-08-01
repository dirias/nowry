/**
 * Browser device/environment adapter.
 *
 * Keeps direct navigator/window capability checks at the platform boundary so
 * application logic can consume normalized device information. React Native
 * will provide an equivalent implementation using native APIs.
 */

export const getPreferredLanguage = (fallback = 'en') => {
  if (typeof navigator === 'undefined') return fallback

  const language = navigator.languages?.[0] || navigator.language
  if (!language || typeof language !== 'string') return fallback

  return language.split('-')[0].toLowerCase() || fallback
}

export const getPreferredLocale = (fallback = 'en-US') => {
  if (typeof navigator === 'undefined') return fallback

  const locale = navigator.languages?.[0] || navigator.language
  return typeof locale === 'string' && locale.length > 0 ? locale : fallback
}

export const isBrowserOnline = () => {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}
