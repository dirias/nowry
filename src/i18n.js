import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '@nowry/core/locales/en/translation.json'
import es from '@nowry/core/locales/es/translation.json'
import fr from '@nowry/core/locales/fr/translation.json'
import de from '@nowry/core/locales/de/translation.json'
import ja from '@nowry/core/locales/ja/translation.json'

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ja: { translation: ja }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja'],
    nonExplicitSupportedLngs: true, // Allows 'es-MX' to map to 'es'
    load: 'languageOnly', // Only load 'es' if 'es-MX' is detected
    interpolation: {
      escapeValue: false // React already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'] // Cache language in local storage
    }
  })

export default i18n
