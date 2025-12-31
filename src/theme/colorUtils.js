/**
 * Simple color utility to generate palette variations
 * and theme objects for Joy UI
 */

// Convert Hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

// Convert RGB to Hex
const rgbToHex = (r, g, b) => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Lighten color by percentage
const lighten = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex)
  const t = percent / 100

  const newR = Math.round(r + (255 - r) * t)
  const newG = Math.round(g + (255 - g) * t)
  const newB = Math.round(b + (255 - b) * t)

  return rgbToHex(newR, newG, newB)
}

// Darken color by percentage
const darken = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex)
  const t = percent / 100

  const newR = Math.round(r * (1 - t))
  const newG = Math.round(g * (1 - t))
  const newB = Math.round(b * (1 - t))

  return rgbToHex(newR, newG, newB)
}

/**
 * Generates the Joy UI primary palette based on a seed color
 * @param {string} color - The primary hex color
 * @returns {Object} The Joy UI palette object
 */
export const generatePrimaryPalette = (color) => {
  return {
    light: {
      plainColor: color, // Main color for text
      plainHoverBg: lighten(color, 90), // Very light background
      plainActiveBg: lighten(color, 80),
      solidBg: color, // Main button background
      solidHoverBg: darken(color, 10),
      solidActiveBg: darken(color, 20),
      solidColor: '#fff', // Text color on solid button (assume light on dark)
      softBg: lighten(color, 85),
      softHoverBg: lighten(color, 75),
      softActiveBg: lighten(color, 65),
      softColor: darken(color, 20),
      outlinedBorder: lighten(color, 40),
      outlinedHoverBg: lighten(color, 90)
    },
    dark: {
      plainColor: lighten(color, 40), // Lighter text for dark mode
      plainHoverBg: darken(color, 60), // Dark background
      plainActiveBg: darken(color, 50),
      solidBg: color,
      solidHoverBg: lighten(color, 10),
      solidActiveBg: lighten(color, 20),
      solidColor: '#fff',
      softBg: darken(color, 60),
      softHoverBg: darken(color, 50),
      softActiveBg: darken(color, 40),
      softColor: lighten(color, 40),
      outlinedBorder: darken(color, 40),
      outlinedHoverBg: darken(color, 60)
    }
  }
}
