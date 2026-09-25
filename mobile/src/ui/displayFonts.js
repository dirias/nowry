/**
 * The display face's asset map, for `useFonts` (DS-007B).
 *
 * Separate from `displayFace.js` only because this file `require()`s binaries
 * and that one must stay importable by the node test environment. The names
 * here must be exactly `DISPLAY_FAMILIES`; `displayFace.test.js` asserts it by
 * reading this source, since it cannot import it.
 */
export const DISPLAY_FONTS = {
  'BricolageGrotesque-SemiBold': require('../../assets/fonts/BricolageGrotesque-SemiBold.ttf'),
  'BricolageGrotesque-Bold': require('../../assets/fonts/BricolageGrotesque-Bold.ttf')
}
