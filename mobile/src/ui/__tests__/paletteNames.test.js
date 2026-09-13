/**
 * Every semantic colour the client names actually resolves.
 *
 * `resolveColor` throws on an unknown name — but only when the line runs, so
 * the guard is "somebody opened that screen". `success.plainColor` reached a
 * device that way: the base palette carried no accent-group structural colours,
 * and the first screen to ask for one died in the user's hand rather than in a
 * suite.
 *
 * This asks the question without rendering anything. Names are read from the
 * source and looked up in a real built theme, in both schemes, across three
 * accents — because the accent groups are GENERATED, so a name can resolve
 * under one colour and not another.
 */
const fs = require('fs')
const path = require('path')

const { buildTheme, DEFAULT_THEME_COLOR } = require('../../theme/buildTheme')

const ROOT = path.resolve(__dirname, '../..')
const SCHEMES = ['light', 'dark']
const ACCENTS = [DEFAULT_THEME_COLOR, '#924968', '#6e6634']

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

/**
 * The three ways a colour is named: a `color` prop, a direct `resolveColor`
 * call, and the token tables the button and row specs carry.
 */
/*
 * Digits are part of a name: `background.level1` is the most-used ground in the
 * app. A first draft of this file matched `[A-Za-z]+` and saw none of the three
 * levels at all — the scan passed its own "is it finding names" check on the
 * others, which is exactly how a guard becomes decoration.
 */
const TOKEN = '[a-z][A-Za-z0-9]*(?:\\.[A-Za-z0-9]+)?'

const PATTERNS = [
  new RegExp(`\\bcolor=(?:\\{)?['"](${TOKEN})['"]`, 'g'),
  new RegExp(`resolveColor\\(\\s*\\w+\\s*,\\s*['"](${TOKEN})['"]`, 'g'),
  new RegExp(`\\b(?:ground|groundPressed|label|edge|color|track|fill)\\s*:\\s*['"](${TOKEN})['"]`, 'g')
]

/** Not a palette name: a literal, and the one word that means "no ground". */
const NOT_A_TOKEN = new Set(['transparent'])

const named = new Map()
for (const file of [...walk(path.join(ROOT, 'ui')), ...walk(path.join(ROOT, 'screens')), ...walk(path.join(ROOT, '..', 'app'))]) {
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const pattern of PATTERNS) {
    for (const [, name] of text.matchAll(pattern)) {
      if (NOT_A_TOKEN.has(name)) continue
      if (!named.has(name)) named.set(name, new Set())
      named.get(name).add(path.relative(ROOT, file))
    }
  }
}

const resolve = (palette, name) => {
  const [group, key] = name.split('.')
  return key === undefined ? palette[group] : palette[group]?.[key]
}

describe('every semantic colour the client names', () => {
  it('is a real number of names, so an empty scan cannot pass', () => {
    expect(named.size).toBeGreaterThan(15)
    // The four that carry the most weight, as a sanity check on the patterns.
    expect([...named.keys()]).toEqual(
      // The levels are here on purpose: they are the names a digit-blind
      // pattern silently drops.
      expect.arrayContaining(['text.primary', 'text.tertiary', 'divider', 'danger.plainColor', 'background.level1'])
    )
  })

  describe.each(SCHEMES)('%s', (scheme) => {
    it.each(ACCENTS)('resolves under accent %s', (accent) => {
      const { palette } = buildTheme(scheme, accent)

      const missing = [...named.keys()]
        .filter((name) => resolve(palette, name) === undefined)
        .map((name) => `${name} (${[...named.get(name)].join(', ')})`)
        .sort()

      expect(missing).toEqual([])
    })
  })
})
