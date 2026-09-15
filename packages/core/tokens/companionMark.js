/**
 * The default companion, as geometry (BRAND-007, ADR-034).
 *
 * Nowry — the companion every learner starts with — is the Spiral grown by
 * stages: the same coil as the mark, with a turn added at each rung. That is
 * the rule the stage table already followed for its rings and motes: stages
 * are told apart by structure, never by size alone, because nobody sees two
 * stages side by side. Stage one is an egg with the first curl inside it.
 *
 * Mood is where the head points and how the eye is drawn. A happy coil looks
 * up with a closed, smiling eye; a tired one lowers its head and the eye is a
 * line; a thinking one glances upward; a speaking one opens a mouth. Nothing
 * here is a slit pupil, a fang or a tongue (BRAND.md's guardrails), so the
 * creature stays a coil first and a snake only if you look.
 *
 * Data only — no JSX, no platform (ADR-026, ADR-031). Each client draws the
 * parts with its own SVG primitive, in one colour: the accent where the
 * companion stands on the page, the readable foreground where it sits on an
 * accent-coloured body. The face is cut out of the head with a mask, never
 * painted, so it shows the real ground beneath.
 */
import { VIEW, coil } from './brandMark'
import { stageConfig } from '../domain/petStages'

/** The coil's proportions: a touch chunkier than the mark, so it reads as a creature. */
const PROPORTIONS = Object.freeze({ tail: 0.07, head: 0.21 })

/** How much of the box the egg's curl occupies, as a margin on each side. */
const EGG_CURL_PAD = 0.24

/** The egg, slightly narrower at the top, filling the box. */
const EGG_PATH = 'M50 5 C90 5 98 95 50 95 C2 95 10 5 50 5Z'

/**
 * Each mood as a posture. `headDeg` is the direction the head travels in
 * screen degrees (negative is up); `gaze` lifts the eye toward the top of the
 * head; `mouth` opens one ahead of the eye.
 */
export const COMPANION_MOODS = Object.freeze({
  idle: { headDeg: -55, eye: 'round', gaze: 0, mouth: false },
  happy: { headDeg: -80, eye: 'arc', gaze: 0, mouth: false },
  thinking: { headDeg: -30, eye: 'round', gaze: 0.35, mouth: false },
  tired: { headDeg: 25, eye: 'line', gaze: 0, mouth: false },
  speaking: { headDeg: -55, eye: 'round', gaze: 0, mouth: true }
})

const round = (value) => Math.round(value * 100) / 100

/** The face for a head: an eye of one of three kinds, and sometimes a mouth. */
function face(head, facing, posture) {
  const r = head.r
  const cx = round(head.cx + facing.x * r * 0.18)
  const cy = round(head.cy + facing.y * r * 0.18 - posture.gaze * r * 0.3)
  const eyeR = round(r * 0.3)
  const stroke = round(eyeR * 0.55)
  const eye =
    posture.eye === 'arc'
      ? {
          kind: 'arc',
          cx,
          cy,
          r: eyeR,
          stroke,
          d: `M${round(cx - eyeR)} ${round(cy + eyeR * 0.35)} Q${cx} ${round(cy - eyeR * 0.9)} ${round(cx + eyeR)} ${round(cy + eyeR * 0.35)}`
        }
      : posture.eye === 'line'
        ? { kind: 'line', cx, cy, r: eyeR, stroke, d: `M${round(cx - eyeR)} ${cy} L${round(cx + eyeR)} ${cy}` }
        : { kind: 'round', cx, cy, r: eyeR }
  const mouth = posture.mouth
    ? { cx: round(head.cx + facing.x * r * 0.62), cy: round(head.cy + facing.y * r * 0.62), r: round(r * 0.2) }
    : null
  return { eye, mouth }
}

/**
 * The companion's parts in a 100 × 100 view box.
 *
 * @param {object} [options]
 * @param {number} [options.stage=1] - evolution stage 1–6; the turn count comes from the stage table
 * @param {string} [options.mood='idle'] - idle | happy | thinking | tired | speaking
 * @param {number} [options.pad=0.04] - empty margin, as a fraction of the box
 * @returns {{
 *   viewBox: string, body: string, head: object, tail: object,
 *   eye: object, mouth: object|null, egg: string|null, turns: number
 * }}
 */
export function companionMark({ stage = 1, mood = 'idle', pad = 0.04 } = {}) {
  const config = stageConfig(stage)
  const posture = COMPANION_MOODS[mood] ?? COMPANION_MOODS.idle
  const inEgg = config.form === 'egg'
  const { body, head, tail, facing } = coil({
    ...PROPORTIONS,
    turns: config.turns,
    headDeg: posture.headDeg,
    pad: inEgg ? EGG_CURL_PAD : pad
  })
  const { eye, mouth } = face(head, facing, posture)

  return {
    viewBox: `0 0 ${VIEW} ${VIEW}`,
    body,
    head,
    tail,
    eye,
    mouth,
    egg: inEgg ? EGG_PATH : null,
    turns: config.turns
  }
}

export default companionMark
