import { getPreferredLanguage, getPreferredLocale, isBrowserOnline } from './device'

describe('browser device adapter', () => {
  it('normalizes the preferred language to a base language code', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window.navigator, 'languages')
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: ['es-CR', 'en-US'] })

    expect(getPreferredLanguage()).toBe('es')
    expect(getPreferredLocale()).toBe('es-CR')

    if (descriptor) Object.defineProperty(window.navigator, 'languages', descriptor)
  })

  it('falls back when no locale is available', () => {
    expect(getPreferredLanguage('en')).toBeTruthy()
    expect(getPreferredLocale('en-US')).toBeTruthy()
  })

  it('reports browser online state when available', () => {
    expect(typeof isBrowserOnline()).toBe('boolean')
  })
})
