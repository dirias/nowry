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

/**
 * The pattern a concrete route lands on, or null.
 *
 * The most specific one wins, as the router itself resolves it: `/study/card/new`
 * is matched by both `new.js` and `[cardId].js`, and answering with the dynamic
 * one would report the static file as unreachable.
 */
const patternFor = (route) => {
  const asked = route.split('/').filter(Boolean)
  const dynamic = (pattern) => pattern.split('/').filter((part) => /^\[.*\]$/.test(part)).length

  return (
    PATTERNS.filter((pattern) => {
      const parts = pattern.split('/').filter(Boolean)
      if (parts.length !== asked.length) return false
      return parts.every((part, i) => /^\[.*\]$/.test(part) || part === asked[i])
    }).sort((a, b) => dynamic(a) - dynamic(b))[0] ?? null
  )
}

const matches = (route) => patternFor(route) !== null

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
    // A destination this client has a screen for must be offered. Anything it
    // does not have a screen for is simply absent, which is the point.
    const unoffered = declaredSteps().filter((route) => !openableSteps().includes(route) && matches(route))
    expect(unoffered).toEqual([])
  })

  it('declares nothing it cannot open', () => {
    expect(openableSteps().filter((route) => !declaredSteps().includes(route))).toEqual([])
  })
})

/**
 * Routes the bar itself opens, or the system does. Everything else has to be
 * reachable from inside the app.
 */
const REACHED_WITHOUT_A_PUSH = [
  '/', // the Home tab
  '/study', // the Study tab
  '/calendar', // the Plan tab
  '/pomodoro', // the Focus tab
  '/oauthredirect', // Google's callback: the OS opens it, never this app
  '/harness', // the visual harness, opened by hand at `nowry://harness` (MOB-010)
  '/probe' // the platform-port probe, opened the same way
]

describe('every screen can be reached', () => {
  /*
   * The mirror of the rule below, and it exists because the other direction
   * passed while a screen sat there unreachable: `/calendar/area/[areaId]` was
   * written, the row that should open it was given the handler, and the call
   * site was never passed one. Nothing failed — a component that accepts a
   * press and is never given one is legal, and a route nothing opens is a file
   * that compiles. Only a person tapping the row found it.
   */
  it.each(PATTERNS.filter((pattern) => !REACHED_WITHOUT_A_PUSH.includes(pattern)).sort())('%s is opened by something', (pattern) => {
    // The shared package hands out routes too, and its strings are not in this
    // client's source for the scan above to find.
    const fromAnywhere = [...asked.keys()].concat(declaredSteps())
    const opened = fromAnywhere.some((route) => patternFor(route.replace(/:param/g, 'x')) === pattern)
    expect(opened ? pattern : `${pattern} — nothing opens this: no router.push, Link or redirect targets it`).toEqual(pattern)
  })
})

/**
 * Screens that deliberately have no app bar: before you are signed in there is
 * no account to show, the OAuth callback is a redirect with nothing on it, and
 * the two harness screens exist to render primitives with no chrome around them.
 */
const CHROMELESS = ['(auth)', 'oauthredirect', 'harness', 'probe']

describe('every screen has a way back', () => {
  /*
   * The app bar belongs to the tab group, and the back control belongs to the
   * app bar. A route outside that group therefore has no bar, no account and
   * nothing to return with except the system gesture — invisible on Android and
   * an edge swipe on iOS. `/settings` shipped that way (MOB-053).
   */
  it.each(routeFiles.map((file) => path.relative(APP, file)).sort())('%s is inside the tab group', (relative) => {
    const first = relative.split(path.sep)[0].replace(/\.js$/, '')
    const inside = first === '(tabs)' || CHROMELESS.includes(first)
    expect(inside ? relative : `${relative} — outside (tabs), so it has no app bar and no way back`).toEqual(relative)
  })
})

