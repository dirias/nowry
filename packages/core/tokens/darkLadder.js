/**
 * A signed-in learner's dark mode (ADR-082): a near-black ladder tinted by
 * their own accent, with the accent on top.
 *
 * ADR-074's dark grounds (the brand's teal at chroma ~0.05) stay for guests
 * (`generateBrandScheme`); a signed-in learner's dark mode is this ladder, on
 * both clients. Light mode never reads this file.
 *
 *   Grounds   one lightness ladder; chroma 0.025 in the accent's hue, 0.012 for
 *             warm hues (40–110), neutral when the accent has almost no chroma
 *   Text      Paper at three steps, never tinted
 *   Accent    the picked lightness kept within 0.72–0.86, ink text; large fills
 *             cap chroma at 0.11, small marks keep the picked chroma; a solid
 *             within 0.08 of gold or danger moves to a paler tone of its hue
 */
import { deltaE, hexToOklch, oklchToHex } from './oklch'
import { BETA_MARK, EASY_SPEC, GOLD_SPEC, STATUS_SPEC, buildTone } from './colorSystem'

const PAPER_HUE = 85
const NEUTRAL_HUE = 250

/** Lightness of each ground step. */
export const MEMBER_DARK_L = Object.freeze({
  body: 0.165,
  surface: 0.21,
  level1: 0.245,
  popup: 0.26,
  level2: 0.285,
  level3: 0.325,
  divider: 0.3,
  border: 0.35,
  field: 0.53,
  neutralSolid: 0.45,
  neutralMid: 0.5
})

/** How much of the accent's hue the grounds carry. */
export const MEMBER_DARK_TINT = Object.freeze({ chroma: 0.025, warm: 0.012, warmHues: [40, 110], neutral: 0.004, neutralBelow: 0.03 })

/** The most colourful a large fill (a solid, a selected card) may be on near-black. */
export const FILL_MAX_CHROMA = 0.11

/** Two colours closer than this in OKLCH read as one. */
export const MEANING_DISTANCE = 0.08

const SOLID_L = { min: 0.72, max: 0.86 }
const GUARD = { gold: { L: 0.9, C: 0.08 }, danger: { L: 0.84, C: 0.09 } }
const DANGER_DARK_SOLID = oklchToHex(STATUS_SPEC.danger.darkSolidL, STATUS_SPEC.danger.C, STATUS_SPEC.danger.h)
const GOLD_DARK_SOLID = oklchToHex(GOLD_SPEC.darkSolidL, GOLD_SPEC.C, GOLD_SPEC.h)

const paper = (L) => oklchToHex(L, 0.006, PAPER_HUE)
const isWarm = (h) => h >= MEMBER_DARK_TINT.warmHues[0] && h <= MEMBER_DARK_TINT.warmHues[1]

/** The grounds' chroma and hue for an accent. */
export function groundTint(accentHex) {
  const { C, h } = hexToOklch(accentHex)
  if (C < MEMBER_DARK_TINT.neutralBelow) return { C: MEMBER_DARK_TINT.neutral, h: NEUTRAL_HUE }
  return { C: isWarm(h) ? MEMBER_DARK_TINT.warm : MEMBER_DARK_TINT.chroma, h }
}

/** Neutrals, background, text, divider and the field border for an accent. */
export function memberDarkNeutrals(accentHex) {
  const tint = groundTint(accentHex)
  const ground = (L) => oklchToHex(L, tint.C, tint.h)
  const L = MEMBER_DARK_L
  const text = { primary: paper(0.94), secondary: paper(0.8), tertiary: paper(0.7), icon: paper(0.7) }
  const scale = {
    50: paper(0.96),
    100: text.primary,
    200: paper(0.87),
    300: text.secondary,
    400: text.tertiary,
    500: ground(L.neutralMid),
    600: ground(L.border),
    700: ground(L.divider),
    800: ground(L.level1),
    900: ground(L.surface)
  }
  return {
    scale,
    background: {
      body: ground(L.body),
      surface: ground(L.surface),
      popup: ground(L.popup),
      level1: ground(L.level1),
      level2: ground(L.level2),
      level3: ground(L.level3),
      tooltip: ground(L.level3)
    },
    text,
    neutral: {
      outlinedBorder: ground(L.border),
      plainColor: text.secondary,
      softBg: ground(L.level2),
      solidBg: ground(L.neutralSolid),
      plainHoverBg: ground(L.level1),
      plainActiveBg: ground(L.level2)
    },
    divider: ground(L.divider),
    fieldBorder: ground(L.field)
  }
}

