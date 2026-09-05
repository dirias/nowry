/**
 * Professional Color Scheme Generator
 * Generates a complete, harmonious color palette from a single primary color
 * Based on color theory, accessibility standards, and modern UI/UX best practices
 */

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h,
    s,
    l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Convert HSL to hex
 */
function hslToHex(h, s, l) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Text extremes used as candidates for foreground-on-accent decisions */
const WHITE = '#ffffff'
const BLACK = '#000000'

/** Minimum contrast ratio for normal-size text — WCAG 2.1 AA (SC 1.4.3) */
const AA_TEXT_CONTRAST = 4.5

/**
 * WCAG 2.2 §1.4.11 Non-text Contrast. Focus indicators, selected-state markers
 * and control boundaries are not text, and 3:1 is the floor they have to clear
 * against whatever they sit on.
 *
 * It is a separate constant from AA_TEXT_CONTRAST because holding a hairline
 * border to the 4.5:1 text floor would make every outlined control on the page
 * shout, and holding text to 3:1 would make it unreadable. Two jobs, two
 * numbers.
 */
const AA_NON_TEXT_CONTRAST = 3

/**
 * Parse a hex color into 8-bit RGB channels.
 * Accepts `#abc`, `#aabbcc` (with or without `#`). Returns null when unparseable.
 */
function hexToRGB(hex) {
  let value = String(hex ?? '')
    .trim()
    .replace(/^#/, '')

  if (value.length === 3) {
    value = value
      .split('')
      .map((channel) => channel + channel)
      .join('')
  }

  if (!/^[0-9a-f]{6}$/i.test(value)) return null

  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16)
  }
}

/**
 * WCAG 2.x relative luminance of a color (0 = black, 1 = white).
 * sRGB channels are linearised, then weighted 0.2126 / 0.7152 / 0.0722.
 * Unparseable input falls back to black so theme generation can never throw.
 */
export function relativeLuminance(hex) {
  const rgb = hexToRGB(hex)
  if (!rgb) return 0

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * WCAG contrast ratio between two colors: (L1 + 0.05) / (L2 + 0.05).
 * Ranges from 1 (identical) to 21 (black vs white). Order-independent.
 */
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Worst (lowest) contrast a foreground reaches across every background it can sit on */
function worstContrast(foreground, backgrounds) {
  return backgrounds.reduce((lowest, background) => Math.min(lowest, contrastRatio(foreground, background)), Infinity)
}

/**
 * Text color (white or black) that maximises contrast against a background,
 * reaching AA (4.5:1) whenever either extreme can.
 *
 * Derived from the resting background of the slot it labels. Hover/active
 * backgrounds are deliberately not folded in: Joy UI exposes a single text
 * color per variant, and a hover shade can sit on the other side of the
 * luminance midpoint — optimising for the transient state would cost contrast
 * on the state the user actually reads.
 */
export function readableTextOn(backgroundHex) {
  const whiteRatio = contrastRatio(WHITE, backgroundHex)
  const blackRatio = contrastRatio(BLACK, backgroundHex)
  const best = Math.max(whiteRatio, blackRatio)

  if (best < AA_TEXT_CONTRAST && process.env.NODE_ENV !== 'production') {
    // Surfaced rather than swallowed: mid-luminance backgrounds cannot reach AA
    // with either extreme, so the palette ships the best available and says so.
    console.warn(
      `[colorSchemeGenerator] No text color reaches ${AA_TEXT_CONTRAST}:1 on ${backgroundHex} — using best available (${best.toFixed(2)}:1)`
    )
  }

  return whiteRatio >= blackRatio ? WHITE : BLACK
}

/**
 * Keep an accent-tinted foreground legible without discarding its identity:
 * hue and saturation are preserved, only lightness is nudged — and only when
 * the color already fails. Compliant colors are returned byte-identical, so
 * accessible palettes keep their exact current look.
 *
 * Scans outwards from the original lightness and returns the nearest passing
 * shade; if no shade reaches the target, returns the highest-contrast one.
 */
function ensureReadable(foreground, backgrounds, minRatio = AA_TEXT_CONTRAST) {
  if (worstContrast(foreground, backgrounds) >= minRatio) return foreground

  const hsl = hexToHSL(foreground)
  let best = { hex: foreground, ratio: worstContrast(foreground, backgrounds) }

  for (let step = 1; step <= 100; step++) {
    for (const lightness of [hsl.l - step, hsl.l + step]) {
      if (lightness < 0 || lightness > 100) continue

      const candidate = hslToHex(hsl.h, hsl.s, lightness)
      const ratio = worstContrast(candidate, backgrounds)

      if (ratio >= minRatio) return candidate
      if (ratio > best.ratio) best = { hex: candidate, ratio }
    }
  }

  return best.hex
}

/**
 * Generate shades and tints of a color
 */
function generateColorVariations(hex) {
  const hsl = hexToHSL(hex)

  return {
    // Darker shades (for hover, active states)
    darker: hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 8, 10)),
    darkest: hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 15, 5)),

    // Lighter tints (for backgrounds, soft variants)
    lighter: hslToHex(hsl.h, Math.max(hsl.s - 10, 20), Math.min(hsl.l + 35, 95)),
    lightest: hslToHex(hsl.h, Math.max(hsl.s - 15, 15), Math.min(hsl.l + 45, 98)),

    // Very light (for subtle backgrounds)
    veryLight: hslToHex(hsl.h, Math.max(hsl.s - 20, 10), 97),

    // Muted version (for secondary elements)
    muted: hslToHex(hsl.h, Math.max(hsl.s - 30, 20), hsl.l)
  }
}

