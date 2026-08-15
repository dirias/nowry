/**
 * Five-locale coverage (ONB-015 / NFR-008 … NFR-012).
 *
 * This suite exists because three separate tasks each tripped over the *same*
 * class of bug from a different direction: `taxonomy.topics.*` was English in
 * all four non-English bundles, so was `common.retry`, so was
 * `onboarding.error.saveFailed`. None of them was missing — every key resolved,
 * every screen rendered, and a Spanish user read "Science". A key-presence check
 * would have passed all three.
 *
 * So the suite asserts two different things, and the second one is the point:
 *
 *   1. **Presence.** Every key `en` declares exists in `es`, `fr`, `de` and `ja`.
 *   2. **Difference.** Every key's value *differs* from `en`, because a value
 *      copied verbatim from English is untranslated, not translated.
 *
 * Both are ledger-backed by `./localeDebt.json`. The live bundles must match
 * that file **exactly** — not "be a subset of it". That cuts both ways on
 * purpose: adding a key to `en` and forgetting the other four fails, and
 * translating one without deleting its ledger line fails too. The ledger can
 * only shrink, and its length is the honest size of the remaining debt.
 *
 *     CI=true UPDATE_LOCALE_DEBT=1 npx react-scripts test --testPathPattern=localeCoverage
 *
 * rewrites the ledger from the live bundles, the way `--updateSnapshot` does.
 * Use it after translating something; never use it to make a red build green.
 *
 * The onboarding surfaces themselves are held to a stricter rule: they may not
 * appear in the ledger at all (`STRICT_PREFIXES` below). Debt is allowed to
 * exist in this repo; it is not allowed to exist in onboarding.
 *
 * Dependency-free apart from i18next itself, which the fallback suite boots for
 * real — asserting on `t()` rather than on the JSON is the only way to prove
 * NFR-012, since the fallback lives in i18next's resolver, not in the bundles.
 */
import fs from 'fs'
import path from 'path'

import i18next from 'i18next'

import en from '../en/translation.json'
import es from '../es/translation.json'
import fr from '../fr/translation.json'
import de from '../de/translation.json'
import ja from '../ja/translation.json'
import committedDebt from './localeDebt.json'

const BUNDLES = { en, es, fr, de, ja }
const TARGETS = ['es', 'fr', 'de', 'ja']

/**
 * Every key path in a bundle, flattened to dotted notation. Arrays flatten by
 * index (`legal.terms.conduct.items.2`) because i18next addresses them that way
 * and because a locale quietly shipping a shorter list is the same defect as a
 * locale quietly shipping a missing key.
 */
const flatten = (node, prefix = '') =>
  Object.entries(node).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' ? { ...acc, ...flatten(value, path) } : { ...acc, [path]: value }
  }, {})

const FLAT = Object.fromEntries(Object.entries(BUNDLES).map(([locale, bundle]) => [locale, flatten(bundle)]))
const EN_KEYS = Object.keys(FLAT.en)

/**
 * A locale only owes the plural forms its own CLDR rules can select. Japanese
 * has a single category, so `_one` is not a gap there — it is noise. Deriving
 * this from `Intl` rather than hard-coding it means the rule survives a sixth
 * locale being added.
 */
const CATEGORIES = Object.fromEntries(
  TARGETS.concat('en').map((l) => [l, new Set(new Intl.PluralRules(l).resolvedOptions().pluralCategories)])
)
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']

/** `null` when the key is not a plural form, otherwise its CLDR category. */
const pluralCategory = (key) => PLURAL_SUFFIXES.find((category) => key.endsWith(`_${category}`)) ?? null

/** Does `locale` owe a translation for this key at all? */
const isOwed = (locale, key) => {
  const category = pluralCategory(key)
  return category === null || CATEGORIES[locale].has(category)
}

/** Keys `en` declares that this locale does not have (and legitimately owes). */
const missingIn = (locale) => EN_KEYS.filter((key) => isOwed(locale, key) && !(key in FLAT[locale]))

