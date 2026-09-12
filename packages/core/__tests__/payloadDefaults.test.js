/**
 * Two readers of one API field must not disagree about its default.
 *
 * The companion vanished on the phone while the web showed one for the same
 * account, and nothing failed anywhere. The cause was a single character of
 * disagreement: `AgentContext` has always read `pet_revealed ?? true` and the
 * hook written for the phone read `?? false`. Both were plausible in isolation;
 * together they are two products.
 *
 * So the rule is read off the source: within this package, a boolean field's
 * fallback is whatever it is, but it is the SAME wherever the field is read.
 * The package is the one place both clients get their answers from, which is
 * exactly why the disagreement has to be caught here.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SKIP = new Set(['node_modules', '__tests__', 'locales'])

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) files.push(full)
  }
}
walk(ROOT)

/** `payload.pet_revealed ?? true`, `data?.pet_active ?? false`. */
const DEFAULTED_READ = /\b(?:payload|data|response|result)\??\.([a-z][a-z0-9_]*)\s*\?\?\s*(true|false)\b/g

const strip = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('one default per API field', () => {
  const seen = new Map()

  for (const file of files) {
    const source = strip(fs.readFileSync(file, 'utf8'))
    for (const [, field, fallback] of source.matchAll(DEFAULTED_READ)) {
      if (!seen.has(field)) seen.set(field, new Map())
      const where = seen.get(field)
      if (!where.has(fallback)) where.set(fallback, [])
      where.get(fallback).push(path.relative(ROOT, file))
    }
  }

  it('read something, so the rule is not passing on an empty set', () => {
    expect(seen.size).toBeGreaterThan(3)
  })

  it('never falls back two ways for the same field', () => {
    const split = []
    for (const [field, byFallback] of seen) {
      if (byFallback.size < 2) continue
      split.push(
        `${field}: ` + [...byFallback].map(([fallback, where]) => `${fallback} in ${[...new Set(where)].join(', ')}`).join(' — but ')
      )
    }
    expect(split).toEqual([])
  })
})
