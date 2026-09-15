/**
 * What the companion actually looks like (MOB-089).
 *
 * The web has drawn a PORTRAIT since the pet shipped — a generated image for
 * anyone who has made one, and Nowry for everyone else, so a free account gets
 * real art rather than a shape. The phone drew a coloured circle instead. That
 * was not a simplification of the web, it was a different companion: the thing
 * the learner recognises is the creature, and the phone was showing them a disc.
 *
 * The DECISION is shared and the DRAWING is not, which is ADR-031's rule
 * applied to pictures. Nowry is the Spiral from `tokens/companionMark`
 * (BRAND-007), and each client draws those parts with its own SVG primitive.
 * So this returns which portrait to draw and each client renders it.
 */

/**
 * Which portrait a companion wears.
 *
 * @param {{avatarUrl?: string|null, isDefaultCompanion?: boolean, stage?: number}} pet
 * @returns {{kind: 'generated', url: string} | {kind: 'default', stage: number} | null}
 *   `null` means there is no portrait at all — a companion the account has
 *   personalised but never generated art for. The caller draws its own shape.
 */
export function petPortrait({ avatarUrl = null, isDefaultCompanion = true, stage = 1 } = {}) {
  if (avatarUrl) return { kind: 'generated', url: avatarUrl }
  // Nowry stands in wherever no portrait has been generated, and only for the
  // default companion: a user who chose their own species and has not generated
  // art is not shown somebody else's creature.
  if (isDefaultCompanion) return { kind: 'default', stage }
  return null
}

export default petPortrait
