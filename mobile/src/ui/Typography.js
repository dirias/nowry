/**
 * Typography — the only way text is drawn.
 *
 * A caller names a LEVEL and a semantic colour. There is no `fontSize` prop and
 * passing one through `style` is refused in development, which is the mobile
 * equivalent of the web's `no-restricted-syntax` rule against raw `fontSize`.
 *
 * Accessibility scaling is the reason this component exists at all rather than
 * a style object. React Native's `lineHeight` is absolute pixels and does not
 * grow with the OS font setting, so text at 200% overflows a line box computed
 * at 100%. Multiplying the level's ratio by the SCALED size keeps the block
 * proportional at every setting.
 */
import { PixelRatio, Text } from 'react-native'
import { useTheme } from '../theme'
import { FONT_WEIGHTS, FONT_WEIGHT_NAMES, TYPE_LEVELS } from './typeLevels'

const FORBIDDEN = ['fontSize', 'fontWeight', 'lineHeight', 'fontFamily']

export function Typography({ level = 'body-md', weight = null, color = 'text.primary', style, children, ...rest }) {
  const theme = useTheme()
  const spec = TYPE_LEVELS[level]

  if (__DEV__) {
    if (weight && !FONT_WEIGHTS[weight]) {
      throw new Error(`Typography: "${weight}" is not a weight. Use ${FONT_WEIGHT_NAMES.join(', ')} (DESIGN_GUIDELINES §4.1).`)
    }
    if (!spec) {
      throw new Error(`Typography: unknown level "${level}". Use one of: ${Object.keys(TYPE_LEVELS).join(', ')}`)
    }
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {}
    const offender = FORBIDDEN.find((k) => flat[k] !== undefined)
    if (offender) {
      throw new Error(
        `Typography: "${offender}" is not yours to set. Name a level instead — ${Object.keys(TYPE_LEVELS).join(', ')} ` +
          '(DESIGN_GUIDELINES §4). If no level fits, the level system is wrong, not this call site.'
      )
    }
  }

  // The OS font setting. `lineHeight` must follow it or the block clips.
  const scale = PixelRatio.getFontScale()
  const resolved = resolveColor(theme, color)

  return (
    <Text
      style={[
        {
          fontSize: spec.fontSize,
          // The level's weight unless the caller names one: emphasis inside a
          // level is the document's own, not a different level.
          fontWeight: weight ? FONT_WEIGHTS[weight] : spec.fontWeight,
          lineHeight: spec.fontSize * scale * spec.lineHeightRatio,
          letterSpacing: spec.letterSpacing,
          color: resolved
        },
        style
      ]}
      {...rest}
    >
      {children}
    </Text>
  )
}

/** `text.secondary` → the palette value. A literal is refused in development. */
export const resolveColor = (theme, name) => {
  if (typeof name !== 'string') return undefined
  if (name.startsWith('#') || name.startsWith('rgb')) {
    if (__DEV__) {
      throw new Error(`A literal colour ("${name}") is never correct. Name a semantic colour, e.g. text.secondary.`)
    }
    return name
  }
  const [group, key] = name.split('.')
  const value = key === undefined ? theme.palette[group] : theme.palette[group]?.[key]
  if (value === undefined && __DEV__) {
    throw new Error(`Unknown semantic colour "${name}".`)
  }
  return value
}

export default Typography
