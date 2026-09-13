/**
 * The palette a learner's accent produces, for both modes (ADR-034).
 *
 * One hex in; every Joy colour group out — primary, success, warning, danger,
 * gold, neutral, background, text — for light and dark. The values come from
 * `colorSystem.js`, which builds them in OKLCH on one lightness ladder; this
 * file only assembles them into the shape both clients consume.
 *
 * The accent is normalised, not trusted: its hue and (capped) chroma are the
 * learner's, its lightness is the ladder's. That is what lets eight presets and
 * any custom hex promise the same contrast without a per-hue exception.
 */
import { contrastRatio, hexToOklch, relativeLuminance } from './oklch'
import { CATEGORY_SPEC, GOLD_SPEC, NEUTRALS, STATUS_SPEC, accentTone, buildTone, categoryColors } from './colorSystem'

export { contrastRatio, relativeLuminance }

const WHITE = '#ffffff'
const BLACK = '#000000'

/** Minimum contrast ratio for normal-size text — WCAG 2.1 AA (SC 1.4.3) */
const AA_TEXT_CONTRAST = 4.5

/**
 * White or black, whichever reads better on a background. For foregrounds drawn
 * on a colour the palette does not own — a swatch, a user's cover.
 */
export function readableTextOn(backgroundHex) {
  const whiteRatio = contrastRatio(WHITE, backgroundHex)
  const blackRatio = contrastRatio(BLACK, backgroundHex)
  const best = Math.max(whiteRatio, blackRatio)

  if (best < AA_TEXT_CONTRAST && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[colorSchemeGenerator] No text color reaches ${AA_TEXT_CONTRAST}:1 on ${backgroundHex} — using best available (${best.toFixed(2)}:1)`
    )
  }

  return whiteRatio >= blackRatio ? WHITE : BLACK
}

/** The neutral group: Joy's 50–900 scale plus the variant keys it names. */
const neutralGroup = (mode) => {
  const { scale, neutral } = NEUTRALS[mode]
  const light = mode === 'light'
  return {
    ...scale,
    ...neutral,
    plainHoverBg: light ? scale[100] : scale[800],
    plainActiveBg: light ? scale[200] : scale[700]
  }
}

const buildMode = (primaryColor, mode) => ({
  primary: accentTone(primaryColor, mode),
  success: buildTone(STATUS_SPEC.success, mode),
  warning: buildTone(STATUS_SPEC.warning, mode),
  danger: buildTone(STATUS_SPEC.danger, mode),
  gold: buildTone(GOLD_SPEC, mode),
  neutral: neutralGroup(mode),
  background: { ...NEUTRALS[mode].background },
  text: { ...NEUTRALS[mode].text },
  divider: NEUTRALS[mode].divider
})

/**
 * Generate the complete palette from an accent, for light and dark.
 */
export function generateColorScheme(primaryColor) {
  return {
    light: buildMode(primaryColor, 'light'),
    dark: buildMode(primaryColor, 'dark')
  }
}

/**
 * The eight presets a learner is offered. These are STORED values, so they are
 * literals: Teal keeps the value the backend defaults to (`#2a6971`); the other
 * seven sit on the ladder at L 0.505. `key` names the i18n string.
 *
 * None of them is close to a status colour — `colorSchemeGenerator.test.js`
 * measures the distance — so a primary button can never look like Delete.
 */
const PRESETS = [
  { color: '#2a6971', key: 'teal', label: 'Teal' },
  { color: '#346898', key: 'lake', label: 'Lake' },
  { color: '#5f5c99', key: 'iris', label: 'Iris' },
  { color: '#825080', key: 'plum', label: 'Plum' },
  { color: '#924968', key: 'rose', label: 'Rose' },
  { color: '#805c43', key: 'umber', label: 'Umber' },
  { color: '#6e6634', key: 'olive', label: 'Olive' },
  { color: '#5c666f', key: 'graphite', label: 'Graphite' }
]

export const DEFAULT_ACCENT = PRESETS[0].color

/**
 * `contrastText` is the readable foreground for a swatch painted in the literal
 * preset color.
 */
export function getColorPresets() {
  return PRESETS.map((preset) => ({ ...preset, contrastText: readableTextOn(preset.color) }))
}

/**
 * Sticky-note swatches, drawn from the category family. The ids are stored on
 * every note, so they keep their historical names; the colours behind them are
 * the categories closest to what each name promised.
 */
const STICKY_TO_CATEGORY = {
  yellow: 'amber',
  green: 'moss',
  blue: 'lake',
  purple: 'iris',
  pink: 'orchid',
  teal: 'lagoon',
  red: 'clay',
  slate: 'graphite'
}

const stickyFor = (mode) =>
  Object.fromEntries(
    Object.entries(STICKY_TO_CATEGORY).map(([id, categoryId]) => {
      const { dot, tint, ink } = categoryColors(
        CATEGORY_SPEC.find((c) => c.id === categoryId),
        mode
      )
      return [id, { bg: tint, border: dot, text: ink }]
    })
  )

export const STICKY_PALETTE = { light: stickyFor('light'), dark: stickyFor('dark') }

/** Hue bands, in OKLCH degrees, named after the presets that live in them. */
const HUE_NAMES = [
  [20, 'Rose'],
  [70, 'Umber'],
  [150, 'Olive'],
  [230, 'Teal'],
  [270, 'Lake'],
  [310, 'Iris'],
  [345, 'Plum'],
  [360, 'Rose']
]

/**
 * A preset-family name for any colour, by its OKLCH hue; near-greys are
 * Graphite.
 */
export function getColorName(hex) {
  const { C, h } = hexToOklch(hex)
  if (C < 0.03) return 'Graphite'
  return HUE_NAMES.find(([upTo]) => h < upTo)[1]
}
