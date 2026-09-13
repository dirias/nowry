/**
 * The companion's six stages, as data (MOB-050).
 *
 * The table drives the orb's size, aura rings and animation speed. It carries
 * no colour (ADR-034): the companion wears the learner's accent at every stage
 * (`utils/petColor`), and what a stage EARNS — its mark and its motes — is
 * drawn in gold, the one colour that means earned.
 *
 * Each stage must be told apart at a glance, at 56–80px, without a portrait.
 * Size alone cannot do that — 24px spread over six stages is invisible in
 * isolation, and nobody sees two stages side by side. So every consecutive
 * pair differs by at least one *structural* feature:
 *
 *   form   'egg' | 'round'   — the silhouette itself
 *   mark   null | 'crest' | 'halo' | 'crown'   — an earned adornment
 *   rings  0–3                — aura rings
 *   orbit  0–5                — orbiting motes
 *
 * All four are procedural, so a free-tier pet evolves visibly without ever
 * touching the Plus-gated AI portrait.
 *
 * It lived inside the web's 2,000-line pet component, which made a stage table
 * the property of one client's floating orb. Both clients draw the same
 * companion now, and a phone that disagreed about which stage wears a crown
 * would be a different pet.
 *
 * `sizePx` and `pulseDuration` are the web's numbers and the phone reads them
 * as its own: a companion that is visibly bigger at stage six is the whole
 * point of the table.
 */
export const STAGE_CONFIG = {
  1: { sizePx: 56, emoji: '✨', ringCount: 0, pulseDuration: 2.8, form: 'egg', mark: null, orbitCount: 0 },
  2: { sizePx: 60, emoji: '🌟', ringCount: 1, pulseDuration: 2.2, form: 'round', mark: null, orbitCount: 0 },
  3: { sizePx: 64, emoji: '🔮', ringCount: 1, pulseDuration: 2.2, form: 'round', mark: 'crest', orbitCount: 0 },
  4: { sizePx: 68, emoji: '🌙', ringCount: 2, pulseDuration: 2.0, form: 'round', mark: 'halo', orbitCount: 0 },
  5: { sizePx: 72, emoji: '🌌', ringCount: 3, pulseDuration: 1.8, form: 'round', mark: 'halo', orbitCount: 3 },
  6: { sizePx: 80, emoji: '☀️', ringCount: 3, pulseDuration: 1.6, form: 'round', mark: 'crown', orbitCount: 5 }
}

/** A stage outside 1–6 is stage one: an unknown pet has not evolved. */
export const stageConfig = (stage) => STAGE_CONFIG[stage] ?? STAGE_CONFIG[1]

/** The stages, in order, for anything that walks them. */
export const STAGES = Object.keys(STAGE_CONFIG).map(Number)