/**
 * Generate complementary accent colors using color theory
 */
function generateAccentColors(primaryHex) {
  const hsl = hexToHSL(primaryHex)

  // Success: Analogous green (shifted towards green)
  const successHue = 150 // Professional green
  const success = hslToHex(successHue, 65, 45)

  // Warning: Yellow-orange (warm, attention-grabbing)
  const warningHue = 45
  const warning = hslToHex(warningHue, 95, 50)

  // Danger: Red (universal danger color)
  const dangerHue = 0
  const danger = hslToHex(dangerHue, 70, 50)

  return { success, warning, danger }
}

/** Page surfaces a plain-variant accent text can sit on, per mode */
const LIGHT_BACKGROUND = { body: '#ffffff', surface: '#f9f9f9', popup: '#ffffff' }
const DARK_BACKGROUND = { body: '#0d1117', surface: '#161b22', popup: '#1e242c' }

/**
 * Build one semantic color group (success / warning / danger).
 * `solidColor` is derived from the solid backgrounds it actually renders on,
 * and `softColor` is nudged until it is legible on its own `softBg`.
 */
function buildSemanticGroup({ solidBg, solidHoverBg, softBg, softColor }) {
  return {
    solidBg,
    solidHoverBg,
    solidColor: readableTextOn(solidBg),
    softBg,
    softColor: ensureReadable(softColor, [softBg])
  }
}

/**
 * Light-mode palette. Every foreground is derived from the background it sits
 * on, so an accent of any lightness (including near-black or near-white) still
 * produces readable text.
 */
