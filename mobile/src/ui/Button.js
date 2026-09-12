/**
 * The house button: a key you press (BUTTONS.md, ADR-020).
 *
 * The signature is one moving part. The button has a 2px edge under it in a
 * darker shade of its own colour, and pressing pushes it down exactly that 2px
 * so the edge disappears — it moves the distance the edge promised. 80ms, the
 * `quick` duration, with the standard easing. Nothing else animates.
 *
 * **The edge is geometry here, not a shadow.** The web draws it with
 * `box-shadow: 0 2px 0 0`, a hard offset with no blur. React Native cannot do
 * that portably: iOS shadows can be hard-edged but Android's `elevation` is
 * always a blurred drop shadow and takes no colour. So the edge is a real View
 * behind the surface, which draws identically on both platforms and makes the
 * travel free — the surface simply slides down over it.
 *
 * Under reduced motion the button does not move, and the edge still appears and
 * disappears. That is the standard's own rule: the same information, without
 * motion.
 */
import { useRef } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, View } from 'react-native'
import { useTheme, useReduceMotion } from '../theme'
import { Typography, resolveColor } from './Typography'
import { BUTTON_RADIUS, BUTTON_SIZES, BUTTON_VARIANTS, DISABLED_OPACITY, EDGE, MIN_TOUCH_TARGET } from './buttonSpec'

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  startGlyph,
  accessibilityLabel,
  style,
  ...rest
}) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const travel = useRef(new Animated.Value(0)).current

  const spec = BUTTON_SIZES[size]
  const tone = BUTTON_VARIANTS[variant]

  if (__DEV__) {
    if (!spec) throw new Error(`Button: unknown size "${size}". Use sm, md or lg.`)
    if (!tone) throw new Error(`Button: unknown variant "${variant}". Use primary, secondary, tertiary or danger.`)
    if (!accessibilityLabel && typeof children !== 'string') {
      throw new Error(
        'Button: an accessibilityLabel is required when the label is not plain text. ' +
          'A control a screen reader cannot name is a control some people cannot use.'
      )
    }
  }

  const inert = disabled || loading

  const animate = (to) => {
    if (reduceMotion) return
    Animated.timing(travel, {
      toValue: to,
      duration: theme.motion.duration.quick,
      easing: Easing.bezier(...theme.motion.easing.standard),
      useNativeDriver: true
    }).start()
  }

  // The edge is the only depth a Nowry button has (BUTTONS.md §9).
  const edgeColor = tone.edge ? resolveColor(theme, tone.edge) : 'transparent'
  const radius = theme.radius[BUTTON_RADIUS]

  // 44 from the theme, never from a call site (BUTTONS.md §2). `hitSlop`
  // extends the touch area without changing what the eye sees.
  const shortfall = Math.max(0, MIN_TOUCH_TARGET - spec.height)
  const hitSlop = { top: shortfall / 2, bottom: shortfall / 2, left: 0, right: 0 }

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      onPressIn={() => animate(EDGE)}
      onPressOut={() => animate(0)}
      hitSlop={hitSlop}
      disabled={inert}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: inert, busy: loading }}
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
              /*
               * A MINIMUM, not a height. `<Text>` scales with the OS font
               * setting and a fixed box does not, so at the accessibility
               * sizes the label simply overflowed and was sliced top and
               * bottom — on Home the app's own primary key read "Repasar 25
               * tarjetas" with the tops and tails of its letters cut off
               * (MOB-083). At the default scale the label is shorter than the
               * spec height, so nothing about any button moves.
               */
              minHeight: spec.height,
              paddingHorizontal: spec.paddingX,
              paddingVertical: EDGE,
              borderRadius: radius,
              backgroundColor: resolveColorOrTransparent(theme, pressed ? tone.groundPressed : tone.ground),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spec.glyphGap,
              // Reduced motion keeps the button still; the edge above still
              // appears and disappears (BUTTONS.md §4).
              transform: reduceMotion ? [] : [{ translateY: travel }]
            }}
          >
            {loading ? (
              // The label swaps to a spinner and a verb; the width does not
              // change, so the row does not reflow (BUTTONS.md §4).
              <ActivityIndicator size='small' color={resolveColor(theme, tone.label)} />
            ) : (
              startGlyph
            )}
            <Typography level={spec.level} color={tone.label}>
              {children}
            </Typography>
          </Animated.View>
        </View>
      )}
    </Pressable>
  )
}

/** The tertiary's ground is genuinely nothing, which is not a token. */
const resolveColorOrTransparent = (theme, name) => (name === 'transparent' ? 'transparent' : resolveColor(theme, name))

export default Button
