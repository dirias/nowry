/**
 * CURATE-006 — every key this dialog calls must actually exist.
 *
 * Nine keys shipped that no bundle defined, so users read
 * "cards.generatedCards.regenerate.auto" as a menu item. `localeCoverage.test.js`
 * cannot catch that: it compares `en` against the other four bundles, and a key
 * missing from all five is perfectly consistent. Nothing was comparing the
 * bundles against the *code*.
 *
 * So this reads the sources and resolves every i18n-looking literal in them.
 * Scoped to this dialog rather than the whole app on purpose — a repo-wide
 * version is worth having, but it would land as a pile of pre-existing failures
 * belonging to other features, and this suite has to stay green to be useful.
 */
import fs from 'fs'
import path from 'path'

import en from '../../../locales/en/translation.json'

const SOURCES = ['GeneratedCards.js', 'GeneratedCard.js', 'GeneratedCardEditor.js']

const TOP_LEVEL = new Set(Object.keys(en))

/**
 * Single-quoted dotted literals whose first segment names a real bundle root.
 * Broader than matching `t(...)` alone, because keys also travel as props —
 * `labelKey`, `placeholderKey`, and an `errorKey` picked inside a ternary.
 */
const KEY_PATTERN = /'([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+)'/g

const keysIn = (source) => Array.from(source.matchAll(KEY_PATTERN), (match) => match[1]).filter((key) => TOP_LEVEL.has(key.split('.')[0]))

/** i18next resolves `foo` against `foo_other` when the call passes a count. */
const resolves = (key) =>
  [key, `${key}_other`].some(
    (candidate) =>
      candidate.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), en) !== undefined
  )

describe('the generated-cards dialog references only keys that exist', () => {
  it.each(SOURCES)('%s', (file) => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    const referenced = [...new Set(keysIn(source))]

    expect(referenced.length).toBeGreaterThan(0)
    expect(referenced.filter((key) => !resolves(key))).toEqual([])
  })
})
