/**
 * Elevation, by layer name (ELEVATION.md, DS-001).
 *
 * The web gets four shadows from Joy as CSS `box-shadow` strings. React Native
 * has no such thing: iOS wants shadowColor/Offset/Radius/Opacity, Android wants
 * a single `elevation` number, and neither accepts a CSS string. So the four
 * levels are translated rather than copied.
 *
 * What is preserved is the MEANING, which is what the standard actually
 * specifies — "barely lifted", "lifted on interaction", "a layer over the page",
 * "a floating object" — and the fact that a component names a level instead of
 * writing a shadow. Joy's own geometry is the reference for the translation:
 *
 *   xs  0px 1px 2px            @ 0.08
 *   sm  + 0px 2px 4px          @ 0.08
 *   md  0px 2px 8px, 6px 12px  @ 0.08
 *   lg  0px 2px 8px, 12px 16px @ 0.08
 *
 * Android's `elevation` is a single number, so it approximates the pair.
 */
const level = (offsetY, radius, opacity, androidElevation) => ({
  shadowColor: '#151515', // Joy's shadowChannel, 21 21 21
  shadowOffset: { width: 0, height: offsetY },
  shadowRadius: radius,
  shadowOpacity: opacity,
  elevation: androidElevation
})

export const ELEVATION = {
  /** Flat on the page. The default, and the one to reach for first. */
  none: { shadowOpacity: 0, elevation: 0 },
  /** Barely lifted: a row being dragged, a secondary surface in a form footer. */
  xs: level(1, 2, 0.08, 1),
  /** Lifted on interaction: a card being pressed. */
  sm: level(2, 4, 0.1, 2),
  /** A layer over the page: menus, popovers, the focus chip. */
  md: level(6, 12, 0.12, 6),
  /** A floating object: the focus timer, a sheet, a toast. */
  lg: level(12, 16, 0.14, 12)
}

export default ELEVATION
