import de from '../../../../locales/de/translation.json'
import en from '../../../../locales/en/translation.json'
import es from '../../../../locales/es/translation.json'
import fr from '../../../../locales/fr/translation.json'
import ja from '../../../../locales/ja/translation.json'

/**
 * The form system's shared namespace, guarded in all five locales.
 *
 * A missing key does not throw at runtime — i18next renders the key path
 * instead, so a German user sees "form.saveAndNext" on a button. The only way
 * that is caught before a user finds it is here.
 */
const LOCALES = { en, de, es, fr, ja }
const NON_ENGLISH = ['de', 'es', 'fr', 'ja']

/**
 * A locale only owes the plural forms its own CLDR rules can select. Japanese
 * has a single `other` category, so `addedCount_one` is not a gap there — it is
 * a key i18next can never reach. ONB-015 dropped it; the rule itself lives in
 * `src/locales/__tests__/localeCoverage.test.js`.
 */
const PLURAL_CATEGORIES = Object.keys(LOCALES).reduce((acc, name) => {
  acc[name] = new Set(new Intl.PluralRules(name).resolvedOptions().pluralCategories)
  return acc
}, {})

const owes = (name, key) => {
  const suffix = /_(zero|one|two|few|many|other)$/.exec(key)
  return !suffix || PLURAL_CATEGORIES[name].has(suffix[1])
}

describe('form.* namespace', () => {
  it('exists at the top level of every locale', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      expect(typeof bundle.form).toBe('object')
      expect(name && bundle.form).toBeTruthy()
    })
  })

  it('carries exactly the same keys in every locale', () => {
    NON_ENGLISH.forEach((name) => {
      const expected = Object.keys(en.form)
        .filter((key) => owes(name, key))
        .sort()
      expect(Object.keys(LOCALES[name].form).sort()).toEqual(expected)
    })
  })

  it('has no empty or whitespace-only value anywhere', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      Object.entries(bundle.form).forEach(([key, value]) => {
        expect(`${name}.${key}:${String(value).trim()}`).not.toMatch(/:$/)
      })
    })
  })

  it('is actually translated — no locale simply copies the English string', () => {
    // Proper nouns and loanwords legitimately match: "Tags" is the German word,
    // and every locale writes {{count}}/{{tag}} interpolation the same way.
    const legitimatelyShared = new Set(['tagsLabel', 'deckLabel', 'addedCount_one', 'addedCount_other'])
    NON_ENGLISH.forEach((name) => {
      const copied = Object.keys(en.form).filter(
        (key) => owes(name, key) && !legitimatelyShared.has(key) && LOCALES[name].form[key] === en.form[key]
      )
      expect({ locale: name, copied }).toEqual({ locale: name, copied: [] })
    })
  })

  it('uses i18next v4 plural suffixes, never the deprecated _plural', () => {
    Object.entries(LOCALES).forEach(([name, bundle]) => {
      expect(Object.keys(bundle.form).filter((key) => key.endsWith('_plural'))).toEqual([])
      expect(bundle.form.addedCount_other).toBeDefined()
      if (owes(name, 'addedCount_one')) expect(bundle.form.addedCount_one).toBeDefined()
    })
  })

  it('keeps every interpolation placeholder intact across locales', () => {
    const placeholders = (value) => (String(value).match(/{{\s*\w+\s*}}/g) || []).sort()
    Object.keys(en.form).forEach((key) => {
      NON_ENGLISH.filter((name) => owes(name, key)).forEach((name) => {
        expect({ name, key, at: placeholders(LOCALES[name].form[key]) }).toEqual({
          name,
          key,
          at: placeholders(en.form[key])
        })
      })
    })
  })

  it('reuses the shared close/cancel/save strings rather than duplicating them', () => {
    // §13 rules out a second "Cancel"; `common.close` already ships translated
    // in all five locales, so FormSheet uses it and form.close is not added.
    Object.values(LOCALES).forEach((bundle) => {
      expect(bundle.form.close).toBeUndefined()
      expect(bundle.form.cancel).toBeUndefined()
      expect(bundle.form.save).toBeUndefined()
      expect(bundle.common.close).toBeTruthy()
    })
  })
})
