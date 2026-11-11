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
/** The mark's own hue: the dark grounds sit on it (ADR-074). */
const TEAL_HUE = 205

const paper = (L, C) => oklchToHex(L, C, PAPER_HUE)
const ink = (L, C) => oklchToHex(L, C, INK_HUE)
const teal = (L, C) => oklchToHex(L, C, TEAL_HUE)

// ── 1 · Brand ──────────────────────────────────────────────────────────────
export const BRAND = Object.freeze({
  inkTeal: teal(0.335, 0.052),
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
  // ADR-074: the dark grounds are the brand's teal. 900 is Ink Teal itself, so
  // a card wears the logo's ground; the text steps are Paper and two below it.
  dark: {
    50: paper(0.975, 0.008),
    100: paper(0.96, 0.013),
    200: paper(0.915, 0.012),
    300: paper(0.87, 0.011),
    400: paper(0.81, 0.011),
    500: teal(0.56, 0.04),
    600: teal(0.47, 0.046),
    700: teal(0.405, 0.05),
    800: teal(0.37, 0.05),
    900: teal(0.335, 0.052)
  }
}

const neutralRoles = (mode) => {
  const s = NEUTRAL_SCALE[mode]
  const light = mode === 'light'
  return {
    scale: s,
    background: light
      ? {
          body: paper(0.988, 0.004),
          surface: s[50],
          popup: paper(0.995, 0.003),
          level1: s[100],
          level2: s[200],
          level3: s[300],
          tooltip: s[800]
        }
      : {
          body: teal(0.285, 0.047),
          surface: s[900],
          popup: teal(0.375, 0.05),
          level1: s[800],
          level2: s[700],
          level3: s[600],
          tooltip: s[600]
        },
    text: light
      ? { primary: s[800], secondary: s[700], tertiary: s[500], icon: s[500] }
      : { primary: s[100], secondary: s[300], tertiary: s[400], icon: s[400] },
    neutral: light
      ? { outlinedBorder: s[300], plainColor: s[700], softBg: s[100], solidBg: s[500] }
      : { outlinedBorder: s[600], plainColor: s[300], softBg: s[800], solidBg: s[500] },
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

/** How light an accent or status solid is in dark mode (ADR-074). */
export const DARK_SOLID_L = 0.76

function lightTone({ C, h, solidL = 0.505, plainL = 0.47, plainC = C }) {
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
    softColor: at(Math.min(0.41, plainL)),
    plainColor: at(plainL, plainC),
    plainHoverBg: tint,
    plainActiveBg: tintHover,
    outlinedColor: at(plainL, plainC),
    outlinedBorder: at(0.62, C * 0.8),
    outlinedHoverBorder: at(0.7, C * 0.8),
    outlinedHoverBg: tint,
    outlinedActiveBg: tintHover
  }
}

function darkTone({ C, h, darkSolidL = DARK_SOLID_L }) {
  const at = (L, chroma = C) => oklchToHex(L, chroma, h)
  const solidBg = at(darkSolidL)
  // Tints sit above the teal grounds (card L 0.335, level2 0.405), never below them.
  const [tint, tintHover, tintActive] = softSteps(at, C * 1.4, [0.42, 0.455, 0.49])
  return {
    ...toneScale(C, h),
    solidBg,
    solidHoverBg: at(darkSolidL + 0.04),
    solidActiveBg: at(darkSolidL - 0.05),
    solidColor: textOn(solidBg, 'dark'),
    softBg: tint,
    softHoverBg: tintHover,
    softActiveBg: tintActive,
    softColor: at(0.93, C * 0.6),
    plainColor: at(0.84, C * 0.85),
    plainHoverBg: tint,
    plainActiveBg: tintHover,
    outlinedColor: at(0.84, C * 0.85),
    outlinedBorder: at(0.68, C * 0.75),
    outlinedHoverBorder: at(0.74, C * 0.8),
    outlinedHoverBg: tint,
    outlinedActiveBg: tintHover
  }
}

/**
 * Every Joy variant key for one hue, plus its 50–900 scale.
 *
 * In light a solid is dark (L 0.505) with paper text. In dark it is LIGHT
 * (L 0.76) with ink text (ADR-074): on the brand's teal grounds no colour can
 * both carry paper text at 4.5:1 and stand 3:1 off the page, so a dark solid
 * disappears into the ground. Text on a solid is therefore always `solidColor`,
 * never a literal white. Warning and gold rest light with ink text in both
 * modes, because amber and gold cannot be dark.
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

/**
 * The brand's own tone, worn while nobody is signed in (ADR-074): Ink Teal
 * solids and teal links on paper, Coil Gold solids and gold links on teal.
 * Inside the app the primary is the learner's and gold means earned.
 */
export const BRAND_TEAL_SPEC = Object.freeze({ C: 0.052, h: TEAL_HUE, solidL: 0.335, plainL: 0.4, plainC: 0.06 })

export const brandTone = (mode) => (mode === 'light' ? buildTone(BRAND_TEAL_SPEC, 'light') : buildTone(GOLD_SPEC, 'dark'))

// ── 4 · Status and 5 · Gold ────────────────────────────────────────────────
export const STATUS_SPEC = Object.freeze({
  success: { C: 0.11, h: 152, solidL: 0.55, darkSolidL: 0.78 },
  warning: { C: 0.145, h: 58, solidL: 0.76, darkSolidL: 0.8 },
  danger: { C: 0.16, h: 28, solidL: 0.53, darkSolidL: 0.74 }
})

export const GOLD_SPEC = Object.freeze({ C: 0.15, h: 80, solidL: 0.815, darkSolidL: 0.815 })

/** Gold as one literal, for surfaces that append hex alpha or paint a canvas. */
export const EARNED_GOLD = oklchToHex(GOLD_SPEC.solidL, GOLD_SPEC.C, GOLD_SPEC.h)

/**
 * Gold for a small earned mark drawn straight on the page. Bright gold is 1.7:1
 * on light paper, so in light mode it deepens to the gold tone's plain colour;
 * on a dark page the bright gold reads as it is.
 */
export const earnedGold = (mode) => (mode === 'light' ? buildTone(GOLD_SPEC, 'light').plainColor : EARNED_GOLD)

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
  // On the teal grounds (ADR-074) a tint sits above a card and a raised panel
  // (L 0.335, 0.37), as the tones' soft tints do, never below them.
  return { dot: oklchToHex(0.78, C * 0.95, h), tint: oklchToHex(0.43, Math.min(C * 0.45, 0.055), h), ink: oklchToHex(0.94, C * 0.4, h) }
}

/** The stored swatch for a category id: its light dot. */
export const categoryDot = (id) => categoryColors(CATEGORY_SPEC.find((c) => c.id === id) ?? CATEGORY_SPEC[0], 'light').dot

/** The swatch a picker stores: the light dot of each chromatic category. */
export const CATEGORY_COLORS = Object.freeze(CATEGORY_SPEC.filter((c) => c.id !== 'graphite').map((c) => categoryColors(c, 'light').dot))
