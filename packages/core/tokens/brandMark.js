/**
 * The Spiral, as geometry (ADR-034).
 *
 * A logarithmic coil: every turn returns further out, the way a card comes back
 * less often, a focus round follows the last, and a year returns to January one
 * ring wider. The body tapers from a thin tail at the centre to a round head at
 * the outer end, and the head carries one eye.
 *
 * Data only — no JSX, no platform (ADR-026, ADR-031). Each client draws it with
 * its own SVG primitive: a filled `body` path, a `head` and a `tail` circle in
 * the mark's colour, and an `eye` circle cut out of the head. Everything is in
 * a 100 × 100 view box so a client only chooses the size.
 *
 * The default companion is the same coil grown by stages (`companionMark.js`),
 * so `coil()` is exported for it: one geometry, two proportions.
 */

export const VIEW = 100

/** How much wider each turn is than the one inside it. */
const GROWTH_PER_TURN = 1.85

/** The shipped proportions. Small sizes drop a turn so the gaps stay open. */
export const SPIRAL_PRESETS = Object.freeze({
  full: { turns: 2.4, tail: 0.05, head: 0.19 },
  compact: { turns: 1.8, tail: 0.09, head: 0.28 }
})

const round = (value) => Math.round(value * 100) / 100

/** Points along the coil's centre line, rotated so the head travels at `headDeg`. */
function centreLine({ turns, tail, head, headDeg, samples }) {
  const b = Math.log(GROWTH_PER_TURN) / (2 * Math.PI)
  const total = 2 * Math.PI * turns
  const points = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const theta = t * total
    const r = Math.exp(b * (theta - total))
    points.push({ x: r * Math.cos(theta), y: -r * Math.sin(theta), w: tail + (head - tail) * Math.pow(t, 0.85) })
  }
  const [a, z] = [points[samples - 1], points[samples]]
  const rotation = (headDeg * Math.PI) / 180 - Math.atan2(z.y - a.y, z.x - a.x)
  const [cos, sin] = [Math.cos(rotation), Math.sin(rotation)]
  return points.map((p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, w: p.w }))
}

/** The two edges of the tapered body, offset either side of the centre line. */
function edges(points) {
  const left = []
  const right = []
  points.forEach((p, i) => {
    const prev = points[Math.max(i - 1, 0)]
    const next = points[Math.min(i + 1, points.length - 1)]
    const length = Math.hypot(next.x - prev.x, next.y - prev.y) || 1
    const nx = -(next.y - prev.y) / length
    const ny = (next.x - prev.x) / length
    left.push({ x: p.x + (nx * p.w) / 2, y: p.y + (ny * p.w) / 2 })
    right.push({ x: p.x - (nx * p.w) / 2, y: p.y - (ny * p.w) / 2 })
  })
  return { left, right }
}

/** A transform that fits the whole drawing into the view box with `pad`. */
function fitter(points, headRadius, pad) {
  const last = points[points.length - 1]
  const xs = points.flatMap((p) => [p.x - p.w, p.x + p.w]).concat([last.x - headRadius, last.x + headRadius])
  const ys = points.flatMap((p) => [p.y - p.w, p.y + p.w]).concat([last.y - headRadius, last.y + headRadius])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const scale = (VIEW * (1 - 2 * pad)) / Math.max(maxX - minX, maxY - minY)
  const ox = VIEW / 2 - ((minX + maxX) / 2) * scale
  const oy = VIEW / 2 - ((minY + maxY) / 2) * scale
  return { scale, at: (p) => ({ x: round(p.x * scale + ox), y: round(p.y * scale + oy) }) }
}

/**
 * A coil's drawn parts in the 100 × 100 view box — the mark and the companion
 * are both this, with different proportions and a different number of turns.
 *
 * @param {{turns: number, tail: number, head: number, headDeg: number, pad: number}} spec
 * @returns {{ body: string, head: object, tail: object, facing: {x: number, y: number} }}
 *   `facing` is the unit direction the head travels in, for placing a face.
 */
