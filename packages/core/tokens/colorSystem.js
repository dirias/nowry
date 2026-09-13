/**
 * Nowry's colour system: six roles on one OKLCH ladder (ADR-034).
 *
 *   1 Brand       fixed — the Spiral's colours, never UI state
 *   2 Neutrals    warm paper in light, deep teal-ink in dark; text is always ink
 *   3 Accent      the learner's colour, normalised onto the ladder
 *   4 Status      moss, amber, brick — done, attention, destructive
 *   5 Gold        earned only: stage marks, motes, a finished year
 *   6 Categories  one family of eight for everything a learner tags
 *
 * Every value is COMPUTED from a lightness, a chroma and a hue. Nothing here is
 * a hex someone copied: change a constant and both clients, and every test that
 * guards contrast, move together. The generator (`colorSchemeGenerator.js`)
 * and the phone's base palette (`palette.js`) both read from this file.
 */
import { contrastRatio, hexToOklch, oklchToHex } from './oklch'

const PAPER_HUE = 85
const INK_HUE = 215

const paper = (L, C) => oklchToHex(L, C, PAPER_HUE)
const ink = (L, C) => oklchToHex(L, C, INK_HUE)

// ── 1 · Brand ──────────────────────────────────────────────────────────────
export const BRAND = Object.freeze({
  inkTeal: oklchToHex(0.335, 0.052, 205),
  coilGold: oklchToHex(0.815, 0.15, 80),
  paper: paper(0.96, 0.013)
})

// ── 2 · Neutrals ───────────────────────────────────────────────────────────
/**
 * Named roles, and the 50–900 scale Joy's own components resolve through.
 * The scale is ordered light → dark in both modes, like Joy's; the roles pick
 * from it the way Joy's defaults do (light: surface 50, level1 100 …; dark:
 * surface 900, level1 800 …), so a Joy token nobody names still lands on the
 * ladder instead of on Joy's blue-grey.
 */
const NEUTRAL_SCALE = {
  light: {
    50: paper(0.972, 0.007),
    100: paper(0.952, 0.009),
    200: paper(0.922, 0.011),
    300: paper(0.885, 0.012),
    400: ink(0.7, 0.012),
    500: ink(0.5, 0.013),
    600: ink(0.44, 0.015),
    700: ink(0.4, 0.016),
    800: ink(0.235, 0.018),
    900: ink(0.17, 0.018)
  },
  dark: {
    50: paper(0.975, 0.006),
    100: paper(0.945, 0.008),
    200: paper(0.87, 0.009),
    300: paper(0.79, 0.01),
    400: paper(0.69, 0.01),
    500: ink(0.45, 0.02),
    600: ink(0.328, 0.022),
    700: ink(0.286, 0.022),
    800: ink(0.248, 0.021),
    900: ink(0.224, 0.021)
  }
}

const neutralRoles = (mode) => {
  const s = NEUTRAL_SCALE[mode]
  const light = mode === 'light'
  return {
    scale: s,
    background: light
      ? { body: paper(0.988, 0.004), surface: s[50], popup: paper(0.995, 0.003), level1: s[100], level2: s[200], level3: s[300], tooltip: s[800] }
      : { body: ink(0.188, 0.019), surface: s[900], popup: ink(0.258, 0.022), level1: s[800], level2: s[700], level3: s[600], tooltip: s[600] },
    text: light
      ? { primary: s[800], secondary: s[700], tertiary: s[500], icon: s[500] }
      : { primary: s[100], secondary: s[300], tertiary: s[400], icon: s[400] },
    neutral: light
      ? { outlinedBorder: s[300], plainColor: s[700], softBg: s[100], solidBg: s[500] }
      : { outlinedBorder: s[700], plainColor: s[300], softBg: s[800], solidBg: s[500] },
    divider: light ? s[200] : s[700]
  }
}

export const NEUTRALS = Object.freeze({ light: neutralRoles('light'), dark: neutralRoles('dark') })

// ── Tones: one builder for the accent, status and gold ─────────────────────
/** Lightness steps for the 50–900 scale of any hue. */
const TONE_STEPS = { 50: 0.975, 100: 0.95, 200: 0.905, 300: 0.84, 400: 0.72, 500: 0.62, 600: 0.505, 700: 0.445, 800: 0.375, 900: 0.3 }

const toneScale = (C, h) => Object.fromEntries(Object.entries(TONE_STEPS).map(([step, L]) => [step, oklchToHex(L, C, h)]))

/** Ink or paper, whichever reads better on a background. */
const textOn = (background, mode) => {
  const { text } = NEUTRALS[mode]
  const dark = mode === 'light' ? text.primary : NEUTRALS.dark.background.body
  const light = NEUTRALS.light.background.popup
  return contrastRatio(light, background) >= contrastRatio(dark, background) ? light : dark
}

const softSteps = (at, C, L) => [at(L[0], Math.min(C * 0.32, 0.03)), at(L[1], Math.min(C * 0.4, 0.04)), at(L[2], Math.min(C * 0.45, 0.05))]

