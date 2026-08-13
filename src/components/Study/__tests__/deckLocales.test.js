import de from '../../../locales/de/translation.json'
import en from '../../../locales/en/translation.json'
import es from '../../../locales/es/translation.json'
import fr from '../../../locales/fr/translation.json'
import ja from '../../../locales/ja/translation.json'

/**
 * FE-D4 — the deck surfaces' copy, guarded in all five locales.
 *
 * A missing key does not throw: i18next renders the key path, so a German user
 * sees "cards.create.addCards" on a button. Three of the five locales had no
 * `cards.create` namespace at all before this phase, which means deck creation
 * has been shipping raw key paths in German, French and Japanese.
 *
 * The retired keys are asserted absent rather than merely unused, because a key
 * that describes an input format the app no longer has — "Tags (comma
 * separated)" after the chip input landed — is worse than no key.
 */
const LOCALES = { en, de, es, fr, ja }
const NON_ENGLISH = ['de', 'es', 'fr', 'ja']

const flatten = (object, prefix = '') =>
  Object.entries(object).reduce((accumulator, [key, value]) => {
    const path = `${prefix}${key}`
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...accumulator, ...flatten(value, `${path}.`) }
      : { ...accumulator, [path]: value }
  }, {})

const namespace = (bundle, path) => path.split('.').reduce((node, key) => node?.[key] ?? {}, bundle)

// Loanwords and proper nouns legitimately match the English source: "Details"
// is the French and German word, and "Description" is the French one.
const LEGITIMATELY_SHARED = new Set(['audio.autoplay', 'identity.description', 'nav.audio', 'nav.identity', 'fields.description'])

describe.each(['cards.create', 'deckSettings'])('%s', (path) => {
  const expected = Object.keys(flatten(namespace(en, path))).sort()

  it('carries exactly the same keys in every locale', () => {
    NON_ENGLISH.forEach((name) => {
      expect({ name, keys: Object.keys(flatten(namespace(LOCALES[name], path))).sort() }).toEqual({ name, keys: expected })
    })
  })

  it('has no empty or whitespace-only value anywhere', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      Object.entries(flatten(namespace(bundle, path))).forEach(([key, value]) => {
        expect(`${name}.${key}:${String(value).trim()}`).not.toMatch(/:$/)
      })
    })
  })

  it('is actually translated — no locale simply copies the English string', () => {
    const source = flatten(namespace(en, path))
    NON_ENGLISH.forEach((name) => {
      const target = flatten(namespace(LOCALES[name], path))
      const copied = Object.keys(source).filter((key) => !LEGITIMATELY_SHARED.has(key) && target[key] === source[key])
      expect({ locale: name, copied }).toEqual({ locale: name, copied: [] })
    })
  })

  it('keeps every interpolation placeholder intact across locales', () => {
    const source = flatten(namespace(en, path))
    const placeholders = (value) => (String(value).match(/{{\s*\w+\s*}}/g) || []).sort()
    Object.keys(source).forEach((key) => {
      NON_ENGLISH.forEach((name) => {
        const target = flatten(namespace(LOCALES[name], path))
        expect({ name, key, at: placeholders(target[key]) }).toEqual({ name, key, at: placeholders(source[key]) })
      })
    })
  })
})

describe('retired keys', () => {
  // Deck editing left this surface, and the chip input made the comma hint a
  // lie. Removed only after a grep confirmed each had no remaining consumer.
  it.each(['editTitle', 'save', 'fields.tags', 'fields.imageUrl'])('cards.create.%s is gone from every locale', (key) => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      expect({ name, key, value: flatten(namespace(bundle, 'cards.create'))[key] }).toEqual({ name, key, value: undefined })
    })
  })
})

describe('the sheet copy the deck surfaces borrow', () => {
  it('has the shared close and cancel strings it renders', () => {
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.common.close).toBeTruthy()
      expect(bundle.common.cancel).toBeTruthy()
    })
  })

  // The shipped toggle labelled itself from `common.front` / `common.back`,
  // which exist only in English — so it rendered the raw key path in the other
  // four locales. `deckSettings.audio.*` is translated everywhere and says what
  // it means, so the toggle reads from that instead.
  it('labels the card sides from a key that is translated everywhere', () => {
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.deckSettings.audio.front).toBeTruthy()
      expect(bundle.deckSettings.audio.back).toBeTruthy()
    })
  })
})
