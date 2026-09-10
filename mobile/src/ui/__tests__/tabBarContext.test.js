/**
 * The bottom safe-area inset has exactly one owner.
 *
 * Android draws this app under the system navigation, so something must hold
 * that space. Nothing did, and the tab bar's last label sat under the gesture
 * handle. Two things holding it is the opposite fault — a band of dead space
 * above a bar that is already clear.
 *
 * The rule is read as source rather than rendered: `Screen` pulls in
 * KeyboardAvoidingView and the whole theme, and what matters here is which of
 * the two files claims the inset, not what they draw.
 */
const fs = require('fs')
const path = require('path')

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8')

const screen = read('../Screen.js')
const layout = read('../../../app/(tabs)/_layout.js')

describe('the bottom inset', () => {
  it('is claimed by the tab bar', () => {
    expect(layout).toMatch(/paddingBottom:\s*insets\.bottom/)
    // Grown, not shifted: the bar's ground must still reach the window's edge.
    expect(layout).toMatch(/height:\s*TAB_BAR_HEIGHT \+ insets\.bottom/)
  })

  it('is given up by any screen that sits above a tab bar', () => {
    expect(screen).toContain('useHasTabBar')
    // The default is conditional; a flat ['top', 'bottom'] default is the bug.
    expect(screen).toMatch(/hasTabBar \? \['top'\] : \['top', 'bottom'\]/)
  })

  it("is still a screen's own when nothing is below it", () => {
    // Settings and the auth screens are outside the tab navigator.
    expect(screen).toMatch(/applied\.includes\('bottom'\) \? insets\.bottom : 0/)
  })
})

describe('TabBarProvider', () => {
  it('wraps the tab navigator, so every screen under it knows', () => {
    expect(layout).toContain('<TabBarProvider>')
    expect(layout).toContain('</TabBarProvider>')
  })
})
