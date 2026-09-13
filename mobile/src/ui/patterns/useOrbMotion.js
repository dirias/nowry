/**
 * The companion's movement, on a phone (MOB-090).
 *
 * Two loops, because they are two different things and the web composes them
 * the same way. The DRIFT is the mood: how far the companion rises and how
 * fast, which is `MOOD_PRESENTATION` and the stage's own pulse duration. The
 * GAIT is the species: a wing spread, a walking bounce, a spin, a sway, which
 * is `SPECIES_MOTION`. A tired owl flaps at the same rate as a happy one and
 * drifts a third as far.
 *
 * **The keyframes are read generically.** Each entry in the shared table is a
 * property mapped to its values over one cycle, evenly spaced. That is exactly
 * what an interpolation over a 0-to-1 loop takes, so there is no per-species
 * code here and nothing to keep in step with the web: adding a species to the
 * table animates it on both clients.
 *
 * **Native driver throughout.** Every property in both tables is a transform,
 * so the loops run on the UI thread and a slow render cannot stutter them —
 * which is the answer to MOB-050's objection about an idle animation costing
 * battery. What it costs is not the JavaScript thread.
 *
 * **Reduced motion stops it dead**, rather than slowing it, which is exactly
 * what MOTION.md §4 asks for: position motion is REMOVED, not slowed.
 *
 * **These periods are not on the three-step duration scale, and must not be.**
 * The scale's job is state changes — a sheet opening, a row pressing — where a
 * component that "needs" 120ms is on the wrong step. A breathing loop is not a
 * state change: its period is a characteristic of the creature, written in the
 * shared table beside the keyframes it paces, and an owl's 0.85s wingbeat has
 * no more business being `base` than a heart rate does. `motion.test.js`
 * records the exemption by name so it stays one file rather than a habit.
 */
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { moodPresentation, speciesMotion } from '@nowry/core/domain/petMotion'
import { useReduceMotion } from '../../theme/motion'

/** Properties whose keyframes are degrees rather than numbers. */
const ANGLES = ['rotate']

/** The shared table is written in seconds, as the web's engine takes them. */
const SECONDS = 1000

/**
 * One 0-to-1 loop, running for as long as it is wanted.
 *
 * `easeInOut` and `linear` are the only two eases the shared table uses, and
 * they mean the same thing in both engines.
 */
function useLoop(durationMs, ease, enabled) {
  const value = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!enabled) {
      value.setValue(0)
      return undefined
    }
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: ease === 'linear' ? Easing.linear : Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    )
    loop.start()
    return () => loop.stop()
  }, [value, durationMs, ease, enabled])

  return value
}

/** A keyframe array as an interpolation of a 0-to-1 progress value. */
const track = (progress, key, frames) =>
  progress.interpolate({
    inputRange: frames.map((_, index) => index / (frames.length - 1)),
    outputRange: ANGLES.includes(key) ? frames.map((frame) => `${frame}deg`) : frames
  })

/**
 * @param {{mood?: string, species?: string|null, pulseDuration?: number}} pet
 * @returns {{drift: object[], gait: object[]}} transform arrays, ready to spread
 */
export function useOrbMotion({ mood = 'idle', species = null, pulseDuration = 2.4 } = {}) {
  const reduce = useReduceMotion()
  const feeling = moodPresentation(mood)
  const gait = speciesMotion(species)

  const driftValue = useLoop(pulseDuration * feeling.speedScale * SECONDS, 'easeInOut', !reduce)
  const gaitValue = useLoop((gait?.transition?.duration ?? 1) * SECONDS, gait?.transition?.ease ?? 'easeInOut', !reduce && Boolean(gait))

  /*
   * The drift is written as keyframes too, rather than as a special case, so
   * the mood's distance is the only thing that varies and the shape of the
   * movement is the same one the web draws: up, then back.
   */
  const drift = useMemo(
    () => (reduce ? [] : [{ translateY: track(driftValue, 'translateY', [0, -feeling.driftY, 0]) }]),
    [reduce, driftValue, feeling.driftY]
  )

  const gaitTransforms = useMemo(() => {
    if (reduce || !gait) return []
    return Object.entries(gait.animate).map(([key, frames]) => ({
      // The table calls the vertical one `y`, which is framer-motion's name for
      // what React Native calls `translateY`. One rename, stated once.
      [key === 'y' ? 'translateY' : key]: track(gaitValue, key, frames)
    }))
  }, [reduce, gait, gaitValue])

  return { drift, gait: gaitTransforms }
}

export default useOrbMotion