function lightTone({ C, h, solidL = 0.505 }) {
  const at = (L, chroma = C) => oklchToHex(L, chroma, h)
  const solidBg = at(solidL)
  const [tint, tintHover, tintActive] = softSteps(at, C, [0.95, 0.92, 0.89])
  return {
    ...toneScale(C, h),
    solidBg,
    solidHoverBg: at(solidL - 0.05),
    solidActiveBg: at(solidL - 0.11),
    solidColor: textOn(solidBg, 'light'),
    softBg: tint,
    softHoverBg: tintHover,
    softActiveBg: tintActive,
    softColor: at(0.41),
    plainColor: at(0.47),
    plainHoverBg: tint,
    plainActiveBg: tintHover,
    outlinedColor: at(0.47),
    outlinedBorder: at(0.8, C * 0.55),
    outlinedHoverBorder: at(0.7, C * 0.8),
    outlinedHoverBg: tint,
    outlinedActiveBg: tintHover
  }
}

function darkTone({ C, h, darkSolidL = 0.7 }) {
  const at = (L, chroma = C) => oklchToHex(L, chroma, h)
  const solidBg = at(darkSolidL)
  const [tint, tintHover, tintActive] = softSteps(at, C * 1.4, [0.27, 0.31, 0.35])
  return {
    ...toneScale(C, h),
    solidBg,
    solidHoverBg: at(darkSolidL + 0.05),
    solidActiveBg: at(darkSolidL - 0.06),
    solidColor: textOn(solidBg, 'dark'),
    softBg: tint,
    softHoverBg: tintHover,
    softActiveBg: tintActive,
    softColor: at(0.85, C * 0.75),
    plainColor: at(0.8, C * 0.85),
    plainHoverBg: tint,
    plainActiveBg: tintHover,
    outlinedColor: at(0.8, C * 0.85),
    outlinedBorder: at(0.55, C * 0.7),
    outlinedHoverBorder: at(0.62, C * 0.8),
    outlinedHoverBg: tint,
    outlinedActiveBg: tintHover
  }
}

/**
 * Every Joy variant key for one hue, plus its 50–900 scale. `solidL` is the
 * tone's resting lightness in light mode; `darkSolidL` lifts it so the solid
 * reads on a dark ground, where text on it turns to ink.
 */
export const buildTone = (spec, mode) => (mode === 'light' ? lightTone(spec) : darkTone(spec))

// ── 3 · Accent ─────────────────────────────────────────────────────────────
/** The most colourful an accent may be; above it presets turn neon. */
export const ACCENT_MAX_CHROMA = 0.13

/**
 * Any hex → the learner's accent tone. Lightness is the ladder's, hue is the
 * learner's, chroma is theirs up to the cap — so black, white, a neon and a
 * preset all come out equally readable, and still recognisably what was picked.
 */
export function accentTone(hex, mode) {
  const { C, h } = hexToOklch(hex)
  return buildTone({ C: Math.min(C, ACCENT_MAX_CHROMA), h }, mode)
}

// ── 4 · Status and 5 · Gold ────────────────────────────────────────────────
export const STATUS_SPEC = Object.freeze({
  success: { C: 0.11, h: 152, solidL: 0.55, darkSolidL: 0.77 },
  warning: { C: 0.145, h: 58, solidL: 0.76, darkSolidL: 0.78 },
  danger: { C: 0.16, h: 28, solidL: 0.53, darkSolidL: 0.7 }
})

export const GOLD_SPEC = Object.freeze({ C: 0.15, h: 80, solidL: 0.815, darkSolidL: 0.815 })

/** Gold as one literal, for surfaces that append hex alpha or paint a canvas. */
export const EARNED_GOLD = oklchToHex(GOLD_SPEC.solidL, GOLD_SPEC.C, GOLD_SPEC.h)

// ── 6 · Categories ─────────────────────────────────────────────────────────
/**
 * One family for everything a learner tags. Ids are stable because they are
 * stored (sticky notes save the id); the hex a focus area or a cover saves is
 * the light `dot`, which reads on both grounds.
 */
export const CATEGORY_SPEC = Object.freeze([
  { id: 'clay', h: 32, C: 0.12 },
  { id: 'amber', h: 68, C: 0.12 },
  { id: 'citron', h: 105, C: 0.12 },
  { id: 'moss', h: 148, C: 0.12 },
  { id: 'lagoon', h: 195, C: 0.12 },
  { id: 'lake', h: 245, C: 0.12 },
  { id: 'iris', h: 290, C: 0.12 },
  { id: 'orchid', h: 335, C: 0.12 },
  { id: 'graphite', h: INK_HUE, C: 0.02 }
])

export function categoryColors({ h, C }, mode) {
  if (mode === 'light') {
    return { dot: oklchToHex(0.64, C, h), tint: oklchToHex(0.945, Math.min(C * 0.3, 0.035), h), ink: oklchToHex(0.4, C * 0.7, h) }
  }
  return { dot: oklchToHex(0.72, C * 0.95, h), tint: oklchToHex(0.27, Math.min(C * 0.33, 0.04), h), ink: oklchToHex(0.88, C * 0.5, h) }
}

/** The stored swatch for a category id: its light dot. */
export const categoryDot = (id) => categoryColors(CATEGORY_SPEC.find((c) => c.id === id) ?? CATEGORY_SPEC[0], 'light').dot

/** The swatch a picker stores: the light dot of each chromatic category. */
export const CATEGORY_COLORS = Object.freeze(CATEGORY_SPEC.filter((c) => c.id !== 'graphite').map((c) => categoryColors(c, 'light').dot))