function buildLightScheme(primaryColor, variations, accents) {
  const pageSurfaces = [LIGHT_BACKGROUND.body, LIGHT_BACKGROUND.surface]
  const softBg = variations.veryLight

  return {
    primary: {
      plainColor: ensureReadable(primaryColor, pageSurfaces),
      plainHoverBg: variations.lightest,
      plainActiveBg: variations.lighter,
      solidBg: primaryColor,
      solidHoverBg: variations.darker,
      solidActiveBg: variations.darkest,
      solidColor: readableTextOn(primaryColor),
      softBg,
      softHoverBg: variations.lightest,
      softActiveBg: variations.lighter,
      softColor: ensureReadable(primaryColor, [softBg]),
      outlinedBorder: variations.lighter,
      outlinedHoverBg: variations.lightest
    },
    success: buildSemanticGroup({
      solidBg: accents.success,
      solidHoverBg: hslToHex(150, 65, 40),
      softBg: hslToHex(150, 50, 95),
      softColor: hslToHex(150, 70, 35)
    }),
    warning: buildSemanticGroup({
      solidBg: accents.warning,
      solidHoverBg: hslToHex(45, 95, 45),
      softBg: hslToHex(45, 90, 95),
      softColor: hslToHex(45, 95, 40)
    }),
    danger: buildSemanticGroup({
      solidBg: accents.danger,
      solidHoverBg: hslToHex(0, 70, 45),
      softBg: hslToHex(0, 65, 95),
      softColor: hslToHex(0, 75, 45)
    }),
    neutral: {
      plainHoverBg: 'rgba(0, 0, 0, 0.04)'
    },
    background: { ...LIGHT_BACKGROUND },
    text: {
      primary: '#1c1c1c',
      secondary: '#444',
      tertiary: '#777'
    }
  }
}

/**
 * Dark-mode palette. Same contrast derivation as light mode, against the dark
 * surfaces — the accent keeps its hue, only its lightness is corrected.
 */
function buildDarkScheme(primaryColor, variations, primaryHSL) {
  const pageSurfaces = [DARK_BACKGROUND.body, DARK_BACKGROUND.surface]
  const softBg = hslToHex(primaryHSL.h, primaryHSL.s - 10, 12)
  const plainCandidate = hslToHex(primaryHSL.h, Math.min(primaryHSL.s + 25, 100), Math.min(primaryHSL.l + 30, 75))
  const softCandidate = hslToHex(primaryHSL.h, Math.min(primaryHSL.s + 30, 100), 75)

  /*
   * The dark scheme used to omit `outlinedBorder` entirely, and Joy's default
   * filled the gap with #12467B — a BLUE, at 1.97:1 against the page. Since
   * this codebase draws its focus rings with that token, every focus indicator
   * in the app was both off-brand and below the 3:1 non-text floor in dark
   * mode: present in the stylesheet, invisible on the screen.
   *
   * A mid-lightness accent is the right starting point — dark enough to read as
   * a border rather than a highlight — and `ensureReadable` moves it only if it
   * fails, keeping the hue and saturation that make it recognisably the user's
   * colour.
   */
  const borderCandidate = hslToHex(primaryHSL.h, primaryHSL.s, 45)

  return {
    primary: {
      plainColor: ensureReadable(plainCandidate, pageSurfaces),
      plainHoverBg: hslToHex(primaryHSL.h, primaryHSL.s, 15),
      outlinedBorder: ensureReadable(borderCandidate, pageSurfaces, AA_NON_TEXT_CONTRAST),
      solidBg: variations.darkest,
      solidHoverBg: variations.darker,
      solidActiveBg: primaryColor,
      solidColor: readableTextOn(variations.darkest),
      softBg,
      softHoverBg: hslToHex(primaryHSL.h, primaryHSL.s, 15),
      softColor: ensureReadable(softCandidate, [softBg])
    },
    success: buildSemanticGroup({
      solidBg: hslToHex(150, 55, 40),
      solidHoverBg: hslToHex(150, 60, 45),
      softBg: hslToHex(150, 30, 12),
      softColor: hslToHex(150, 70, 65)
    }),
    warning: buildSemanticGroup({
      solidBg: hslToHex(45, 85, 50),
      solidHoverBg: hslToHex(45, 90, 55),
      softBg: hslToHex(45, 40, 12),
      softColor: hslToHex(45, 95, 70)
    }),
    danger: buildSemanticGroup({
      solidBg: hslToHex(0, 65, 50),
      solidHoverBg: hslToHex(0, 70, 55),
      softBg: hslToHex(0, 35, 12),
      softColor: hslToHex(0, 75, 70)
    }),
    background: { ...DARK_BACKGROUND },
    text: {
      primary: '#e6edf3',
      secondary: '#9ba9b4',
      tertiary: '#7d8590'
    }
  }
}