/**
 * The app bar's list of routes that are pushed despite being two segments deep.
 *
 * A name in it must be a real screen. `annual-planning` was in it and is a
 * `Redirect` onto a tab root: it never stays on screen to want a back control,
 * and if it had rendered one it would have been offering a way back out of a
 * tab (MOB-072).
 */
const pushedInTabs = () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/ui/patterns/AppBar.js'), 'utf8')
  const block = source.slice(source.indexOf('const PUSHED_IN_TABS'))
  return [...block.slice(0, block.indexOf(']')).matchAll(/'([^']+)'/g)].map((match) => match[1])
}

describe("the app bar's pushed routes", () => {
  it.each(pushedInTabs())('%s is a route', (name) => {
    expect(matches(`/${name}`) ? name : `${name} — named as pushed, but no route file matches it`).toEqual(name)
  })

  it.each(pushedInTabs())('%s is a screen, not a redirect', (name) => {
    const file = routeFiles.find((candidate) => patternOf(candidate) === `/${name}`)
    const source = fs.readFileSync(file, 'utf8')
    expect(source.includes('<Redirect') ? `${name} — a redirect cannot be pushed; it has nowhere to go back to` : name).toEqual(name)
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

/**
 * Every button in the tab bar, with the route its press goes to.
 *
 * A tab navigator restores whatever its stack held, so pressing Study while a
 * session was pushed on that tab reopened the session rather than the Study
 * Center — the bar's label said one thing and its button did another (MOB-080).
 * The fix is one `tabPress` listener per tab, and this is what keeps it: a
 * button with no listener silently returns to the old behaviour, and a listener
 * aimed at the wrong href sends the reader to the wrong tab.
 */
const tabButtons = () => {
  const source = fs.readFileSync(path.join(APP, '(tabs)/_layout.js'), 'utf8')
  return [...source.matchAll(/<Tabs\.Screen\b[\s\S]*?\/>/g)]
    .map((match) => match[0])
    .filter((block) => block.includes('tabBarIcon'))
    .map((block) => ({
      name: block.match(/name='([^']+)'/)?.[1] ?? null,
      href: block.match(/listeners=\{toTabRoot\('([^']+)'\)\}/)?.[1] ?? null,
      raises: /listeners=\{raiseFocus\}/.test(block)
    }))
}

/**
 * Focus is the one tab that is not a page: its press raises the full-screen
 * timer over the tab you are on (MOB-104), so it has no route to send you to.
 * Named here so a second tab cannot quietly stop being a destination.
 */
const RAISES_AN_OVERLAY = ['pomodoro']

const routedTabs = () => tabButtons().filter(({ name }) => !RAISES_AN_OVERLAY.includes(name))

describe('the tab bar', () => {
  it('was actually read', () => {
    expect(tabButtons().length).toBeGreaterThan(3)
  })

  it('raises an overlay from Focus and from no other tab', () => {
    expect(
      tabButtons()
        .filter(({ raises }) => raises)
        .map(({ name }) => name)
    ).toEqual(RAISES_AN_OVERLAY)
  })

  it.each(routedTabs().map(({ name }) => name))('%s sends its press somewhere', (name) => {
    const { href } = tabButtons().find((tab) => tab.name === name)
    expect({ name, href }).toEqual({ name, href: href ?? 'no toTabRoot listener — this tab will resume whatever was pushed on it' })
  })

  it.each(routedTabs().map(({ name }) => name))('%s sends its press to a real route', (name) => {
    const { href } = tabButtons().find((tab) => tab.name === name)
    expect(matches(href) ? href : `${href} — no file matches this`).toEqual(href)
  })

  it.each(routedTabs().map(({ name }) => name))('%s sends its press to its OWN route', (name) => {
    const { href } = tabButtons().find((tab) => tab.name === name)
    // `index` is the group's own root, which is `/`; every other tab is named
    // by its segment.
    const own = name === 'index' ? '/' : `/${name}`
    expect({ name, href }).toEqual({ name, href: own })
  })
})