/** Where a learner's solid lands, after the clamp, the fill cap and the guard. */
export function memberDarkSolid(accentHex) {
  const { L, C, h } = hexToOklch(accentHex)
  const solidL = Math.min(Math.max(L, SOLID_L.min), SOLID_L.max)
  const fillC = Math.min(C, FILL_MAX_CHROMA)
  const plain = oklchToHex(solidL, fillC, h)
  if (deltaE(plain, GOLD_DARK_SOLID) < MEANING_DISTANCE) return { L: GUARD.gold.L, C: Math.min(fillC, GUARD.gold.C), h, guarded: 'gold' }
  if (deltaE(plain, DANGER_DARK_SOLID) < MEANING_DISTANCE)
    return { L: GUARD.danger.L, C: Math.min(fillC, GUARD.danger.C), h, guarded: 'danger' }
  return { L: solidL, C: fillC, h, guarded: null }
}

/** Soft and hover tints that sit just above near-black, for any tone. */
const nearBlackTints = (C, h) => {
  const at = (L, chroma) => oklchToHex(L, chroma, h)
  const tint = [at(0.3, Math.min(C * 0.45, 0.06)), at(0.335, Math.min(C * 0.5, 0.065)), at(0.37, Math.min(C * 0.55, 0.07))]
  const hover = at(0.27, Math.min(C * 0.4, 0.05))
  return {
    softBg: tint[0],
    softHoverBg: tint[1],
    softActiveBg: tint[2],
    softColor: at(0.9, C * 0.55),
    plainHoverBg: hover,
    plainActiveBg: tint[0],
    outlinedHoverBg: hover,
    outlinedActiveBg: tint[0]
  }
}

/** The learner's accent as every Joy variant key, on near-black. */
export function memberDarkAccent(accentHex, inkHex) {
  const { C: picked, h } = hexToOklch(accentHex)
  const solid = memberDarkSolid(accentHex)
  // Small marks keep the picked chroma (the gamut clamps it); large fills do not.
  const markC = solid.guarded ? solid.C : picked
  const at = (L, C) => oklchToHex(L, C, h)
  const markL = Math.max(0.8, solid.L)
  return {
    ...buildTone({ C: Math.min(picked, 0.13), h }, 'dark'),
    solidBg: at(solid.L, solid.C),
    solidHoverBg: at(Math.min(solid.L + 0.04, 0.93), solid.C),
    solidActiveBg: at(solid.L - 0.05, solid.C),
    solidColor: inkHex,
    ...nearBlackTints(solid.C, h),
    plainColor: at(markL, markC * 0.9),
    outlinedColor: at(markL, markC * 0.9),
    outlinedBorder: at(0.6, markC * 0.8),
    outlinedHoverBorder: at(0.68, markC * 0.85)
  }
}

/** A status or gold tone with its tints re-stepped for near-black. */
export const memberDarkTone = (spec) => ({ ...buildTone(spec, 'dark'), ...nearBlackTints(spec.C, spec.h) })

/**
 * The whole dark palette for a signed-in learner, in the shape
 * `generateColorScheme` returns for one mode.
 */
export function memberDarkScheme(accentHex) {
  const n = memberDarkNeutrals(accentHex)
  const primary = memberDarkAccent(accentHex, n.background.body)
  return {
    primary,
    success: memberDarkTone(STATUS_SPEC.success),
    warning: memberDarkTone(STATUS_SPEC.warning),
    danger: memberDarkTone(STATUS_SPEC.danger),
    gold: memberDarkTone(GOLD_SPEC),
    easy: memberDarkTone(EASY_SPEC),
    neutral: { ...n.scale, ...n.neutral },
    background: { ...n.background },
    text: { ...n.text },
    divider: n.divider,
    fieldBorder: n.fieldBorder,
    focusVisible: primary.plainColor,
    // The app bar one step off the page with the card border under it (ADR-082 §6).
    bar: { bg: n.background.level1, fg: n.text.primary, line: n.neutral.outlinedBorder },
    beta: { ...BETA_MARK }
  }
}