export function coil({ turns, tail, head, headDeg, pad }) {
  const points = centreLine({ turns, tail, head, headDeg, samples: 160 })
  const headRadius = (head / 2) * 2.7
  const { scale, at } = fitter(points, headRadius, pad)
  const { left, right } = edges(points)
  const last = points[points.length - 1]

  const body = `M${[...left, ...right.reverse()].map((p) => `${at(p).x} ${at(p).y}`).join(' L')}Z`
  const headCentre = at(last)
  const before = points[points.length - 6]
  const travel = Math.hypot(last.x - before.x, last.y - before.y) || 1

  return {
    body,
    head: { cx: headCentre.x, cy: headCentre.y, r: round(headRadius * scale) },
    tail: { cx: at(points[0]).x, cy: at(points[0]).y, r: round((tail / 2) * scale) },
    facing: { x: (last.x - before.x) / travel, y: (last.y - before.y) / travel }
  }
}

/**
 * The Spiral's parts in a 100 × 100 view box.
 *
 * @param {object} [options]
 * @param {'full'|'compact'} [options.preset='full'] - `compact` for 32px and below
 * @param {number} [options.headDeg=-55] - direction the head travels, in degrees (screen space)
 * @param {number} [options.pad=0.04] - empty margin, as a fraction of the box
 * @returns {{ viewBox: string, body: string, head: object, tail: object, eye: object }}
 */
export function spiralMark({ preset = 'full', headDeg = -55, pad = 0.04 } = {}) {
  const spec = SPIRAL_PRESETS[preset] ?? SPIRAL_PRESETS.full
  const { body, head, tail, facing } = coil({ ...spec, headDeg, pad })
  const r = head.r

  return {
    viewBox: `0 0 ${VIEW} ${VIEW}`,
    body,
    head,
    tail,
    eye: { cx: round(head.cx + facing.x * r * 0.18), cy: round(head.cy + facing.y * r * 0.18), r: round(r * 0.3) }
  }
}

/**
 * The display lockup's fit: what it takes for the coil to sit as the `o` of
 * `nowry` (BRAND-009, ADR-034's 2026-09-25 amendment).
 *
 * Every value is a fraction of the font size, so one set of numbers serves both
 * clients at any size. They are measured, not guessed — five fits were rendered
 * at 72, 40, 22 and 16 px and read:
 *
 * - `em` 0.72 with `pad` 0. A round glyph fitted inside a square box always
 *   reads small; the canvas's 0.604 em box plus the geometry's own 0.02 padding
 *   left the coil looking like a dot between the `n` and the `w`.
 * - `side` −0.01. An `o` is fitted tighter than an `n` because its silhouette
 *   curves away at the corners; the square SVG box does not, so it needs pulling in.
 * - `headDeg` −100, where the mark itself uses −55. At −55 the head hangs down
 *   and right, into the `w`. At −100 the coil's opening sits where an `o` closes.
 *
 * `MIN_PX` is the floor, and it is the whole reason there are two lockups: below
 * it the turns merge and the coil reads as a bullet. At the app bar's 22 px the
 * word still reads and the mark does not — see BRAND.md.
 *
 * **Re-measured for DS-007B and unchanged.** The fit was tuned to Inter, and the
 * display face is now Bricolage Grotesque. Measured off both self-hosted files
 * at weight 700, per 100 px em: the `o`'s ink height 56.34 → 55.27, its advance
 * 61.33 → 60.93, its ink width 53.39 → 53.57, the `n`'s advance 62.25 → 63.12.
 * Under 2% on every axis, which on a 0.72 em box is 0.014 em — less than the
 * rounding in `wordmarkCoil` already introduces. Re-measure again only if the
 * display face changes to something further from Inter's proportions.
 */
export const WORDMARK_FIT = Object.freeze({
  em: 0.72,
  side: -0.01,
  drop: 0.105,
  headDeg: -100,
  pad: 0,
  MIN_PX: 40
})

/**
 * The coil as the letter `o`, at a given font size.
 *
 * @param {number} fontPx - the wordmark's font size in px
 * @returns {{ size: number, side: number, drop: number, mark: object }|null}
 *   `null` below `WORDMARK_FIT.MIN_PX`, which is the signal to draw the standard
 *   lockup instead. Callers must honour it rather than scaling down anyway.
 */
export function wordmarkCoil(fontPx) {
  if (typeof fontPx !== 'number' || !(fontPx >= WORDMARK_FIT.MIN_PX)) return null
  const { em, side, drop, headDeg, pad } = WORDMARK_FIT
  return {
    size: Math.round(fontPx * em),
    side: round(fontPx * side),
    drop: round(fontPx * drop),
    mark: spiralMark({ preset: 'full', headDeg, pad })
  }
}
