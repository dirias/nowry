/**
 * Each safe-area inset has exactly one owner.
 *
 * Android draws this app under the system bars, so something must hold that
 * space at each edge. Nothing held the bottom one and the tab bar's last label
 * sat against the system navigation. Two things holding an edge is the opposite
 * fault — a band of dead space against chrome that is already clear — and it
 * fails nothing on its own, which is why the rule is asserted rather than
 * remembered.
 *
 * Read as source: these files pull in the navigator, the theme and
 * KeyboardAvoidingView, and what matters is which of them claims each edge.
 */
const fs = require('fs')
const path = require('path')

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8')

const screen = read('../Screen.js')
const appBar = read('../patterns/AppBar.js')
const layout = read('../../../app/(tabs)/_layout.js')

describe('the bottom inset', () => {
  it('is claimed by the tab bar', () => {
    expect(layout).toMatch(/paddingBottom:\s*insets\.bottom/)
    // Grown, not shifted: the bar's ground must still reach the window's edge.
    expect(layout).toMatch(/height:\s*TAB_BAR_HEIGHT \+ insets\.bottom/)
  })
})

describe('the top inset', () => {
  it('is claimed by the app bar', () => {
    expect(appBar).toMatch(/paddingTop:\s*insets\.top/)
    expect(appBar).toMatch(/height:\s*APP_BAR_HEIGHT \+ insets\.top/)
  })
})

describe('a screen between them', () => {
  it('claims neither, and is told so rather than asked to remember', () => {
    expect(screen).toContain('useScreenEdges')
    // A hardcoded default is the bug this replaced.
    expect(screen).not.toMatch(/edges = \['top', 'bottom'\]/)
  })

  it('still insets the edges nothing else holds', () => {
    expect(screen).toMatch(/applied\.includes\('top'\) \? insets\.top : 0/)
    expect(screen).toMatch(/applied\.includes\('bottom'\) \? insets\.bottom : 0/)
  })
})

describe('the tab navigator', () => {
  it('declares that it draws both bars', () => {
    expect(layout).toContain('<ScreenChromeProvider top bottom>')
  })

  it("draws the artboards' app bar rather than a navigator header", () => {
    expect(layout).toMatch(/header:\s*\(\)\s*=>\s*<AppBar\s*\/>/)
    // headerShown:false would hide it; the option must be gone entirely.
    expect(layout).not.toContain('headerShown: false')
  })
})