/** Keys whose value is byte-identical to English — i.e. never translated. */
const untranslatedIn = (locale) =>
  EN_KEYS.filter(
    (key) => key in FLAT[locale] && typeof FLAT.en[key] === 'string' && FLAT.en[key].trim() !== '' && FLAT[locale][key] === FLAT.en[key]
  )

/**
 * The surfaces ONB-015 is accountable for: the onboarding journey, the taxonomy
 * both it and Account Settings render, the Home re-entry card and the Settings
 * section that edits the same preferences. `common.retry` is reached from every
 * onboarding network-error banner and is in scope by that route alone.
 */
const STRICT_PREFIXES = ['onboarding.', 'taxonomy.', 'home.onboardingReentry.', 'settings.learning.']
const STRICT_EXTRA_KEYS = ['common.retry']
const isStrict = (key) => STRICT_PREFIXES.some((prefix) => key.startsWith(prefix)) || STRICT_EXTRA_KEYS.includes(key)
const STRICT_KEYS = EN_KEYS.filter(isStrict)

/**
 * Values that are *supposed* to match English. Each entry needs a reason: this
 * list is the only escape hatch from the "difference" rule, so an unexplained
 * entry here is how the next `taxonomy.topics` gets through.
 */
const IDENTICAL_BY_DESIGN = {
  es: [],
  // "Business" and "Design" are the words French and German actually use.
  fr: ['taxonomy.topics.business', 'taxonomy.topics.design'],
  de: ['taxonomy.topics.design'],
  ja: []
}

/**
 * The ledger, recomputed from the live bundles. Run the suite with
 * `UPDATE_LOCALE_DEBT=1` to rewrite `localeDebt.json` from this — the same
 * ergonomics as a snapshot update, and the reason the checked-in file can never
 * drift from the rule that reads it.
 */
const buildLedger = () => ({
  $comment: committedDebt.$comment,
  missing: Object.fromEntries(TARGETS.map((locale) => [locale, missingIn(locale).sort()])),
  untranslated: Object.fromEntries(
    TARGETS.map((locale) => [
      locale,
      untranslatedIn(locale)
        .filter((key) => !IDENTICAL_BY_DESIGN[locale].includes(key))
        .sort()
    ])
  )
})

const debt = (() => {
  if (!process.env.UPDATE_LOCALE_DEBT) return committedDebt
  const rebuilt = buildLedger()
  fs.writeFileSync(path.join(__dirname, 'localeDebt.json'), `${JSON.stringify(rebuilt, null, 2)}\n`)
  return rebuilt
})()

describe('locale bundles — every value is renderable', () => {
  describe.each(Object.keys(BUNDLES))('%s', (locale) => {
    it('has no blank or whitespace-only value', () => {
      const blank = Object.entries(FLAT[locale])
        .filter(([, value]) => typeof value === 'string' && value.trim() === '')
        .map(([key]) => key)
      expect(blank).toEqual([])
    })

    it('stores only strings at the leaves', () => {
      const wrong = Object.entries(FLAT[locale])
        .filter(([, value]) => typeof value !== 'string')
        .map(([key]) => key)
      expect(wrong).toEqual([])
    })

    it('never ships a raw internal key as a value (NFR-012)', () => {
      // `books.import.titlePlaceholder` was exactly this shape in three bundles.
      const rawKey = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/
      const leaked = Object.entries(FLAT[locale])
        .filter(([, value]) => typeof value === 'string' && rawKey.test(value.trim()))
        .map(([key]) => key)
      expect(leaked).toEqual([])
    })

    it('carries no legacy `_plural` key — dead since i18next v23', () => {
      expect(Object.keys(FLAT[locale]).filter((key) => key.endsWith('_plural'))).toEqual([])
    })
  })
})

