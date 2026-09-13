/**
 * How the companion moves (MOB-090).
 *
 * Two tables the web has had since the pet shipped and the phone had neither,
 * which is why the phone's companion sat perfectly still. MOB-050 wrote that
 * choice down — "nothing here animates", an always-running idle animation being
 * battery spent on decoration — and the reasoning was wrong about what the
 * motion is FOR. The drift is not decoration: its distance and its speed are
 * how the mood is read, and the mood is the one thing about a companion that
 * changes minute to minute. A still pet does not look calm, it looks broken.
 *
 * **Mood sets the amplitude, species sets the gait.** They compose: a tired owl
 * flaps at the same rate as a happy one and drifts a third as far. Both tables
 * are DATA rather than animations, so each client drives them with its own
 * engine — framer-motion on the web, `Animated` on the phone — and neither
 * invents a number the other does not have.
 *
 * **The keyframes are readable by both.** Each `animate` entry is a property
 * mapped to its keyframes over one cycle, evenly spaced, starting and ending in
 * the same place except for the spinners, which are continuous. That is what
 * framer-motion takes directly and what an interpolation over a 0-to-1 loop
 * takes generically, so there is one shape rather than a translation table.
 */

/**
 * What a mood does to the drift, the glow and the colour.
 *
 * `driftY` is how far the companion rises, in points. `speedScale` multiplies
 * the stage's own pulse duration, so a tired companion is slower rather than
 * differently animated. `saturate` and `brightness` are the web's filters; a
 * phone has no equivalent and reads only the first three.
 */
export const MOOD_PRESENTATION = {
  idle: { saturate: 1.0, brightness: 1.0, speedScale: 1.0, driftY: 6, glow: 1.0 },
  happy: { saturate: 1.18, brightness: 1.08, speedScale: 0.72, driftY: 9, glow: 1.25 },
  thinking: { saturate: 0.95, brightness: 1.0, speedScale: 1.15, driftY: 4, glow: 0.9 },
  tired: { saturate: 0.42, brightness: 0.82, speedScale: 1.9, driftY: 2, glow: 0.55 },
  speaking: { saturate: 1.08, brightness: 1.04, speedScale: 0.85, driftY: 7, glow: 1.1 }
}

/**
 * The gait, by species. Winged fliers spread and contract, walkers bounce and
 * rock, spinners turn, swayers rock from the root.
 */
export const SPECIES_MOTION = {
  // ── Winged fliers: scaleX pulse = wing spread/contract ──────────────────
  owl: {
    animate: { scaleX: [1, 1.12, 1], scaleY: [1, 0.94, 1] },
    transition: { repeat: Infinity, duration: 0.85, ease: 'easeInOut' }
  },
  dragon: {
    animate: { scaleX: [1, 1.16, 1], scaleY: [1, 0.92, 1] },
    transition: { repeat: Infinity, duration: 1.3, ease: 'easeInOut' }
  },
  phoenix: {
    animate: { scaleX: [1, 1.13, 1], scaleY: [1, 0.94, 1] },
    transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' }
  },
  // ── Walkers: y-bounce + rotate rock = walking gait ──────────────────────
  cat: {
    animate: { y: [0, -3, 0], rotate: [0, 2, 0, -2, 0] },
    transition: { repeat: Infinity, duration: 0.7, ease: 'easeInOut' }
  },
  fox: {
    animate: { y: [0, -3, 0], rotate: [0, 2.5, 0, -2.5, 0] },
    transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
  },
  robot: {
    animate: { y: [0, -2, 0], rotate: [0, 1, 0, -1, 0] },
    transition: { repeat: Infinity, duration: 0.5, ease: 'linear' }
  },
  // ── Spinners ─────────────────────────────────────────────────────────────
  crystal: {
    animate: { rotate: [0, 360] },
    transition: { repeat: Infinity, duration: 5, ease: 'linear' }
  },
  star: {
    animate: { rotate: [0, 360], scale: [1, 1.07, 1] },
    transition: { repeat: Infinity, duration: 3.5, ease: 'linear' }
  },
  // ── Swayers ──────────────────────────────────────────────────────────────
  leaf: {
    animate: { rotate: [-7, 7, -7] },
    transition: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }
  },
  music: {
    animate: { y: [0, -5, 0], rotate: [-3, 3, -3] },
    transition: { repeat: Infinity, duration: 0.6, ease: 'easeInOut' }
  }
}

/** The presentation for a mood, including one the server has never sent. */
export const moodPresentation = (mood) => MOOD_PRESENTATION[mood] ?? MOOD_PRESENTATION.idle

/**
 * Which species a companion moves as.
 *
 * Nowry — the shipped default — is an owl: it is the owl both clients draw, in
 * all six of its bundled forms. An account that has never chosen a species has
 * no `pet_species`, and reading that field alone gave the default companion no
 * gait at all, so the owl every learner starts with was the one pet that did
 * not move like anything.
 */
export const companionSpecies = ({ species = null, isDefaultCompanion = true } = {}) => species || (isDefaultCompanion ? 'owl' : null)

/** The gait for a species, or nothing for one with no table entry. */
export const speciesMotion = (species) => SPECIES_MOTION[species] ?? null

/**
 * Scale a two-digit hex alpha by a multiplier, clamped to a valid byte.
 * The orb's glows are built by appending hex alpha to a 6-digit colour, so a
 * mood's glow strength has to be expressed in the same form.
 */
export const alphaHex = (base, multiplier) =>
  Math.max(0, Math.min(255, Math.round(base * multiplier)))
    .toString(16)
    .padStart(2, '0')

export default SPECIES_MOTION
