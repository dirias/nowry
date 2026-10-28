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
 *   turns  0.5–2.5            — how far the default companion's coil has grown
 *   artFill 0.66–0.94         — how much of its frame the default companion's art fills (ADR-051)
 *
 * All five are procedural, so a free-tier pet evolves visibly without ever
 * touching the Plus-gated AI portrait. `turns` is the Spiral companion's own
 * rung (BRAND-007): each stage adds to the coil, the way the mark's gaps widen
 * — an egg with the first curl inside, then three quarters of a turn, one,
 * one and a half, two, two and a half.
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
  1: { sizePx: 56, emoji: '✨', ringCount: 0, pulseDuration: 2.8, form: 'egg', mark: null, orbitCount: 0, turns: 0.5, artFill: 0.66 },
  2: { sizePx: 60, emoji: '🌟', ringCount: 1, pulseDuration: 2.2, form: 'round', mark: null, orbitCount: 0, turns: 0.75, artFill: 0.72 },
  3: { sizePx: 64, emoji: '🔮', ringCount: 1, pulseDuration: 2.2, form: 'round', mark: 'crest', orbitCount: 0, turns: 1, artFill: 0.79 },
  4: { sizePx: 68, emoji: '🌙', ringCount: 2, pulseDuration: 2.0, form: 'round', mark: 'halo', orbitCount: 0, turns: 1.5, artFill: 0.84 },
  5: { sizePx: 72, emoji: '🌌', ringCount: 3, pulseDuration: 1.8, form: 'round', mark: 'halo', orbitCount: 3, turns: 2, artFill: 0.88 },
  6: { sizePx: 80, emoji: '☀️', ringCount: 3, pulseDuration: 1.6, form: 'round', mark: 'crown', orbitCount: 5, turns: 2.5, artFill: 0.94 }
}

/*
 * `artFill` is the web's B2 line (ADR-051): each form's art is cropped to a
 * square, so without it the egg would fill the orb exactly as the crowned form
 * does. The shares come from the line sized by stage (each form taller and
 * heavier than the last), square-rooted so the egg is still legible at 56px:
 * with the orb's own growth the form goes from 37px to 75px.
 */
/** A stage outside 1–6 is stage one: an unknown pet has not evolved. */
export const stageConfig = (stage) => STAGE_CONFIG[stage] ?? STAGE_CONFIG[1]

/** The stages, in order, for anything that walks them. */
export const STAGES = Object.keys(STAGE_CONFIG).map(Number)
