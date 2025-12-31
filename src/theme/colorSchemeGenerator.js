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

/**
 * Generate a complete, professional color scheme from a primary color
 * Returns a theme-compatible palette for both light and dark modes
 */
export function generateColorScheme(primaryColor) {
  const variations = generateColorVariations(primaryColor)
  const accents = generateAccentColors(primaryColor)
  const primaryHSL = hexToHSL(primaryColor)

  return {
    light: {
      primary: {
        plainColor: primaryColor,
        plainHoverBg: variations.lightest,
        plainActiveBg: variations.lighter,
        solidBg: primaryColor,
        solidHoverBg: variations.darker,
        solidActiveBg: variations.darkest,
        solidColor: '#fff',
        softBg: variations.veryLight,
        softHoverBg: variations.lightest,
        softActiveBg: variations.lighter,
        softColor: primaryColor,
        outlinedBorder: variations.lighter,
        outlinedHoverBg: variations.lightest
      },
      success: {
        solidBg: accents.success,
        solidHoverBg: hslToHex(150, 65, 40),
        solidColor: '#fff',
        softBg: hslToHex(150, 50, 95),
        softColor: hslToHex(150, 70, 35)
      },
      warning: {
        solidBg: accents.warning,
        solidHoverBg: hslToHex(45, 95, 45),
        solidColor: '#000',
        softBg: hslToHex(45, 90, 95),
        softColor: hslToHex(45, 95, 40)
      },
      danger: {
        solidBg: accents.danger,
        solidHoverBg: hslToHex(0, 70, 45),
        solidColor: '#fff',
        softBg: hslToHex(0, 65, 95),
        softColor: hslToHex(0, 75, 45)
      },
      neutral: {
        plainHoverBg: 'rgba(0, 0, 0, 0.04)'
      },
      background: {
        body: '#ffffff',
        surface: '#f9f9f9',
        popup: '#ffffff'
      },
      text: {
        primary: '#1c1c1c',
        secondary: '#444',
        tertiary: '#777'
      }
    },
    dark: {
      primary: {
        plainColor: hslToHex(primaryHSL.h, Math.min(primaryHSL.s + 25, 100), Math.min(primaryHSL.l + 30, 75)),
        plainHoverBg: hslToHex(primaryHSL.h, primaryHSL.s, 15),
        solidBg: variations.darkest,
        solidHoverBg: variations.darker,
        solidActiveBg: primaryColor,
        solidColor: '#fff',
        softBg: hslToHex(primaryHSL.h, primaryHSL.s - 10, 12),
        softHoverBg: hslToHex(primaryHSL.h, primaryHSL.s, 15),
        softColor: hslToHex(primaryHSL.h, Math.min(primaryHSL.s + 30, 100), 75)
      },
      success: {
        solidBg: hslToHex(150, 55, 40),
        solidHoverBg: hslToHex(150, 60, 45),
        solidColor: '#fff',
        softBg: hslToHex(150, 30, 12),
        softColor: hslToHex(150, 70, 65)
      },
      warning: {
        solidBg: hslToHex(45, 85, 50),
        solidHoverBg: hslToHex(45, 90, 55),
        solidColor: '#000',
        softBg: hslToHex(45, 40, 12),
        softColor: hslToHex(45, 95, 70)
      },
      danger: {
        solidBg: hslToHex(0, 65, 50),
        solidHoverBg: hslToHex(0, 70, 55),
        solidColor: '#fff',
        softBg: hslToHex(0, 35, 12),
        softColor: hslToHex(0, 75, 70)
      },
      background: {
        body: '#0d1117',
        surface: '#161b22',
        popup: '#1e242c'
      },
      text: {
        primary: '#e6edf3',
        secondary: '#9ba9b4',
        tertiary: '#7d8590'
      }
    }
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
  ]
}
