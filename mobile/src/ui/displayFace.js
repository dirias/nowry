/**
 * The display face on the phone (DS-007B).
 *
 * The web points one token at Bricolage Grotesque and Joy resolves h1–h4 and
 * both display-* levels against it. React Native has no such resolution step,
 * so the same boundary is stated here, once, and `Typography` is its only
 * reader.
 *
 * WHY TWO FILES AND NOT EIGHT
 *
 * Only the heading levels take the display face, and between them they use two
 * weights — 700 for display-lg, display-md, h1 and h2; 600 for h3 and h4. Body
 * text stays on the platform face, which is a decision rather than an omission:
 * San Francisco and Roboto cost no bundle bytes, are what the platform tunes
 * for, and already honour the OS text-size setting this component works so hard
 * to respect. The brand lives in the headings and the wordmark.
 *
 * WHY THEY ARE DERIVED, NOT DOWNLOADED
 *
 * `@fontsource-variable/bricolage-grotesque` ships woff2 only and React Native
 * needs ttf, so the two statics are instanced from the SAME woff2 the web
 * serves (`public/fonts/`, see BRAND.md). Downloading a second copy from
 * elsewhere would let the two clients drift onto different outlines of a face
 * that is supposed to be one.
 */

/**
 * The family names React Native resolves, and the keys `useFonts` registers
 * them under. The `require()` of the .ttf files themselves lives in
 * `displayFonts.js` beside the loader: this module stays plain JavaScript so
 * the node test environment can import it, which is the same seam
 * `jest.config.js` describes for the rest of the design system.
 */
export const DISPLAY_FAMILIES = Object.freeze(['BricolageGrotesque-SemiBold', 'BricolageGrotesque-Bold'])

/** The levels that wear it — the same set Joy resolves against the token. */
const DISPLAY_LEVELS = new Set(['display-lg', 'display-md', 'h1', 'h2', 'h3', 'h4'])

/** The weights that shipped. A static file per weight is how RN wants them. */
const SHIPPED = [
  { weight: 700, family: 'BricolageGrotesque-Bold' },
  { weight: 600, family: 'BricolageGrotesque-SemiBold' }
]

/**
 * The display family for a level at an effective weight, or `null` for the
 * platform face.
 *
 * Returns `null` below 600 on purpose. Only two weights ship, so a heading
 * asking for 400 or 500 would otherwise be drawn 100–200 too heavy — quietly
 * wrong in a way nobody would trace back to here. The platform face at the
 * weight that was actually asked for is the better answer.
 *
 * @param {string} level
 * @param {number} weight - the level's own weight, or the caller's override
 * @returns {string|null}
 */
export function displayFamily(level, weight) {
  if (!DISPLAY_LEVELS.has(level)) return null
  const match = SHIPPED.find((f) => weight >= f.weight)
  return match ? match.family : null
}
