/**
 * learningTaxonomy invariants.
 *
 * This suite exists because of a real production bug: the onboarding wizard
 * persisted lowercase snake_case interests while account settings declared its
 * own Title-Case array, so users saw none of their choices selected and every
 * toggle appended a duplicate. These tests turn that class of drift into a
 * build failure instead of a support ticket.
 *
 * Dependency-free: imports the constants module and the locale JSON directly,
 * no i18next runtime, no component mocks.
 */
import { TOPICS, STUDY_GOALS, MAX_TOPICS, derivePrimaryTopic, isValidTopic } from '../learningTaxonomy'

import en from '../../locales/en/translation.json'
import es from '../../locales/es/translation.json'
import fr from '../../locales/fr/translation.json'
import de from '../../locales/de/translation.json'
import ja from '../../locales/ja/translation.json'

const LOCALES = { en, es, fr, de, ja }

/** Walk a dotted i18n key, returning undefined if any segment is missing. */
const resolveKey = (bundle, key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)

const ENTRIES = [
  ['TOPICS', TOPICS],
  ['STUDY_GOALS', STUDY_GOALS]
]

describe('learningTaxonomy — shape', () => {
  it('exports 14 topics and 5 study goals', () => {
    expect(TOPICS).toHaveLength(14)
    expect(STUDY_GOALS).toHaveLength(5)
  })

  it('caps topic selection at 5', () => {
    expect(MAX_TOPICS).toBe(5)
  })

  it('exposes the exact 14 canonical topic values agreed with the API', () => {
    // Must stay byte-identical to the backend's Literal constraint.
    expect(TOPICS.map((topic) => topic.value)).toEqual([
      'artificial_intelligence',
      'technology',
      'science',
      'mathematics',
      'history',
      'languages',
      'literature',
      'art',
      'music',
      'business',
      'health',
      'philosophy',
      'design',
      'psychology'
    ])
  })

  it('exposes the exact 5 canonical goal values', () => {
    expect(STUDY_GOALS.map((goal) => goal.value)).toEqual(['general', 'academic', 'career', 'language', 'hobby'])
  })
})

describe.each(ENTRIES)('learningTaxonomy — %s value invariants', (name, entries) => {
  it('uses lowercase snake_case for every value', () => {
    entries.forEach((entry) => {
      expect(entry.value).toMatch(/^[a-z][a-z_]*$/)
    })
  })

  it('contains no duplicate values', () => {
    const values = entries.map((entry) => entry.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('declares an i18nKey for every entry', () => {
    entries.forEach((entry) => {
      expect(typeof entry.i18nKey).toBe('string')
      expect(entry.i18nKey.length).toBeGreaterThan(0)
    })
  })
})

describe('learningTaxonomy — i18n coverage', () => {
  const cases = ENTRIES.flatMap(([, entries]) => entries).flatMap((entry) => Object.keys(LOCALES).map((locale) => [locale, entry.i18nKey]))

  it.each(cases)('resolves %s -> %s to a non-empty string', (locale, i18nKey) => {
    const value = resolveKey(LOCALES[locale], i18nKey)
    expect(typeof value).toBe('string')
    expect(value.trim()).not.toBe('')
  })

  it('has no leftover duplicate taxonomy namespaces in any locale', () => {
    Object.entries(LOCALES).forEach(([locale, bundle]) => {
      // These were merged into taxonomy.*; a reappearance means drift is back.
      expect(resolveKey(bundle, 'onboarding.interests.items')).toBeUndefined()
      expect(resolveKey(bundle, 'onboarding.learning.goals')).toBeUndefined()
      expect(resolveKey(bundle, 'onboarding.focus.topics')).toBeUndefined()
      expect(resolveKey(bundle, 'onboarding.learning.styles')).toBeUndefined()
      expect(locale).toBeTruthy()
    })
  })
})

describe('derivePrimaryTopic', () => {
  it('returns the first interest', () => {
    expect(derivePrimaryTopic(['history', 'music'])).toBe('history')
  })

  it('returns null for an empty or missing list', () => {
    expect(derivePrimaryTopic([])).toBeNull()
    expect(derivePrimaryTopic(undefined)).toBeNull()
    expect(derivePrimaryTopic(null)).toBeNull()
  })
})

describe('isValidTopic', () => {
  it('accepts every canonical value', () => {
    TOPICS.forEach((topic) => {
      expect(isValidTopic(topic.value)).toBe(true)
    })
  })

  it('rejects the Title-Case forms that caused the original bug', () => {
    expect(isValidTopic('Technology')).toBe(false)
    expect(isValidTopic('Science')).toBe(false)
  })

  it('rejects unknown values', () => {
    expect(isValidTopic('astrology')).toBe(false)
    expect(isValidTopic('')).toBe(false)
    expect(isValidTopic(undefined)).toBe(false)
  })
})
