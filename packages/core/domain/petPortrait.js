/**
 * What the companion actually looks like (MOB-089).
 *
 * The web has drawn a PORTRAIT since the pet shipped — a generated image for
 * anyone who has made one, and six bundled illustrations of Nowry for everyone
 * else, so a free account gets real art rather than a shape. The phone drew a
 * coloured circle instead. That was not a simplification of the web, it was a
 * different companion: the thing the learner recognises is the owl, and the
 * phone was showing them a disc.
 *
 * The DECISION is shared and the ART is not, which is ADR-031's rule applied to
 * pictures. A bundled asset is resolved by the bundler — webpack under CRA,
 * Metro on the phone — and neither can read the other's. So this returns which
 * portrait to draw and each client supplies the file.
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
  // art is not shown somebody else's owl.
  if (isDefaultCompanion) return { kind: 'default', stage }
  return null
}

export default petPortrait
