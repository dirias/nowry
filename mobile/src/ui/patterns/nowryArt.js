/**
 * The six shipped illustrations of Nowry, on this client (MOB-089).
 *
 * The same six files the web bundles, and deliberately a copy rather than an
 * import across the workspace: an image is resolved by the bundler, webpack
 * under CRA cannot read a file outside its own `src/`, and Metro cannot read
 * webpack's output. The DECISION about which portrait to draw is shared —
 * `petPortrait` in the core package — and only the asset is duplicated.
 *
 * One fixed generation seed was used across all six, so it is recognisably the
 * same owl maturing rather than six unrelated birds.
 */
const NOWRY_STAGE_ART = {
  1: require('../../../assets/nowry/nowry-stage-1.png'),
  2: require('../../../assets/nowry/nowry-stage-2.png'),
  3: require('../../../assets/nowry/nowry-stage-3.png'),
  4: require('../../../assets/nowry/nowry-stage-4.png'),
  5: require('../../../assets/nowry/nowry-stage-5.png'),
  6: require('../../../assets/nowry/nowry-stage-6.png')
}

/** Art for one of Nowry's forms; out of range falls back to the first. */
export const nowryArtFor = (stage) => NOWRY_STAGE_ART[stage] ?? NOWRY_STAGE_ART[1]

export default NOWRY_STAGE_ART
