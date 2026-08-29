/**
 * petColor.js — Pet orb color resolution utilities
 *
 * Resolves the user's accent colour + evolution stage into a 6-digit hex
 * string suitable for the PetOrb gradient and box-shadow.
 *
 * The input is the user's chosen theme colour (`preferences.general.theme_color`),
 * not the former `pet_color` slug. That slug had no picker anywhere in the UI,
 * so it was null for effectively every user — which is why every generated pet
 * came out violet. One colour system now, and it is the one users actually set.
 *
 * Hex (not rgba) is the required output format: every consumer appends a
 * two-digit hex alpha suffix to the resolved value (`${color}55`) to build
 * translucent glows, which only parses against a 6-digit hex.
 *
 * Also provides interest-based species/color suggestion logic used during
 * initial companion setup in AgentSettings.
 */

// ---------------------------------------------------------------------------
// Color map — slug → hex (source of truth for all pet colors)
// ---------------------------------------------------------------------------
/** Accepts '#rrggbb' or 'rrggbb', case-insensitive. */
const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i

// ---------------------------------------------------------------------------
// Stage intensity — how the pet's colour matures as it evolves.
//
// Early stages read pale and washed out (a faint wisp); later stages deepen
// into a saturated, vivid form. This is what makes an evolution legible at a
// glance, so it deliberately replaces the old alpha ramp (0.85 → 1.00), which
// was imperceptible against the orb's own gradient.
//
// The ramp interpolates between endpoints rather than scaling-then-clamping.
// Clamping was the trap: several palette colours (gold, coral, rose) already
// sit near maximum saturation or lightness, so a scale-and-clamp collapsed
// three or four of their stages onto an identical value — the ramp died
// exactly on the colours that needed it most. Anchoring the base into a
// reserved band first leaves headroom in both directions, which makes every
// step strictly monotonic for every colour in the palette.
// ---------------------------------------------------------------------------
const STAGE_COUNT = 6

// Saturation: anchored below 1.0 so the deepest stage still has room to climb.
const SAT_ANCHOR_MAX = 0.8
const SAT_AT_STAGE_1 = 0.55
const SAT_AT_STAGE_6 = 1.25

// Lightness: anchored inside the band so no stage clips, keeping every form
// readable against both the light and dark app grounds.
const LIGHT_ANCHOR_MIN = 0.4
const LIGHT_ANCHOR_MAX = 0.68
const LIGHT_SPREAD = 0.1

const lerp = (from, to, t) => from + (to - from) * t

// ---------------------------------------------------------------------------
// Default dominant colors per stage — used when no custom color is set.
// These mirror the STAGE_CONFIG.dominantColor values in StudyPet.js.
// ---------------------------------------------------------------------------
const STAGE_DOMINANT = {
  1: '#64b4ff',
  2: '#78dcaa',
  3: '#a445ff',
  4: '#ffbe3c',
  5: '#dc64ff',
  6: '#ffe650'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** RGB (0–255) → HSL with all three channels normalised to 0–1. */
function rgbToHsl({ r, g, b }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min

  if (delta === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h
  if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / delta + 2) / 6
  else h = ((rn - gn) / delta + 4) / 6

  return { h, s, l }
}

/** HSL with 0–1 channels → 6-digit hex string. */
function hslToHex({ h, s, l }) {
  const hueToChannel = (p, q, t) => {
    let tn = t
    if (tn < 0) tn += 1
    if (tn > 1) tn -= 1
    if (tn < 1 / 6) return p + (q - p) * 6 * tn
    if (tn < 1 / 2) return q
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
    return p
  }

  let r
  let g
  let b
  if (s === 0) {
    r = l
    g = l
    b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToChannel(p, q, h + 1 / 3)
    g = hueToChannel(p, q, h)
    b = hueToChannel(p, q, h - 1 / 3)
  }

  const toHex = (channel) =>
    Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ---------------------------------------------------------------------------
// resolveColor
// ---------------------------------------------------------------------------
/**
 * Resolve a color slug + evolution stage into a concrete 6-digit hex string.
 *
 * The accent fixes the hue (the pet's identity, chosen by the user); the stage
 * shifts saturation and lightness (the pet's maturity, earned through study).
 *
 * @param {string|null} accentColor - The user's theme colour hex, or null for the stage default.
 * @param {number} stage            - Evolution stage (1–6).
 * @returns {string}                - A 6-digit hex string, e.g. '#a855f7'.
 */
export function resolveColor(accentColor, stage) {
  const safeStage = STAGE_DOMINANT[stage] ? stage : 1
  const baseHex = HEX_RE.test(accentColor ?? '') ? accentColor : STAGE_DOMINANT[safeStage]
  const rgb = hexToRgb(baseHex)
  if (!rgb) return STAGE_DOMINANT[1]

  const { h, s, l } = rgbToHsl(rgb)

  // 0 at the first stage, 1 at the last.
  const t = (safeStage - 1) / (STAGE_COUNT - 1)

  const satAnchor = Math.min(s, SAT_ANCHOR_MAX)
  const lightAnchor = clamp(l, LIGHT_ANCHOR_MIN, LIGHT_ANCHOR_MAX)

  return hslToHex({
    h,
    s: clamp(lerp(satAnchor * SAT_AT_STAGE_1, satAnchor * SAT_AT_STAGE_6, t), 0, 1),
    l: lerp(lightAnchor + LIGHT_SPREAD, lightAnchor - LIGHT_SPREAD, t)
  })
}

// ---------------------------------------------------------------------------
// Primary topic → species (a generation input, never shown to the user)
// ---------------------------------------------------------------------------
// Exact taxonomy values, not keyword substrings. The substring form matched
// "art" inside "artificial_intelligence", so every AI & Machine Learning
// learner was quietly assigned a cat.
const SPECIES_BY_TOPIC = {
  artificial_intelligence: 'robot',
  technology: 'robot',
  mathematics: 'crystal',
  science: 'star',
  health: 'phoenix',
  music: 'music',
  art: 'cat',
  design: 'cat',
  literature: 'owl',
  history: 'owl',
  languages: 'owl',
  business: 'dragon',
  philosophy: 'fox',
  psychology: 'fox'
}

/**
 * Suggest a species based on user interests.
 *
 * No longer suggests a colour: the companion's colour follows the user's own
 * theme accent, so there is nothing left to guess.
 *
 * @param {string[]} interests - Array of interest strings from user profile.
 * @returns {{ species: string }}
 */
export function suggestFromInterests(interests = []) {
  if (!interests || interests.length === 0) return { species: 'owl' }
  // Ranked: the first topic that maps wins, so the primary topic decides.
  for (const interest of interests) {
    const species = SPECIES_BY_TOPIC[String(interest).trim().toLowerCase()]
    if (species) return { species }
  }
  return { species: 'owl' }
}
