/**
 * A screen may not name an API field the shared package has never heard of.
 *
 * Five bugs of one shape reached a device in this project, and every one was a
 * confident zero rather than a crash:
 *
 *   - `card_count` and `due_count` on a deck, which are `total_cards` and
 *     `due_cards`, so every deck read "cards · 0"
 *   - `decks` on the statistics summary, which has no such field, so Home read
 *     "0 decks" beside a real due count
 *   - `reviewed_today` on the same summary, so the day's progress never moved
 *   - `groups.system` indexed as an object when it arrives as a list, so Marked
 *     and Struggling read zero
 *
 * None of them failed anything. A wrong field name is `undefined`, `undefined`
 * falls through `?? 0`, and zero renders. So the rule is mechanical instead:
 * the field names belong in `@nowry/core`, behind a reader that is tested
 * against the real shape, and a screen reads the reader's words.
 *
 * `packages/core` is the client's whole contract with the API, so "does core
 * name it" is the test. It deliberately does NOT read `Nowry-API` — the
 * frontend is a consumer of that API and never reaches into it (CLAUDE.md).
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const CORE = path.resolve(ROOT, '../packages/core')

/**
 * The platform adapters speak to Google and Firebase, whose response shapes are
 * theirs and are not in our API's contract. Nothing else is exempt.
 */
const NOT_OUR_API = ['src/platform/']

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === '__tests__' ? [] : walk(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

/** Comments explain field names; strings carry translation keys that look like them. */
const code = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, "''")

const SNAKE_READ = /(?:\.|\?\.)([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g

const named = new Set()
for (const file of walk(CORE)) {
  if (file.includes(`${path.sep}locales${path.sep}`)) continue
  // Comments in there NAME the wrong fields on purpose, to record which ones
  // were guessed. Counting those would let a comment vouch for a bug.
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const [, name] of text.matchAll(SNAKE_READ)) named.add(name)
  for (const [, name] of text.matchAll(/["'`]([a-z][a-z0-9]*(?:_[a-z0-9]+)+)["'`]/g)) named.add(name)
  for (const [, name] of text.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*:/g)) named.add(name)
}

const clientFiles = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))]
  .map((file) => ({ file, rel: path.relative(ROOT, file) }))
  .filter(({ rel }) => !NOT_OUR_API.some((prefix) => rel.startsWith(prefix)))

describe('the shared package names every API field a screen reads', () => {
  it('has read a real number of names, so an empty scan cannot pass', () => {
    expect(named.size).toBeGreaterThan(100)
    expect(clientFiles.length).toBeGreaterThan(20)
  })

  it.each(clientFiles.map(({ rel }) => rel))('%s', (rel) => {
    const { file } = clientFiles.find((entry) => entry.rel === rel)
    const reads = [...code(fs.readFileSync(file, 'utf8')).matchAll(SNAKE_READ)].map(([, name]) => name)

    expect([...new Set(reads)].filter((name) => !named.has(name)).sort()).toEqual([])
  })
})
