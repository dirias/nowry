/**
 * nowryArt — the six shipped illustrations of Nowry, the default companion.
 *
 * Free users, and anyone who has not personalised a pet, get Nowry rather than
 * a procedural orb wearing a randomly guessed species. These are bundled
 * static assets, so the default experience costs nothing to serve, never waits
 * on an image model and cannot fail — unlike the per-user generation path,
 * which is Plus-gated, takes ~70s and can 502.
 *
 * One fixed generation seed was used across all six, so it is recognisably the
 * same owl maturing rather than six unrelated birds. The interests Nowry is
 * defined by (AI/ML, technology, science, music, health) are spread across the
 * arc so the companion visibly *earns* its accessories: bare owlet, then
 * goggles, then headphones and circuit-patterned plumage, then notes and
 * leaves, then a crown.
 */
import stage1 from '../../assets/nowry/nowry-stage-1.png'
import stage2 from '../../assets/nowry/nowry-stage-2.png'
import stage3 from '../../assets/nowry/nowry-stage-3.png'
import stage4 from '../../assets/nowry/nowry-stage-4.png'
import stage5 from '../../assets/nowry/nowry-stage-5.png'
import stage6 from '../../assets/nowry/nowry-stage-6.png'

const NOWRY_STAGE_ART = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6 }

/** The name shown when the user has not renamed their companion. */
export const DEFAULT_PET_NAME = 'Nowry'

/**
 * Art for one of Nowry's forms.
 * @param {number} stage - Evolution stage (1–6). Out-of-range falls back to stage 1.
 * @returns {string} A bundled image URL.
 */
export const nowryArtFor = (stage) => NOWRY_STAGE_ART[stage] ?? NOWRY_STAGE_ART[1]

/**
 * CSS filter that turns a form into a flat locked silhouette.
 *
 * A silhouette, not greyscale: greyscale on illustrated art reads as
 * "disabled/broken", while a solid fill reads as "locked but real" — and it
 * keeps the outline, so Oracle's floating notes and Luminary's crown still
 * distinguish those rungs at a glance. That distinction is the entire point of
 * showing a form you have not earned yet.
 */
export const LOCKED_SILHOUETTE_FILTER = 'brightness(0) invert(0.26)'

export default NOWRY_STAGE_ART