/**
 * Generate a complete, professional color scheme from a primary color
 * Returns a theme-compatible palette for both light and dark modes
 */
export function generateColorScheme(primaryColor) {
  const variations = generateColorVariations(primaryColor)
  const accents = generateAccentColors(primaryColor)
  const primaryHSL = hexToHSL(primaryColor)

  return {
    light: buildLightScheme(primaryColor, variations, accents),
    dark: buildDarkScheme(primaryColor, variations, primaryHSL)
  }
}

/**
 * Sticky-note tag palette (Blackboard feature)
 *
 * Fixed, recognizable "note color" swatches — independent of the user's chosen
 * primary theme color, same reasoning as why success/warning/danger are already
 * independent of primary above. Light values are the original hardcoded hex
 * literals preserved exactly (no visual change). Dark values are generated with
 * hslToHex() using the same hue/saturation family as each light swatch, tuned for
 * dark-surface contrast (subdued tinted bg, brighter border accent, light legible text) —
 * mirroring the lightness curve already used for success/warning/danger dark variants above.
 */
export const STICKY_PALETTE = {
  light: {
    yellow: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    green: { bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
    blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
    purple: { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
    pink: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
    teal: { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
    red: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
    slate: { bg: '#f1f5f9', border: '#64748b', text: '#0f172a' }
  },
  dark: {
    yellow: { bg: hslToHex(38, 38, 14), border: hslToHex(38, 88, 55), text: hslToHex(38, 90, 75) },
    green: { bg: hslToHex(158, 32, 14), border: hslToHex(158, 55, 48), text: hslToHex(158, 65, 72) },
    blue: { bg: hslToHex(217, 38, 15), border: hslToHex(217, 75, 60), text: hslToHex(217, 90, 80) },
    purple: { bg: hslToHex(258, 36, 16), border: hslToHex(258, 70, 65), text: hslToHex(258, 85, 82) },
    pink: { bg: hslToHex(330, 34, 15), border: hslToHex(330, 70, 62), text: hslToHex(330, 80, 82) },
    teal: { bg: hslToHex(173, 32, 14), border: hslToHex(173, 55, 48), text: hslToHex(173, 65, 72) },
    red: { bg: hslToHex(0, 36, 15), border: hslToHex(0, 65, 55), text: hslToHex(0, 80, 80) },
    slate: { bg: hslToHex(215, 16, 18), border: hslToHex(215, 15, 58), text: hslToHex(215, 20, 85) }
  }
}

/**
 * Get color name suggestion based on hue
 */
export function getColorName(hex) {
  const hsl = hexToHSL(hex)
  const h = hsl.h

  if (h >= 0 && h < 15) return 'Crimson Red'
  if (h >= 15 && h < 45) return 'Sunset Orange'
  if (h >= 45 && h < 70) return 'Golden Yellow'
  if (h >= 70 && h < 150) return 'Forest Green'
  if (h >= 150 && h < 200) return 'Ocean Teal'
  if (h >= 200 && h < 250) return 'Sky Blue'
  if (h >= 250 && h < 290) return 'Royal Purple'
  if (h >= 290 && h < 330) return 'Rose Pink'
  return 'Ruby Red'
}

/**
 * Generate color scheme presets for onboarding
 *
 * `contrastText` is the readable foreground for a swatch painted in the literal
 * preset color — consumers drawing their own swatch (checkmark, label) use it
 * instead of assuming white.
 */
export function getColorPresets() {
  return [
    { color: '#2a6971', label: 'Ocean Teal' },
    { color: '#0b6bcb', label: 'Sky Blue' },
    { color: '#9c27b0', label: 'Royal Purple' },
    { color: '#e91e63', label: 'Rose Pink' },
    { color: '#f44336', label: 'Crimson Red' },
    { color: '#ff9800', label: 'Sunset Orange' },
    { color: '#4caf50', label: 'Forest Green' },
    { color: '#795548', label: 'Earth Brown' }
  ].map((preset) => ({ ...preset, contrastText: readableTextOn(preset.color) }))
}
