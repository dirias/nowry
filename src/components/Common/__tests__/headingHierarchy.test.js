/**
 * The two heading rules that can be checked without rendering
 * (DESIGN_GUIDELINES §4.1.2b, DS-007).
 *
 * Read as source rather than rendered: what matters is which element a call
 * site asks for, and a rendered tree would only tell us about the one path a
 * test happened to take. Neither rule can false-positive — both are decided
 * inside a single JSX element.
 *
 * The third rule — every page emits exactly ONE h1 — is not here, because a
 * page's heading can live in a component the page composes, and no static pass
 * can tell a page from a panel. It is documented, and the remaining pages are
 * audited in DS-007A.
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../../..')

/** Every .js under src/, minus the tests themselves. */
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full)
    return entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('.test.') ? [full] : []
  })

const files = walk(SRC).map((full) => ({
  rel: path.relative(SRC, full),
  text: fs.readFileSync(full, 'utf8')
}))

/** A Typography element, from its opening `<Typography` to the closing `>`. */
const elements = (text) => text.match(/<Typography[\s\S]*?>/g) ?? []

describe('§4.1.2b — one h1 per page', () => {
  it('no file emits more than one <h1>', () => {
    const offenders = files
      .map(({ rel, text }) => {
        const count = elements(text).filter((el) => /component='h1'/.test(el) || (/level='h1'/.test(el) && !/component=/.test(el))).length
        return [rel, count]
      })
      .filter(([, count]) => count > 1)
      .map(([rel, count]) => `${rel}: ${count}`)

    expect(offenders).toEqual([])
  })
})

describe('§4.1.3 — a display level renders a span unless told otherwise', () => {
  it('every display-* Typography names its element', () => {
    const offenders = files
      .flatMap(({ rel, text }) =>
        elements(text)
          .filter((el) => /level='display-(lg|md)'/.test(el) && !/component=/.test(el))
          .map(() => rel)
      )
      // One entry per file is enough to send someone to the right place.
      .filter((rel, i, all) => all.indexOf(rel) === i)

    expect(offenders).toEqual([])
  })
})
