/**
 * The staged evolution, as data (ADR-075, EVO-011).
 *
 * Both clients play the same sequence, so what it is lives here and how it is
 * drawn lives in each client: which variant an event gets, how long each beat
 * lasts, the spiral's line, and the day a month's portrait generations come
 * back. No React, no platform.
 *
 * The variant is chosen by WHAT HAPPENED, never by plan: a free account that
 * evolves sees what a Pro account sees. The plan only decides whether there is
 * a generation count to state, and that is the server's number.
 */
import { MOTION } from '../tokens/tokens'

/** What can set the sequence off. */
export const EVOLUTION_KIND = Object.freeze({
  /** The stage changed because a level was reached. */
  stage: 'stage',
  /** A new portrait was generated and the server confirmed it. */
  generated: 'generated',
  /** A portrait already made was put on. */
  worn: 'worn',
  /** A generation was asked for and none is left this month. */
  exhausted: 'exhausted'
})

const VARIANT_BY_KIND = Object.freeze({ stage: 'full', generated: 'full', worn: 'short', exhausted: 'none' })

/** `full`, `short` or `none`. Anything unknown plays nothing. */
export const evolutionVariant = (kind) => VARIANT_BY_KIND[kind] ?? 'none'

/** Only a generation has a count worth stating once it has played. */
export const showsGenerationsLeft = (kind, generationsRemaining) =>
  kind === EVOLUTION_KIND.generated && Number.isInteger(generationsRemaining)

/*
 * The beats. Every length is a whole number of the motion scale's steps
 * (MOTION.md §2), so the one sequence the standard lets run long is still made
 * of its tokens:
 *
 *   full   anticipation  the spiral draws itself around the old form
 *          transformation it turns, tightens, and motes travel inward
 *          flash          the earned gold, under which the form is swapped
 *          reveal         the spiral unwinds as the new form arrives
 *   short  sweep          one turn of the spiral across the old portrait
 *          reveal         the new one is there
 */
const SLOW = MOTION.duration.slow
const BEATS = Object.freeze({
  full: Object.freeze([
    Object.freeze({ beat: 'anticipation', ms: 3 * SLOW }),
    Object.freeze({ beat: 'transformation', ms: 4 * SLOW }),
    Object.freeze({ beat: 'flash', ms: MOTION.duration.base }),
    Object.freeze({ beat: 'reveal', ms: 3 * SLOW })
  ]),
  short: Object.freeze([Object.freeze({ beat: 'sweep', ms: 2 * SLOW }), Object.freeze({ beat: 'reveal', ms: 2 * SLOW })]),
  none: Object.freeze([])
})

/** The state every variant ends in, and the one a skip jumps to. */
export const EVOLUTION_DONE = 'done'

export const evolutionBeats = (variant) => BEATS[variant] ?? BEATS.none

/** The beat a variant opens on; `done` when it has none. */
export const firstBeat = (variant) => evolutionBeats(variant)[0]?.beat ?? EVOLUTION_DONE

/** How long a beat holds before the next, in milliseconds; 0 for `done` or a stranger. */
export const beatDuration = (variant, beat) => evolutionBeats(variant).find((step) => step.beat === beat)?.ms ?? 0

/** The beat after this one; `done` after the last, and for anything unknown. */
export const nextBeat = (variant, beat) => {
  const beats = evolutionBeats(variant)
  const index = beats.findIndex((step) => step.beat === beat)
  return index === -1 || index === beats.length - 1 ? EVOLUTION_DONE : beats[index + 1].beat
}

/** The whole sequence, in milliseconds. */
export const evolutionDuration = (variant) => evolutionBeats(variant).reduce((total, step) => total + step.ms, 0)

/** Whether the new form is the one on show at this beat. */
export const showsNewForm = (beat) => beat === 'reveal' || beat === EVOLUTION_DONE

/**
 * The share of the reveal beat over which the gold goes: one base step, as the
 * web's flash exits, so the gold is a flash and not a glow that lingers while
 * the new form arrives. The short variant has no gold.
 */
export const flashFadeShare = (variant) => (variant === 'full' ? MOTION.duration.base / beatDuration(variant, 'reveal') : 0)

/**
 * What each layer in the reveal's frame is doing at a beat (EVO-016): the old
 * form (`from`), the gold (`flash`) and the new form (`to`), each one of
 * `held`, `fading`, `arriving`, `shown` or `gone`.
 *
 * The swap happens under the gold: the flash lights over the old form as it
 * fades, and the new form arrives as the gold fades, so the frame is never
 * empty. Both clients draw from this, so neither can wait out an exit and
 * drop the flash again. The short variant has no gold.
 */
export const evolutionLayer = (variant, beat, layer) => {
  const gold = variant === 'full'
  if (layer === 'from') {
    if (beat === 'flash') return 'fading'
    return showsNewForm(beat) ? 'gone' : 'held'
  }
  if (layer === 'flash') {
    if (!gold) return 'gone'
    if (beat === 'flash') return 'arriving'
    return beat === 'reveal' ? 'fading' : 'gone'
  }
  if (beat === 'reveal') return 'arriving'
  return beat === EVOLUTION_DONE ? 'shown' : 'gone'
}

// ── The spiral ──────────────────────────────────────────────────────────────
/** How many motes ride the spiral inward. At most eight, by the standard. */
export const MOTE_COUNT = 6

/**
 * A point on the spiral: `t` runs 0 (the outer end) to 1 (the centre), in a
 * square of side `size`. Archimedean, like the mark: the gap between turns is
 * even, which is what makes it read as the Nowry coil and not a whirlpool.
 */
export const spiralPoint = (t, { size = 200, turns = 2.25, inner = 0.3, outer = 0.48 } = {}) => {
  const clamped = Math.min(1, Math.max(0, t))
  const radius = size * (outer - (outer - inner) * clamped)
  const angle = clamped * turns * 2 * Math.PI - Math.PI / 2
  return { x: size / 2 + radius * Math.cos(angle), y: size / 2 + radius * Math.sin(angle) }
}

/** The spiral as an SVG path, outer end first, so a stroke draws inward. */
export const spiralPath = (options = {}, steps = 96) => {
  const number = (n) => Math.round(n * 100) / 100
  return Array.from({ length: steps + 1 }, (_, index) => {
    const { x, y } = spiralPoint(index / steps, options)
    return `${index === 0 ? 'M' : 'L'}${number(x)} ${number(y)}`
  }).join(' ')
}

/** The spiral's length, for a client that draws it by offsetting a dash. */
export const spiralLength = (options = {}, steps = 96) => {
  let length = 0
  let previous = spiralPoint(0, options)
  for (let index = 1; index <= steps; index += 1) {
    const point = spiralPoint(index / steps, options)
    length += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return length
}

/** A mote's way inward: `steps + 1` points from where it joins the spiral to the centre end. */
export const motePath = (index, options = {}, steps = 8) => {
  const start = index / MOTE_COUNT
  return Array.from({ length: steps + 1 }, (_, step) => spiralPoint(start + ((1 - start) * step) / steps, options))
}

// ── When the month's generations come back ─────────────────────────────────
/**
 * The instant the count resets: the first of next month at 00:00 UTC, which is
 * how the server keys it (`%Y-%m` in UTC). An instant, not a calendar day —
 * west of Greenwich it falls on the evening of the month's last day.
 */
export const generationResetAt = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

/**
 * That instant as the learner's own clock shows it: the day, the month and
 * the hour, in their locale and time zone. `timeZone` is for tests; left out,
 * it is the device's.
 */
export const formatGenerationReset = (resetAt, locale, timeZone) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {})
  }).format(resetAt)
