/**
 * Two rules about the words a person reads, made mechanical (MOB-029).
 *
 *   1. **Every key the client uses exists in all five bundles.** A missing key
 *      renders as the key itself — `cards.deck.archive` in the middle of a
 *      screen — and only in the language nobody on the team reads.
 *   2. **No user-facing string is written in English in the source.** A label
 *      that skips `t()` is invisible to the coverage rule above, so it is not
 *      debt anybody can see: it is simply always English.
 *
 * Both read the client's own source rather than a list somebody maintains, so a
 * screen written tomorrow is covered the moment it is written.
 *
 * `app/harness.js` and `app/probe.js` are excluded. They are the design harness
 * and the platform probe — developer surfaces whose labels name primitives and
 * capabilities, not things a user is ever shown.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const LOCALES = ['en', 'es', 'fr', 'de', 'ja']
const DEVELOPER_SURFACES = ['app/harness.js', 'app/probe.js']

const bundles = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.resolve(ROOT, `../packages/core/locales/${locale}/translation.json`), 'utf8'))
  ])
)

const sources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sources(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

const files = [...sources(path.join(ROOT, 'app')), ...sources(path.join(ROOT, 'src'))]
  .map((file) => ({ file, rel: path.relative(ROOT, file), text: fs.readFileSync(file, 'utf8') }))
  .filter(({ rel }) => !DEVELOPER_SURFACES.includes(rel))

/** Prose in a comment is not a label. */
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/*
 * Every quoted key inside a `t(...)` call, not only the first argument.
 *
 * The narrow version matched `t('a.b')` and nothing else, so
 * `t(cond ? 'a.b' : 'c.d')` was invisible — and three keys written that way
 * shipped untranslated before this was widened. A key is dotted and has no
 * spaces, which is enough to tell one from an ordinary string argument.
 */
const T_CALL = /\bt\(([\s\S]{0,400}?)\)/g
const KEY_LITERAL = /'([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)'/g
const KEY_PROP = /\b(labelKey|helperKey|errorKey|placeholderKey|titleKey|bodyKey)=(?:'|\{')([a-zA-Z0-9_.]+)'/g

const usedKeys = new Set()
for (const { text } of files) {
  const code = withoutComments(text)
  for (const [, args] of code.matchAll(T_CALL)) {
    for (const [, key] of args.matchAll(KEY_LITERAL)) usedKeys.add(key)
  }
  for (const [, , key] of code.matchAll(KEY_PROP)) usedKeys.add(key)
}

const read = (bundle, key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), bundle)

/**
 * A plural key is stored as `_one` / `_other`, and which forms exist depends on
 * the language's own CLDR rules — Japanese has no `_one`. Presence of any form
 * is the right test here; `localeCoverage.test.js` owns the CLDR completeness.
 */
const has = (bundle, key) =>
  typeof read(bundle, key) === 'string' ||
  ['_one', '_other', '_zero', '_two', '_few', '_many'].some((suffix) => typeof read(bundle, key + suffix) === 'string')

describe('every key the mobile client uses', () => {
  it('is a non-trivial number of keys, so an empty scan cannot pass', () => {
    expect(usedKeys.size).toBeGreaterThan(50)
  })

  it.each(LOCALES)('exists in %s', (locale) => {
    const missing = [...usedKeys].filter((key) => !has(bundles[locale], key)).sort()
    expect(missing).toEqual([])
  })
})

/*
 * A JSX text node of ordinary words. Deliberately narrow: it wants
 * `>Save changes<`, not `>{value}<`, not a single character of punctuation.
 */
const JSX_TEXT = />[ \t\n]*([A-Za-z][A-Za-z0-9 ,.'’!?:%-]{2,})[ \t\n]*</g

/** Props whose value a user reads or hears. */
const USER_FACING =
  /\b(accessibilityLabel|accessibilityHint|placeholder|title|label)=(?:(['"])([^'"]{2,})\2|\{\s*(['"])([^'"]{2,})\4\s*\})/g

describe('no user-facing string is written in English in the source', () => {
  it.each(files.map(({ rel }) => rel))('%s', (rel) => {
    const { text } = files.find((entry) => entry.rel === rel)
    const code = withoutComments(text)

    const found = [
      ...[...code.matchAll(JSX_TEXT)].map(([, words]) => `text: ${words.trim()}`),
      ...[...code.matchAll(USER_FACING)].map(([, prop, , quoted, , braced]) => `${prop}: ${quoted ?? braced}`)
    ]

    expect(found).toEqual([])
  })
})
