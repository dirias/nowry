/**
 * i18next for the mobile client (MOB-007).
 *
 * The same singleton and the same five locales the web client uses; only the
 * detector differs, because there is no browser to ask. Everything else is
 * copied deliberately, since a difference here would show up as one client
 * translating a string the other does not.
 *
 * The account's saved language still wins once the profile loads — AuthContext
 * calls `changeLanguage` on the same singleton, from @nowry/core.
 */
/*
 * Hermes ships without `Intl.PluralRules`, and i18next needs it to resolve a
 * plural. Its own warning suggests falling back to the v3 JSON format — which
 * would be wrong here: the bundles carry 138 keys in v4 form (`_one` / `_other`)
 * and v3 looks for `_plural`, so the "fix" would silently break every plural in
 * the app.
 *
 * The polyfill is pure JavaScript, so it needs no rebuild. It must be imported
 * before i18next initialises.
 */
import 'intl-pluralrules'
import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { storage } from '@nowry/core'
import de from '@nowry/core/locales/de/translation.json'
import en from '@nowry/core/locales/en/translation.json'
import es from '@nowry/core/locales/es/translation.json'
import fr from '@nowry/core/locales/fr/translation.json'
import ja from '@nowry/core/locales/ja/translation.json'

const STORAGE_KEY = 'i18nextLng'
const SUPPORTED = ['en', 'es', 'fr', 'de', 'ja']

/**
 * Remembered choice first, device language second, English last. Mirrors the
 * web detector's order (`localStorage`, then `navigator`) rather than inventing
 * a new one.
 */
const deviceLanguageDetector = {
  type: 'languageDetector',
  init: () => {},
  detect: () => {
    const saved = storage.get(STORAGE_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
    // `es-MX` must resolve to `es`, as `load: 'languageOnly'` does on the web.
    const device = Localization.getLocales?.()[0]?.languageCode
    return SUPPORTED.includes(device) ? device : 'en'
  },
  cacheUserLanguage: (language) => storage.set(STORAGE_KEY, language)
}

i18n
  .use(deviceLanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja }
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false }
  })

export default i18n
