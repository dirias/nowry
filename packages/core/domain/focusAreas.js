import { CATEGORY_COLORS } from '../tokens/colorSystem'

/**
 * What a focus area can look like (MOB-045).
 *
 * The eight colours were a `const COLORS` inside the web's setup wizard, which
 * made them the wizard's private property — and a focus area's colour is not
 * the wizard's, it is the colour that identifies that area on the calendar, in
 * the plan and on both clients. A phone that offered a different eight would
 * create areas the web could not have made.
 *
 * These are user data rather than theme tokens, which is the same exception the
 * calendar's event tiles make: a palette the user picks from cannot come from a
 * palette that recolours with their accent.
 */
/*
 * Since ADR-034 they are the category family's light dots — the same family
 * sticky notes, book covers and the calendar draw from. An area saved with an
 * older colour keeps it; only new areas take these.
 */
export const FOCUS_AREA_COLORS = CATEGORY_COLORS

/** The web's own ceiling — the "Power of 3" the setup screen is built around. */
export const MAX_FOCUS_AREAS = 3

/** The next colour for a new area: the first one nothing is using yet. */
export const nextFocusAreaColor = (areas = []) => {
  const taken = new Set(areas.map((area) => (area?.color ?? '').toUpperCase()))
  return FOCUS_AREA_COLORS.find((color) => !taken.has(color.toUpperCase())) ?? FOCUS_AREA_COLORS[0]
}
