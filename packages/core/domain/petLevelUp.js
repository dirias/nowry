/**
 * Did that grant level the companion up? (PEND-001)
 *
 * The XP endpoints all answer in the same four fields, and the reply is the
 * ONLY place a level-up is ever announced: the server does not push, and the
 * pet's state endpoint reports where you are, never that you just arrived.
 * Throw the reply away and the moment is gone — which is what the phone was
 * doing, so a level earned on it was silent and the orb on Home simply looked
 * different the next time you glanced at it.
 *
 * The names are the server's and they are named once, here. A client reading
 * `levelUp` for itself gets `undefined`, `undefined` is falsy, and nothing
 * renders — the same silence, with no bug to see.
 *
 * **Two grants land at the end of one session** — the cards and the streak —
 * and either can cross the line. `bestLevelUp` takes the furthest one, because
 * two celebrations for one session is a bug and the lower of the two is the
 * one that is already out of date.
 */

/** The level-up in one XP reply, or `null` if it did not cross. */
export function levelUpFrom(response) {
  if (!response?.level_up) return null
  const level = Number(response.new_level)
  const stage = Number(response.new_stage)
  if (!(level > 0) || !(stage > 0)) return null
  return { level, stage }
}

/** The furthest level-up among several replies, or `null`. */
export function bestLevelUp(responses = []) {
  return responses
    .map(levelUpFrom)
    .filter(Boolean)
    .reduce((best, next) => (best === null || next.level > best.level ? next : best), null)
}

export default levelUpFrom
