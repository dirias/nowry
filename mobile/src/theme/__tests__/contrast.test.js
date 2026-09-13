/**
 * Contrast, on the pairs the mobile app actually paints (MOB-029).
 *
 * `colorSchemeGenerator.test.js` already holds the GENERATED accent groups to
 * WCAG AA, across every preset and several accents chosen to break it. What it
 * cannot cover is the other half of the mobile palette: `BASE_PALETTE` holds
 * the neutrals, status and gold (built from `colorSystem`, ADR-034) and supplies
 * exactly the colours a screen writes most — `text.primary` on `background.body`,
 * `text.tertiary` on a card, a divider against the surface it divides.
 *
 * So this asserts the composed theme rather than either input, in both schemes,
 * for every preset and two extremes. Every pair below is one a primitive or
 * a screen in this package renders; none is hypothetical.
 *
 * **Two thresholds, because WCAG has two.** Body text is held to 4.5:1. A
 * border carries no text and is held to the non-text threshold of 3:1. A
 * `divider` is held only to "visible", because a hairline that separated at
 * 3:1 would be a rule, not a divider.
 *
 * **Four pairs fail today, and are listed rather than excused.** They live in
 * `BASE_PALETTE`, which is what the WEB renders too (`paletteParity.test.js`), so raising them is a change to both clients' appearance and
 * a decision for the user, not a test edit. `DEBT` below records each one with
 * the ratio it actually reaches. It is pinned exactly, the way the locale
 * ledger is: a pair that improves must be removed from the list, and a pair
 * that regresses fails.
 */
import { contrastRatio, getColorPresets } from '@nowry/core/tokens/colorSchemeGenerator'
import { buildTheme, DEFAULT_THEME_COLOR } from '../buildTheme'

const AA = 4.5
const NON_TEXT = 3
/** A divider is meant to be barely there; this only rules out invisible. */
const HAIRLINE = 1.05

/**
 * Known shortfalls in the shared base palette, with what each reaches today.
 *
 *   - ~~`text.tertiary` on any light ground~~ — **cleared** (MOB-071). It was
 *     4.48, 4.25 and 4.05 against 4.5 on `body`, `surface` and `level1`, which
 *     is every caption and meta line in the app. `#777` became `#6f6f6f`: eight
 *     steps darker, below the threshold of noticing, and 5.02 / 4.77 / 4.55.
 *   - `neutral.outlinedBorder`: 1.30:1 light, 1.40:1 dark, against 3. This is
 *     an input's own outline, which WCAG 1.4.11 counts as identifying a
 *     control. A WAIVER, taken with the numbers in hand: clearing it turns every
 *     quiet hairline in the app into a visible grey line (MOB-071).
 *   - ~~`primary.outlinedBorder` on a light ground~~ — **cleared** (ADR-034
 *     audit). It is the focus ring, which WCAG 2.4.11 is explicit about; it
 *     now sits at L 0.62 and reaches 3.1:1 or better for every preset.
 *
 * Each entry is `[scheme, foreground, background]`; the accent does not change
 * whether they fail, only by how much.
 */
const DEBT = [
  ['light', 'neutral.outlinedBorder', 'background.surface'],
  ['dark', 'neutral.outlinedBorder', 'background.surface']
]

const isDebt = (scheme, foreground, background) => DEBT.some(([s, f, b]) => s === scheme && f === foreground && b === background)

const SCHEMES = ['light', 'dark']
// Every preset, plus a near-black and a near-white a custom picker can store.
const ACCENTS = [
  DEFAULT_THEME_COLOR,
  ...getColorPresets()
    .map((preset) => preset.color)
    .slice(1),
  '#050505',
  '#fafafa'
]

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
  ['primary.solidColor', 'primary.solidActiveBg', AA],
  ['primary.softColor', 'primary.softBg', AA],
  // Solid status and gold, which the audit found unguarded (ADR-034).
  ['success.solidColor', 'success.solidBg', AA],
  ['warning.solidColor', 'warning.solidBg', AA],
  ['danger.solidColor', 'danger.solidBg', AA],
  ['gold.solidColor', 'gold.solidBg', AA],
  ['gold.softColor', 'gold.softBg', AA],
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
