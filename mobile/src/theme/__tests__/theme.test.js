/**
 * The theme's contract, not its colours.
 *
 * The exact hex values are guarded on the web side by `paletteParity.test.js`,
 * which compares them against what Joy actually resolves. What matters here is
 * that the merge order is right, that both schemes are complete, and that a
 * screen can reach every semantic name it needs without touching a shade.
 */
import { BASE_PALETTE } from '@nowry/core/tokens/palette'
import { ELEVATION } from '../elevation'
import { buildTheme, DEFAULT_THEME_COLOR } from '../buildTheme'

describe('buildTheme', () => {
  it.each(['light', 'dark'])('%s carries every semantic name the app writes', (scheme) => {
    const { palette } = buildTheme(scheme, DEFAULT_THEME_COLOR)
    // The names with the most call sites in the web app, in order.
    expect(palette.text.tertiary).toBeTruthy()
    expect(palette.text.secondary).toBeTruthy()
    expect(palette.text.primary).toBeTruthy()
    expect(palette.background.level1).toBeTruthy()
    expect(palette.background.level2).toBeTruthy()
    expect(palette.background.surface).toBeTruthy()
    expect(palette.background.body).toBeTruthy()
    expect(palette.primary.outlinedBorder).toBeTruthy()
    expect(palette.primary.plainColor).toBeTruthy()
    expect(palette.primary.solidBg).toBeTruthy()
    expect(palette.neutral.outlinedBorder).toBeTruthy()
    expect(palette.divider).toBeTruthy()
  })

  it.each(['light', 'dark'])('%s resolves every semantic name the primitives write', (scheme) => {
    /*
     * The list is not decorative: each of these is written by a primitive or a
     * pattern in this package, and `resolveColor` throws on a name it cannot
     * find. `success.plainColor` was missing and reached a device.
     */
    const { palette } = buildTheme(scheme, DEFAULT_THEME_COLOR)
    const used = [
      'text.primary',
      'text.secondary',
      'text.tertiary',
      'background.body',
      'background.surface',
      'background.popup',
      'background.level1',
      'background.level2',
      'background.level3',
      'primary.solidBg',
      'primary.solidColor',
      'primary.softBg',
      'primary.plainColor',
      'primary.solidActiveBg',
      'neutral.outlinedBorder',
      'danger.plainColor',
      'danger.softBg',
      'success.plainColor',
      'success.softBg',
      'warning.plainColor',
      'warning.softBg'
    ]
    const missing = used.filter((name) => {
      const [group, key] = name.split('.')
      return palette[group]?.[key] === undefined
    })
    expect(missing).toEqual([])
    expect(palette.divider).toBeTruthy()
  })

  it('lets the generated accents override the base, and leaves the rest alone', () => {
    const theme = buildTheme('light', '#c0392b')
    // The accent group is per user, so it must come from the generator...
    expect(theme.palette.primary.solidBg).not.toBe(BASE_PALETTE.light.neutral.solidBg)
    // ...while the structural names stay exactly as the shared base defines them.
    expect(theme.palette.background.level1).toBe(BASE_PALETTE.light.background.level1)
    expect(theme.palette.divider).toBe(BASE_PALETTE.light.divider)
  })

  it('regenerates when the account colour changes', () => {
    const teal = buildTheme('light', '#2a6971')
    const red = buildTheme('light', '#c0392b')
    expect(teal.palette.primary.solidBg).not.toBe(red.palette.primary.solidBg)
  })

  it('reads dark and light differently, which is what the OS switch relies on', () => {
    expect(buildTheme('light', DEFAULT_THEME_COLOR).palette.background.body).not.toBe(
      buildTheme('dark', DEFAULT_THEME_COLOR).palette.background.body
    )
  })

  it('exposes elevation by layer name and never a raw shadow', () => {
    const { elevation } = buildTheme('light', DEFAULT_THEME_COLOR)
    expect(Object.keys(elevation)).toEqual(['none', 'xs', 'sm', 'md', 'lg'])
    // A React Native shadow, not a CSS string Joy would have produced.
    expect(elevation.md).toMatchObject({ shadowOffset: { width: 0 }, elevation: expect.any(Number) })
    expect(typeof elevation.md.shadowRadius).toBe('number')
  })

  it('carries the three durations and two easings, unaltered', () => {
    const { motion } = buildTheme('light', DEFAULT_THEME_COLOR)
    expect(motion.duration).toEqual({ quick: 80, base: 160, slow: 240 })
    expect(Object.keys(motion.easing)).toEqual(['standard', 'exit'])
    expect(motion.easing.standard).toHaveLength(4)
  })

  it('gives radius as NUMBERS, because React Native ignores a CSS string', () => {
    const { radius } = buildTheme('light', DEFAULT_THEME_COLOR)
    expect(radius.md).toBe(8)
    expect(radius.sm).toBe(6)
    expect(radius.lg).toBe(12)
    Object.values(radius).forEach((v) => expect(typeof v).toBe('number'))
  })

  it('gives spacing as numbers too', () => {
    const { spacing } = buildTheme('light', DEFAULT_THEME_COLOR)
    expect(spacing[2]).toBe(16)
    expect(typeof spacing[3]).toBe('number')
  })

  it('elevation.none is genuinely flat, so it is a real default', () => {
    expect(ELEVATION.none.shadowOpacity).toBe(0)
    expect(ELEVATION.none.elevation).toBe(0)
  })
})
