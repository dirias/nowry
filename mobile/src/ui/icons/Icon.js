/**
 * Icon — the only way a glyph is drawn.
 *
 * Size and colour come from the theme. A caller names a semantic colour and one
 * of the standard's glyph sizes; there is no prop for a hex value and no prop
 * for an arbitrary pixel size, for the same reason `Typography` has no
 * `fontSize`.
 *
 * The name is a lucide name. Where a screen is ported from the web and knows a
 * Material name, `fromMaterial()` translates it — but the translation is a
 * migration aid, not the interface: new code names the lucide icon directly.
 */
import { ICONS } from './iconRegistry'
import { useTheme } from '../../theme'
import { resolveColor } from '../Typography'
import { BUTTON_SIZES } from '../buttonSpec'
import { MATERIAL_TO_LUCIDE, NEEDS_A_DECISION } from './iconMap'

/** The standard's glyph sizes (BUTTONS.md §2), so an icon matches its row. */
export const GLYPH_SIZES = {
  sm: BUTTON_SIZES.sm.glyph,
  md: BUTTON_SIZES.md.glyph,
  lg: BUTTON_SIZES.lg.glyph
}

export function Icon({ name, size = 'md', color = 'text.secondary', literalColor = null, strokeWidth = 2, ...rest }) {
  const theme = useTheme()
  const Glyph = ICONS[name]

  if (__DEV__ && !Glyph) {
    throw new Error(
      `Icon: "${name}" is not in the registry. Icons are imported by name in iconRegistry.js — a namespace ` +
        'import would ship all 1818 of them (2.1MB). Add it to iconMap.js and regenerate. If this is a ' +
        'Material name, translate it with fromMaterial(); if it has no equivalent, it belongs in ' +
        'NEEDS_A_DECISION rather than being guessed at.'
    )
  }

  const px = typeof size === 'number' ? size : GLYPH_SIZES[size]

  if (__DEV__ && !px) {
    throw new Error(`Icon: "${size}" is not a glyph size. Use sm, md or lg (BUTTONS.md §2).`)
  }

  /*
   * `literalColor` is the one escape, and it exists for exactly one caller: a
   * navigator that interpolates between active and inactive and therefore hands
   * back a resolved colour rather than a token. Everywhere else, naming a colour
   * is the rule and `resolveColor` throws on a literal.
   */
  return <Glyph size={px} color={literalColor ?? resolveColor(theme, color)} strokeWidth={strokeWidth} {...rest} />
}

/**
 * A Material name, translated. Returns null for one with no equivalent, so a
 * caller can fall back to a word rather than draw the wrong thing.
 */
export const fromMaterial = (materialName) => {
  if (NEEDS_A_DECISION[materialName]) return null
  return MATERIAL_TO_LUCIDE[materialName] ?? null
}

export default Icon
