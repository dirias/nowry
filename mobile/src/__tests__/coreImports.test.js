/**
 * Every core binding the mobile client imports by name actually exists.
 *
 * `useDeckSettings` is a default export. The deck screen imported it as a named
 * one, so the binding was `undefined` and the screen crashed on render with
 * "undefined is not a function" — a mistake no linter catches across a
 * workspace symlink, and one no other test caught because rendering tests are
 * blocked upstream (see this project's jest.config.js).
 *
 * This is the cheap guard. It reads the screens' own source rather than a
 * hand-kept list, so a new import is covered the moment it is written.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')

/** Every .js under a directory, skipping test folders and dependencies. */
const sources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sources(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

/*
 * The clause has to span newlines, because a long named import is wrapped. That
 * means a lazy match can begin at an earlier `import` and swallow the `from
 * 'react'` between them — which is how the first draft of this test reported
 * sixteen failures that were not real. `lastClause` cuts back to the statement
 * that actually owns the specifier.
 */
const IMPORT = /\bimport\s+([\s\S]*?)\s+from\s+'([^']*)'/g
const MENTION = /from\s+'(@nowry\/core(?![^']*\.json)[^']*)'/g

const lastClause = (raw) => (raw.includes("from '") ? raw.slice(raw.lastIndexOf('import ') + 'import '.length) : raw)

/** `useDeckSettings, { PACE_DEFAULTS }` -> default 'useDeckSettings', named ['PACE_DEFAULTS'] */
const parseClause = (clause) => {
  const braces = clause.match(/\{([^}]*)\}/)
  const named = braces
    ? braces[1]
        .split(',')
        .map((part) => part.split(/\s+as\s+/)[0].trim())
        .filter(Boolean)
    : []
  const defaultName = clause
    .replace(/\{[^}]*\}/, '')
    .replace(/(^,)|(,$)/g, '')
    .trim()
  return { defaultName: defaultName || null, named }
}

const files = [...sources(path.join(ROOT, 'app')), ...sources(path.join(ROOT, 'src'))]

const specifiers = files.flatMap((file) => {
  const text = fs.readFileSync(file, 'utf8')
  return (
    [...text.matchAll(IMPORT)]
      // Locale bundles are data; there is nothing to be undefined.
      .filter(([, , from]) => from.startsWith('@nowry/core') && !from.endsWith('.json'))
      .map(([, clause, from]) => ({ file: path.relative(ROOT, file), from, ...parseClause(lastClause(clause)) }))
  )
})

/** An import the pattern above cannot see is an import this test does not cover. */
const mentions = files.reduce((total, file) => total + (fs.readFileSync(file, 'utf8').match(MENTION) || []).length, 0)

describe('core imports resolve', () => {
  it('found the imports to check', () => {
    expect(specifiers.length).toBeGreaterThan(10)
  })

  it('sees every core import in the client, not only the ones it can parse', () => {
    expect(specifiers.length).toBe(mentions)
  })

  it.each(specifiers)('$file imports $from', ({ from, defaultName, named }) => {
    const loaded = require(from)
    if (defaultName) expect(loaded.default).toBeDefined()
    named.forEach((name) => expect(loaded[name]).toBeDefined())
  })
})
