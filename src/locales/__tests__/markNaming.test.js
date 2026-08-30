/**
 * MARK-006 — the mark must never be called "hard" or "difficult", in any locale.
 *
 * This is not style policing. ADR-010 makes the mark an axis SM-2 cannot see,
 * and a control labelled "Hard" tells the user the algorithm should react to it.
 * When it correctly does nothing, that reads as a bug — so the naming is part of
 * the decision, not decoration around it.
 *
 * The guard is a test rather than a review note because the failure is invisible
 * at the call site: a translator, or a future key, can reintroduce the word
 * without touching a line of the code that depends on it being absent. The word
 * lists are per-locale on purpose; asserting only on English would let exactly
 * the case that matters through.
 *
 * Scope is the mark's own strings. `cards.session.grading.hard` is the SM-2
 * grade and is *supposed* to say hard — that is the word this feature is
 * keeping its distance from.
 */
import en from '../en/translation.json'
import es from '../es/translation.json'
import fr from '../fr/translation.json'
import de from '../de/translation.json'
import ja from '../ja/translation.json'

const BUNDLES = { en, es, fr, de, ja }

/** Every key path this feature owns. */
const MARK_PATHS = ['cards.mark', 'cards.session.markFilter', 'filters.marked']

/** How each language says "hard"/"difficult", lowercased for comparison. */
const FORBIDDEN = {
  en: ['hard', 'difficult'],
  es: ['difícil', 'dificil', 'duro'],
  fr: ['difficile', 'dur'],
  de: ['schwer', 'schwierig'],
  ja: ['難しい', 'むずかしい', '難易']
}

const resolve = (bundle, path) => path.split('.').reduce((node, key) => (node == null ? node : node[key]), bundle)

/** Flatten a subtree (or a bare string) to `[path, value]` pairs. */
const stringsUnder = (node, prefix) => {
  if (node == null) return []
  if (typeof node === 'string') return [[prefix, node]]
  if (typeof node !== 'object') return []
  return Object.entries(node).flatMap(([key, value]) => stringsUnder(value, `${prefix}.${key}`))
}

describe('the mark is never named after difficulty', () => {
  it.each(Object.keys(BUNDLES))('%s', (locale) => {
    const banned = FORBIDDEN[locale]
    const entries = MARK_PATHS.flatMap((path) => stringsUnder(resolve(BUNDLES[locale], path), path))

    // A guard over nothing would pass forever — prove it is actually looking.
    expect(entries.length).toBeGreaterThan(0)

    for (const [path, value] of entries) {
      for (const word of banned) {
        expect(`${path} = "${value}"`).not.toContain(word)
        expect(`${path} = "${value.toLowerCase()}"`).not.toContain(word)
      }
    }
  })

  it('still lets the SM-2 grade call itself hard, which is the point of the distinction', () => {
    expect(en.cards.session.grading.hard.toLowerCase()).toContain('hard')
  })
})
