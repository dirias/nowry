/**
 * Every environment variable the code reads is one the example file declares.
 *
 * `firebase.config.js` reads `REACT_APP_FB_PROJECT_ID`. The `.env` beside it
 * spelled the key `REACT_APP_FB_PROYECT_ID`, and so did `.env.example`, so
 * Firebase initialised with `projectId: undefined` on every web build there has
 * ever been (MOB-070). Nothing failed, because Auth needs the API key and the
 * auth domain and not the project id — the fault was invisible until something
 * else wanted it.
 *
 * A misspelling cannot be caught by reading either file alone: each is
 * internally consistent. What catches it is reading them against each other,
 * which is what this does, for both clients.
 *
 * It deliberately checks the EXAMPLE rather than the real `.env`: that one is
 * gitignored, is different on every machine, and is not this repository's to
 * assert about. The example is the contract, and a key missing from it is a key
 * the next person to set the project up will not know to set.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../..')

const SURFACES = [
  { name: 'the web client', sources: ['src/config/firebase.config.js'], example: '.env.example', prefix: 'REACT_APP_' },
  { name: 'the mobile client', sources: ['mobile/app.config.js'], example: 'mobile/.env.example', prefix: 'EXPO_PUBLIC_' }
]

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

/** `process.env.NAME`, with the prefix that says which surface owns it. */
const namesIn = (text, prefix) =>
  [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]).filter((name) => name.startsWith(prefix))

/** `NAME=` at the start of a line, comments and blanks ignored. */
const declaredIn = (text) =>
  new Set(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim())
  )

describe.each(SURFACES)('$name', ({ sources, example, prefix }) => {
  const used = [...new Set(sources.flatMap((source) => namesIn(read(source), prefix)))].sort()
  const declared = declaredIn(read(example))

  it('reads at least one variable, so this suite is actually looking at something', () => {
    expect(used.length).toBeGreaterThan(3)
  })

  it.each(used)('%s is declared in the example file', (name) => {
    expect(declared.has(name) ? name : `${name} — read by the code, absent from ${example}`).toBe(name)
  })
})