describe('locale bundles — key parity with en', () => {
  it.each(TARGETS)('%s is missing exactly the keys the debt ledger records', (locale) => {
    expect(missingIn(locale).sort()).toEqual([...debt.missing[locale]].sort())
  })

  it.each(TARGETS)('%s declares no key that en does not', (locale) => {
    const orphans = Object.keys(FLAT[locale]).filter((key) => !(key in FLAT.en))
    expect(orphans).toEqual([])
  })

  it.each(TARGETS)('%s has every plural form its own CLDR rules can select', (locale) => {
    const bases = new Set(EN_KEYS.filter((key) => pluralCategory(key)).map((key) => key.slice(0, key.lastIndexOf('_'))))
    const gaps = []
    bases.forEach((base) => {
      if (!Object.keys(FLAT[locale]).some((key) => key.startsWith(`${base}_`))) return // absent entirely; the ledger owns it
      CATEGORIES[locale].forEach((category) => {
        // Only the categories en itself declares — nobody owes a `_many` form
        // English never wrote. That gap is reported, not enforced, for now.
        if (!(`${base}_${category}` in FLAT.en)) return
        if (!(`${base}_${category}` in FLAT[locale])) gaps.push(`${base}_${category}`)
      })
    })
    expect(gaps).toEqual([])
  })
})

describe('locale bundles — untranslated English', () => {
  it.each(TARGETS)('%s repeats English on exactly the keys the debt ledger records', (locale) => {
    const actual = untranslatedIn(locale).filter((key) => !IDENTICAL_BY_DESIGN[locale].includes(key))
    expect(actual.sort()).toEqual([...debt.untranslated[locale]].sort())
  })
})

describe('onboarding surfaces — no debt allowed (NFR-008)', () => {
  it('covers a non-trivial number of keys', () => {
    // Guards the guard: a typo in STRICT_PREFIXES would silently pass everything.
    expect(STRICT_KEYS.length).toBeGreaterThan(150)
  })

  it.each(TARGETS)('%s translates every onboarding key', (locale) => {
    const gaps = STRICT_KEYS.filter((key) => isOwed(locale, key) && !(key in FLAT[locale]))
    expect(gaps).toEqual([])
  })

  it.each(TARGETS)('%s says every onboarding string in its own words', (locale) => {
    const english = untranslatedIn(locale).filter((key) => isStrict(key) && !IDENTICAL_BY_DESIGN[locale].includes(key))
    expect(english).toEqual([])
  })

  it.each(TARGETS)('%s keeps no onboarding key in the debt ledger', (locale) => {
    const excused = [...debt.missing[locale], ...debt.untranslated[locale]].filter(isStrict)
    expect(excused).toEqual([])
  })

  it('names official content in text, never in an image alone (NFR-009)', () => {
    // The only "official" signal a screen reader or a translator can reach.
    const labels = ['onboarding.firstDeck.official.label', 'onboarding.firstDeck.official.accessible']
    Object.keys(BUNDLES).forEach((locale) => {
      labels.forEach((key) => {
        expect(typeof FLAT[locale][key]).toBe('string')
        expect(FLAT[locale][key].trim()).not.toBe('')
      })
    })
    expect(FLAT.en['onboarding.firstDeck.official.accessible']).toContain('{{publisher}}')
  })
})

