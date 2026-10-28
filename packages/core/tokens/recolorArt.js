/**
 * Recolour the companion's art to the learner's accent (ADR-051, BRAND-010).
 *
 * The default companion's six forms were painted teal. The learner chose a
 * colour, and ADR-034 promises the companion wears exactly that colour — a
 * preset or a custom hex — so the art is moved onto it after it loads rather
 * than shipped once per colour.
 *
 * Only the BODY moves. A pixel is body when its hue sits in the art's body band
 * and it carries colour; the cream belly, the gold, the cheeks and the eyes sit
 * outside that band and keep their paint, so gold still means earned. The body
 * is rotated as a band, not flattened: each pixel keeps its offset from the
 * body's median, so a shaded coil stays shaded and a gradient stays a gradient.
 *
 * Pure maths on an RGBA array: no canvas, no `window` (ADR-026). Each client
 * does its own pixel I/O and hands the array here.
 */
import { hexToOklch } from './oklch'

/** Where the B2 line's body paint sits: teal through blue. */
export const BODY_HUE_BAND = Object.freeze({ from: 140, to: 290 })

/** Below this chroma a pixel is a highlight or a shadow, not body colour. */
const MIN_CHROMA = 0.02
/** Over this much chroma above the floor a body pixel moves all the way. */
const CHROMA_RAMP = 0.03
/** Degrees inside the band's edges over which a pixel blends in. */
const HUE_FEATHER = 12
/** Alpha under which a pixel is the transparent ground. */
const MIN_ALPHA = 40
/** Less body than this share of the painted pixels, and there is nothing to recolour. */
const MIN_BODY_SHARE = 0.02
/** A chroma scale past this would turn a faint tint into a neon one. */
const MAX_CHROMA_SCALE = 2.5

const LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
})

const toByte = (linear) => {
  const v = Math.min(Math.max(linear, 0), 1)
  const gamma = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return Math.round(gamma * 255)
}

function toLab(r, g, b) {
  const [lr, lg, lb] = [LINEAR[r], LINEAR[g], LINEAR[b]]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

function fromLab(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)
  return [
    toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ]
}

const hueOf = (a, b) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
const clamp01 = (v) => Math.min(Math.max(v, 0), 1)

/** How much of a pixel is body, 0 to 1: feathered at the band's edges and at low chroma. */
function bodyWeight(C, h, band) {
  if (C < MIN_CHROMA || h < band.from || h > band.to) return 0
  const edge = Math.min(h - band.from, band.to - h)
  return clamp01((C - MIN_CHROMA) / CHROMA_RAMP) * clamp01(edge / HUE_FEATHER)
}

const median = (values) => {
  const sorted = Float64Array.from(values).sort()
  return sorted[sorted.length >> 1]
}

/** The body's median lightness, chroma and hue, or null when the art has almost no body. */
export function measureBody(data, band = BODY_HUE_BAND) {
  const Ls = []
  const Cs = []
  const hs = []
  let painted = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue
    painted++
    const [L, a, b] = toLab(data[i], data[i + 1], data[i + 2])
    const C = Math.hypot(a, b)
    const h = hueOf(a, b)
    if (bodyWeight(C, h, band) < 0.5) continue
    Ls.push(L)
    Cs.push(C)
    hs.push(h)
  }
  if (!painted || Ls.length / painted < MIN_BODY_SHARE) return null
  return { L: median(Ls), C: median(Cs), h: median(hs) }
}

/**
 * A recoloured copy of `data` (RGBA bytes) whose body wears `accentHex`.
 *
 * @param {Uint8ClampedArray|Uint8Array|number[]} data
 * @param {string} accentHex  '#rrggbb'
 * @param {{band?: {from: number, to: number}}} [options]
 * @returns {Uint8ClampedArray} a new array; `data` is not touched
 */
export function recolorArt(data, accentHex, { band = BODY_HUE_BAND } = {}) {
  const out = Uint8ClampedArray.from(data)
  const body = measureBody(data, band)
  if (!body) return out

  const target = hexToOklch(accentHex)
  const turn = ((target.h - body.h) * Math.PI) / 180
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  const chromaScale = Math.min(target.C / body.C, MAX_CHROMA_SCALE)
  const lift = target.L - body.L

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < MIN_ALPHA) continue
    const [L, a, b] = toLab(out[i], out[i + 1], out[i + 2])
    const w = bodyWeight(Math.hypot(a, b), hueOf(a, b), band)
    if (w === 0) continue
    // Rotate the hue and scale the chroma in one step: both act on (a, b).
    const na = (a * cos - b * sin) * chromaScale
    const nb = (a * sin + b * cos) * chromaScale
    const nL = clamp01(L + lift)
    const [r, g, bl] = fromLab(L + (nL - L) * w, a + (na - a) * w, b + (nb - b) * w)
    out[i] = r
    out[i + 1] = g
    out[i + 2] = bl
  }
  return out
}

export default recolorArt
