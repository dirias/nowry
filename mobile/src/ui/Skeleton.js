/**
 * Skeleton — the loading affordance, everywhere.
 *
 * The house rule is that a screen never gates on a full-page spinner: each
 * element that is loading says so in its own place, at its own size, so the
 * layout the user is about to read is already there.
 *
 * The pulse is a fade, which MOTION.md allows to keep its duration under reduced
 * motion — it moves nothing. Under reduced motion it settles to a steady ground
 * rather than pulsing, because a pulse with no motion budget is just a flicker.
 */
import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useTheme, useReduceMotion } from '../theme'
import { resolveColor } from './Typography'

export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const pulse = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    if (reduceMotion) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: theme.motion.duration.slow * 3,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: theme.motion.duration.slow * 3,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulse, reduceMotion, theme.motion.duration.slow])

  return (
    <Animated.View
      accessibilityRole='progressbar'
      accessibilityLabel='Loading'
      style={[
        {
          width,
          height,
          borderRadius: theme.radius[radius],
          backgroundColor: resolveColor(theme, 'background.level2'),
          opacity: reduceMotion ? 0.6 : pulse
        },
        style
      ]}
    />
  )
}

export default Skeleton
