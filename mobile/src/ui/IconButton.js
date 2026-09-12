/**
 * IconButton — a square of the row height (BUTTONS.md §2, §3).
 *
 * The same key, with a glyph instead of a label. `accessibilityLabel` is not
 * optional here and never can be: there is no text for a screen reader to fall
 * back to, so a missing label leaves the control genuinely unusable rather than
 * merely awkward.
 */
import { useRef } from 'react'
import { Animated, Easing, Pressable, View } from 'react-native'
import { useTheme, useReduceMotion } from '../theme'
import { resolveColor } from './Typography'
import { BUTTON_RADIUS, BUTTON_SIZES, BUTTON_VARIANTS, DISABLED_OPACITY, EDGE, MIN_TOUCH_TARGET } from './buttonSpec'

export function IconButton({ children, onPress, variant = 'tertiary', size = 'md', disabled = false, accessibilityLabel, style, ...rest }) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const travel = useRef(new Animated.Value(0)).current

  const spec = BUTTON_SIZES[size]
  const tone = BUTTON_VARIANTS[variant]

  if (__DEV__ && !accessibilityLabel) {
    throw new Error('IconButton: accessibilityLabel is required. A glyph carries no text for a screen reader to read.')
  }

  const animate = (to) => {
    if (reduceMotion) return
    Animated.timing(travel, {
      toValue: to,
      duration: theme.motion.duration.quick,
      easing: Easing.bezier(...theme.motion.easing.standard),
      useNativeDriver: true
    }).start()
  }

  const radius = theme.radius[BUTTON_RADIUS]
  const edgeColor = tone.edge ? resolveColor(theme, tone.edge) : 'transparent'
  const shortfall = Math.max(0, MIN_TOUCH_TARGET - spec.height)
  const slop = shortfall / 2

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => animate(EDGE)}
      onPressOut={() => animate(0)}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ opacity: disabled ? DISABLED_OPACITY : 1 }, style]}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: pressed && tone.edge ? 'transparent' : edgeColor,
            borderRadius: radius,
            paddingBottom: tone.edge ? EDGE : 0
          }}
        >
          <Animated.View
            style={{
              // Square, of the row height — never narrower (BUTTONS.md §5).
              width: spec.height,
              // A glyph is a fixed size and does not grow with the OS font
              // setting, so this one stays a height rather than a minimum
              // (MOB-083).
              height: spec.height,
              borderRadius: radius,
              backgroundColor:
                tone.ground === 'transparent'
                  ? pressed
                    ? resolveColor(theme, tone.groundPressed)
                    : 'transparent'
                  : resolveColor(theme, pressed ? tone.groundPressed : tone.ground),
              alignItems: 'center',
              justifyContent: 'center',
              transform: reduceMotion ? [] : [{ translateY: travel }]
            }}
          >
            {children}
          </Animated.View>
        </View>
      )}
    </Pressable>
  )
}

export default IconButton
