/**
 * Contrast, on the pairs the mobile app actually paints (MOB-029).
 *
 * `colorSchemeGenerator.test.js` already holds the GENERATED accent groups to
 * WCAG AA, across every preset and several accents chosen to break it. What it
 * cannot cover is the other half of the mobile palette: `BASE_PALETTE` is
 * extracted from Joy's resolved theme, is not generated, and supplies exactly
 * the colours a screen writes most — `text.primary` on `background.body`,
 * `text.tertiary` on a card, a divider against the surface it divides.
 *
 * So this asserts the composed theme rather than either input, in both schemes,
 * for the default accent and two others. Every pair below is one a primitive or
 * a screen in this package renders; none is hypothetical.
 *
 * **Two thresholds, because WCAG has two.** Body text is held to 4.5:1. A
 * border carries no text and is held to the non-text threshold of 3:1. A
 * `divider` is held only to "visible", because a hairline that separated at
 * 3:1 would be a rule, not a divider.
 *
 * **Four pairs fail today, and are listed rather than excused.** They live in
 * `BASE_PALETTE`, which is extracted from Joy's resolved theme and is what the
 * WEB renders too, so raising them is a change to both clients' appearance and
 * a decision for the user, not a test edit. `DEBT` below records each one with
 * the ratio it actually reaches. It is pinned exactly, the way the locale
 * ledger is: a pair that improves must be removed from the list, and a pair
 * that regresses fails.
 */
import { contrastRatio } from '@nowry/core/tokens/colorSchemeGenerator'
import { buildTheme, DEFAULT_THEME_COLOR } from '../buildTheme'

const AA = 4.5
const NON_TEXT = 3
/** A divider is meant to be barely there; this only rules out invisible. */
const HAIRLINE = 1.05

/**
 * Known shortfalls in the shared base palette, with what each reaches today.
 *
 *   - `text.tertiary` on any light ground: 4.25:1 against 4.5. Every caption
 *     and meta line in the app is this colour. `#6b7280` would clear it.
 *   - `neutral.outlinedBorder`: 1.38:1 light, 1.46:1 dark, against 3. This is
 *     an input's own outline, which WCAG 1.4.11 counts as identifying a
 *     control.
 *   - `primary.outlinedBorder` on a light ground: 2.06:1 against 3. This one is
 *     the focus ring (BUTTONS.md §focus), so it is the sharpest of the four —
 *     WCAG 2.4.11 is explicit about focus indicators.
 *
 * Each entry is `[scheme, foreground, background]`; the accent does not change
 * whether they fail, only by how much.
 */
const DEBT = [
  ['light', 'text.tertiary', 'background.body'],
  ['light', 'text.tertiary', 'background.surface'],
  ['light', 'text.tertiary', 'background.level1'],
  ['light', 'neutral.outlinedBorder', 'background.surface'],
  ['dark', 'neutral.outlinedBorder', 'background.surface'],
  ['light', 'primary.outlinedBorder', 'background.body']
]

const isDebt = (scheme, foreground, background) => DEBT.some(([s, f, b]) => s === scheme && f === foreground && b === background)

const SCHEMES = ['light', 'dark']
const ACCENTS = [DEFAULT_THEME_COLOR, '#c2255c', '#2b8a3e']

const read = (palette, name) => name.split('.').reduce((node, part) => node?.[part], palette)

/** [foreground, background, floor, why it is that floor] */
const PAIRS = [
  ['text.primary', 'background.body', AA],
  ['text.primary', 'background.surface', AA],
  ['text.primary', 'background.level1', AA],
  ['text.primary', 'background.level2', AA],
  ['text.primary', 'background.popup', AA],
  ['text.secondary', 'background.body', AA],
  ['text.secondary', 'background.surface', AA],
  ['text.tertiary', 'background.body', AA],
  ['text.tertiary', 'background.surface', AA],
  ['text.tertiary', 'background.level1', AA],
  // The house button: primary is solid, secondary sits on level1, danger is soft.
  ['primary.solidColor', 'primary.solidBg', AA],
  ['text.secondary', 'background.level1', AA],
  ['danger.plainColor', 'danger.softBg', AA],
  ['danger.plainColor', 'background.surface', AA],
  ['primary.plainColor', 'background.surface', AA],
  ['primary.plainColor', 'background.body', AA],
  // The three status colours a screen writes as text.
  ['success.plainColor', 'background.surface', AA],
  ['warning.plainColor', 'background.surface', AA],
  // Borders and grounds carry no text.
  ['neutral.outlinedBorder', 'background.surface', NON_TEXT],
  ['primary.outlinedBorder', 'background.body', NON_TEXT],
  ['divider', 'background.surface', HAIRLINE],
  ['divider', 'background.body', HAIRLINE]
]

describe.each(SCHEMES)('%s', (scheme) => {
  describe.each(ACCENTS)('accent %s', (accent) => {
    const { palette } = buildTheme(scheme, accent)

    it.each(PAIRS)('%s on %s reaches %s:1', (foreground, background, floor) => {
      const fg = read(palette, foreground)
      const bg = read(palette, background)

      // A name that resolves to nothing is a different bug, and a silent one:
      // contrastRatio treats an unparseable colour as black and would pass.
      expect(typeof fg).toBe('string')
      expect(typeof bg).toBe('string')

      const ratio = contrastRatio(fg, bg)

      if (isDebt(scheme, foreground, background)) {
        // Pinned, not skipped. Fixing the palette makes this fail and the entry
        // must come off the list, so the debt can only shrink.
        expect(ratio).toBeLessThan(floor)
        return
      }

      expect(ratio).toBeGreaterThanOrEqual(floor)
    })
  })
})
