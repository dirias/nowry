/**
 * Every route the client navigates to exists.
 *
 * `/study/due` did not. It was the target of the dashboard's one solid key and
 * of Home's — the app's single most important button — and nothing failed,
 * because `[deckId]` matched it and the session went off to ask the server for
 * a deck called "due". A route that does not exist is not a 404 in a file-based
 * router; it is a screen that loads the wrong thing.
 *
 * The web's sentinel for the same session is `daily-review`, and the route
 * names mirror the web's so one link opens the same thing on both. That is why
 * the fix was to use its word rather than to add a route.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const APP = path.join(ROOT, 'app')

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.js') ? [full] : []
  })

const routeFiles = walk(APP).filter((file) => !path.basename(file).startsWith('_'))

/**
 * A file's path as a route pattern: groups disappear, `index` is the folder
 * itself, and `[param]` stays as the one segment that matches anything.
 */
const patternOf = (file) =>
  '/' +
  path
    .relative(APP, file)
    .replace(/\.js$/, '')
    .split(path.sep)
    .filter((segment) => !/^\(.*\)$/.test(segment))
    .filter((segment, index, all) => !(segment === 'index' && index === all.length - 1))
    .join('/')

const PATTERNS = routeFiles.map(patternOf)

const matches = (route) => {
  const asked = route.split('/').filter(Boolean)
  return PATTERNS.some((pattern) => {
    const parts = pattern.split('/').filter(Boolean)
    if (parts.length !== asked.length) return false
    return parts.every((part, i) => /^\[.*\]$/.test(part) || part === asked[i])
  })
}

const sources = () => {
  const walkSrc = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walkSrc(full)
      return entry.name.endsWith('.js') ? [full] : []
    })
  return [...walkSrc(APP), ...walkSrc(path.join(ROOT, 'src'))]
}

/** `router.push('/a')`, `router.replace(\`/a/${b}\`)` and `<Link href='/a'>`. */
const TARGET = /(?:router\.(?:push|replace)\(\s*|href=\{?)['"`]([^'"`]+)['"`]/g

const asked = new Map()
for (const file of sources()) {
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const [, raw] of text.matchAll(TARGET)) {
    // A query narrows a session; it never chooses a screen.
    const route = raw.split('?')[0].replace(/\$\{[^}]*\}/g, ':param')
    if (!route.startsWith('/')) continue
    if (!asked.has(route)) asked.set(route, new Set())
    asked.get(route).add(path.relative(ROOT, file))
  }
}

/**
 * The routes the SHARED package hands out. A screen that renders them cannot be
 * caught by the scan above — the string is in `packages/core`, not in a
 * `router.push` here — and one of them, `/books`, is a route this client does
 * not have and will not have until Books is undeferred (ADR-030). The panel
 * therefore declares what it can open, and this reads the two against each
 * other: a destination that is neither openable nor a real route fails here
 * rather than saying "Unmatched Route" under a user's thumb.
 */
const declaredSteps = () => {
  const source = fs.readFileSync(path.join(ROOT, '../packages/core/hooks/useNextSteps.js'), 'utf8')
  return [...source.matchAll(/to:\s*'([^']+)'/g)].map((match) => match[1])
}

const openableSteps = () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/ui/patterns/NextStepsPanel.js'), 'utf8')
  const block = source.slice(source.indexOf('export const OPENABLE_STEPS'))
  return [...block.slice(0, block.indexOf(']')).matchAll(/'([^']+)'/g)].map((match) => match[1])
}

describe("the shared package's next steps", () => {
  it('offers only what this client has a screen for', () => {
    const missing = openableSteps().filter((route) => !matches(route))
    expect(missing).toEqual([])
  })

  it('accounts for every destination the shared hook declares', () => {
    // Either the client can open it, or it is a route that exists anyway.
    const unaccounted = declaredSteps().filter((route) => !openableSteps().includes(route) && matches(route))
    expect(unaccounted).toEqual([])
    expect(declaredSteps().length).toBeGreaterThan(openableSteps().length)
  })
})

describe('the route tree', () => {
  it('was actually read', () => {
    expect(PATTERNS.length).toBeGreaterThan(10)
    expect(asked.size).toBeGreaterThan(5)
  })

  it.each([...asked.keys()].sort())('%s exists', (route) => {
    // A dynamic segment in the ASKED route stands in for a real value, and any
    // value is fine — what must exist is a file at that shape.
    expect({ route, from: [...asked.get(route)] }).toEqual({
      route: matches(route.replace(/:param/g, 'x')) ? route : `${route} — no file matches this`,
      from: [...asked.get(route)]
    })
  })
})
