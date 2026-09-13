/**
 * OKLCH, the colour space the palette is built in (ADR-034).
 *
 * HSL was the trap the previous generator fell into: its lightness is not what
 * the eye sees, so a yellow at 50% is far brighter than a blue at 50% and a set
 * of presets built on one HSL lightness passed contrast unevenly by hue. OKLCH's
 * L is perceptual. Hold L fixed, move the hue, and contrast stays put — which is
 * the whole guarantee the eight presets rest on.
 *
 * Plain maths, no dependencies, no platform: both clients call it at module
 * load to turn the ladder's constants into hex.
 */

/**
 * Accepts `#abc`, `#aabbcc` (with or without `#`). Returns null when unparseable.
 */
export function hexToRgb(hex) {
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

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const toGamma = (value) => (value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055)

/** OKLCH → linear sRGB, unclamped. */
function oklchToLinear(L, C, h) {
  const radians = (h * Math.PI) / 180
  const a = C * Math.cos(radians)
  const b = C * Math.sin(radians)

  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

const GAMUT_EPSILON = 0.0005
const inGamut = (rgb) => rgb.every((channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON)

/**
 * OKLCH → `#rrggbb`. A colour outside sRGB keeps its lightness and hue and
 * loses chroma until it fits — the perceptual promise is L, so L is what is
 * protected.
 */
export function oklchToHex(L, C, h) {
  let rgb = oklchToLinear(L, C, h)

  if (!inGamut(rgb)) {
    let low = 0
    let high = C
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2
      if (inGamut(oklchToLinear(L, mid, h))) low = mid
      else high = mid
    }
    rgb = oklchToLinear(L, low, h)
  }

  const hex = rgb.map((channel) =>
    Math.round(Math.min(Math.max(toGamma(Math.min(Math.max(channel, 0), 1)), 0), 1) * 255)
      .toString(16)
      .padStart(2, '0')
  )
  return `#${hex.join('')}`
}

/** `#rrggbb` → `{ L, C, h }`. Unparseable input is black. */
export function hexToOklch(hex) {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(toLinear)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const C = Math.sqrt(a * a + bb * bb)
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { L, C, h }
}

/** Euclidean distance in OKLab — how different two colours look. */
export function deltaE(hexA, hexB) {
  const toLab = (hex) => {
    const { L, C, h } = hexToOklch(hex)
    const radians = (h * Math.PI) / 180
    return [L, C * Math.cos(radians), C * Math.sin(radians)]
  }
  const [a, b] = [toLab(hexA), toLab(hexB)]
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/**
 * WCAG 2.x relative luminance (0 = black, 1 = white). Unparseable input falls
 * back to black so theme generation can never throw.
 */
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21, order-independent. */
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
