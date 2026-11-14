/**
 * One focus ring (DARK-007, ADR-082 §8c).
 *
 * The theme's buttons, tabs and fields draw the keyboard focus ring in
 * `focusVisible`, which the dark ladder sets so the ring reads on near-black.
 * Some 40 components still drew their own in `primary.outlinedBorder`, a
 * border colour that is faint by design and nearly vanishes on the member's
 * dark ground. Every ring in the app now comes from the one token.
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', '..')
const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.js')) files.push(full)
  }
}
walk(SRC)

describe('every focus ring is the theme\'s', () => {
  it('draws no ring in a border colour of its own', () => {
    const offenders = files
      .filter((file) => /outlineColor:\s*'primary\.outlinedBorder'/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file))
    expect(offenders).toEqual([])
  })

  it('names the token the theme names', () => {
    const theme = fs.readFileSync(path.join(SRC, 'theme', 'components.js'), 'utf8')
    expect(theme).toContain("outlineColor: 'var(--joy-palette-focusVisible)'")
  })
})