describe('essential actions survive expansion and CJK typography (NFR-010)', () => {
  /**
   * Every label that sits inside a button. These are the strings that truncate
   * first, and truncating one costs the user the action itself. German is the
   * expansion case; the budget is deliberately close to the current worst
   * offender ("Zu meiner Bibliothek hinzufügen", 31) so that adding a longer one
   * is a decision somebody makes on purpose.
   */
  const ACTION_KEYS = [
    'onboarding.back',
    'onboarding.save.retry',
    'onboarding.shell.retry',
    'onboarding.welcome.begin',
    'onboarding.welcome.postpone',
    'onboarding.personalization.continue',
    'onboarding.personalization.skip',
    'onboarding.firstDeck.finish',
    'onboarding.firstDeck.card.add',
    'onboarding.firstDeck.card.retry',
    'onboarding.firstDeck.success.open',
    'onboarding.firstDeck.success.later',
    'onboarding.firstDeck.empty.fallbackAction',
    'onboarding.firstDeck.missingTopic.action',
    'home.onboardingReentry.cta',
    'home.onboardingReentry.dismiss',
    'settings.learning.discard',
    'common.retry'
  ]

  // CJK glyphs occupy roughly two Latin advance widths, so Japanese gets half.
  const BUDGET = { en: 34, es: 34, fr: 34, de: 34, ja: 17 }

  it.each(Object.keys(BUNDLES))('%s keeps every action label complete', (locale) => {
    const overflowing = ACTION_KEYS.filter((key) => (FLAT[locale][key] ?? '').length > BUDGET[locale]).map(
      (key) => `${key} (${FLAT[locale][key].length})`
    )
    expect(overflowing).toEqual([])
  })

  it.each(Object.keys(BUNDLES))('%s has a real string for every action label', (locale) => {
    ACTION_KEYS.forEach((key) => {
      expect(typeof FLAT[locale][key]).toBe('string')
      expect(FLAT[locale][key].trim()).not.toBe('')
    })
  })

  it('writes Japanese action labels without ASCII word spaces', () => {
    // Japanese does not separate words with spaces; one in a button label is a
    // half-translated fragment, and it is also where the line will break.
    const spaced = ACTION_KEYS.filter((key) => /\s/.test(FLAT.ja[key]))
    expect(spaced).toEqual([])
  })
})

describe('missing translations fall back readably (NFR-012)', () => {
  const DELIBERATELY_MISSING = 'onb015.fallbackProbe'
  let i18n

  beforeAll(async () => {
    i18n = i18next.createInstance()
    await i18n.init({
      lng: 'es',
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'fr', 'de', 'ja'],
      resources: {
        // The real bundles, plus one key that exists only in English — the
        // shape of every future key somebody forgets to translate.
        en: { translation: { ...en, onb015: { fallbackProbe: 'Readable English fallback' } } },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        ja: { translation: ja }
      },
      interpolation: { escapeValue: false }
    })
  })

  it.each(TARGETS)('serves the English string to %s rather than the key', async (locale) => {
    await i18n.changeLanguage(locale)
    const value = i18n.t(DELIBERATELY_MISSING)
    expect(value).toBe('Readable English fallback')
    expect(value).not.toBe(DELIBERATELY_MISSING)
    expect(value.trim()).not.toBe('')
  })

  it.each(TARGETS)('resolves every onboarding key in %s to prose, not a key', async (locale) => {
    await i18n.changeLanguage(locale)
    const unresolved = STRICT_KEYS.filter((key) => {
      if (pluralCategory(key)) return false // reached through `count`, not by name
      const value = i18n.t(key)
      return typeof value !== 'string' || value.trim() === '' || value === key
    })
    expect(unresolved).toEqual([])
  })

  it('resolves plural onboarding copy for one and for many', async () => {
    await i18n.changeLanguage('ja')
    expect(i18n.t('onboarding.firstDeck.card.count', { count: 1 })).toBe('カード1枚')
    await i18n.changeLanguage('de')
    expect(i18n.t('onboarding.firstDeck.card.count', { count: 1 })).toBe('1 Karte')
    expect(i18n.t('onboarding.firstDeck.card.count', { count: 4 })).toBe('4 Karten')
  })

  it('switching language re-reads every mounted string (NFR-011)', async () => {
    // The Welcome control calls i18n.changeLanguage; this is the guarantee it
    // relies on — the same key yields a different language on the next read.
    const key = 'onboarding.welcome.begin'
    const rendered = {}
    for (const locale of ['en', ...TARGETS]) {
      await i18n.changeLanguage(locale)
      rendered[locale] = i18n.t(key)
    }
    expect(new Set(Object.values(rendered)).size).toBe(5)
  })
})
