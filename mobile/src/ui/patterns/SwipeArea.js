/**
 * The study card's gestures (MOB-034), matching the web's own.
 *
 * The web session has had swipe since it shipped, with numbers worked out
 * there: 50px of travel, and whichever axis moved further decides which gesture
 * it was. Those numbers are copied rather than re-guessed, so a learner who
 * studies on both does not have to learn the card twice.
 *
 *   - **Left** goes to the next card without grading it. Skipping is not an
 *     answer, so nothing is recorded.
 *   - **Right** goes back.
 *   - **Up** reveals the answer.
 *   - **Down does nothing**, deliberately. The web's comment says why: on a
 *     phone it is indistinguishable from an ordinary scroll and from
 *     pull-to-refresh, so it used to fire by accident.
 *
 * **The card moves with the thumb.** A gesture with no visible answer to it is
 * a gesture the user cannot tell they are making: the first build fired on
 * release and nothing on screen ever acknowledged the drag, so a half-swipe and
 * a completed one looked identical right up until the card changed. Now the
 * card tracks the finger, and on release it either finishes leaving in the
 * direction it was going (`slow`, the position step — MOTION.md §2) or springs
 * back to centre. Under reduced motion the travel is instant rather than
 * damped: removed, not slowed.
 *
 * `PanResponder` rather than a gesture library: this is one threshold on one
 * view, react-native ships it, and a native module would cost a rebuild.
 *
 * **Every gesture has a control that does the same thing.** A swipe is a
 * shortcut for a thumb that already knows; the buttons underneath are the way.
 * So this view stays invisible to the accessibility tree — announcing a
 * "swipeable" region that duplicates four visible buttons is noise, not help.
 */
import { useMemo, useRef } from 'react'
import { Animated, Easing, PanResponder } from 'react-native'
import { useReduceMotion, useTheme } from '../../theme'

/** The web's own threshold. */
export const SWIPE_DISTANCE = 50

/** Where a committed card goes if the view has not been measured yet. */
const OFFSCREEN = 500

export function SwipeArea({ onLeft, onRight, onUp, children, style }) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const shift = useRef(new Animated.Value(0)).current
  const width = useRef(OFFSCREEN)

  // Read at gesture time, not captured: the responder is built once, and the
  // callbacks it closes over change every card.
  const handlers = useRef({ onLeft, onRight, onUp })
  handlers.current = { onLeft, onRight, onUp }

  // The whole motion object, not two values pulled off it: a gesture handler
  // that carries a bare `duration` is a duration no one can trace back to the
  // scale, and the guard in `motion.test.js` cannot read it either.
  const settings = useRef({ reduceMotion, motion: theme.motion })
  settings.current = { reduceMotion, motion: theme.motion }

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only once it is clearly a drag, so a tap on the
        // card still reaches the card.
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => Math.abs(dx) > 8 || Math.abs(dy) > 8,
        onPanResponderMove: (_event, { dx, dy }) => {
          // Horizontal only. A vertical drag is the reveal, and the flip is
          // its own answer — dragging the card up as well would be two
          // stories at once (MOTION.md §5).
          shift.setValue(Math.abs(dx) > Math.abs(dy) ? dx : 0)
        },
        onPanResponderRelease: (_event, { dx, dy }) => {
          const { onLeft, onRight, onUp } = handlers.current
          const { reduceMotion, motion } = settings.current

          const travel = (to, then) =>
            Animated.timing(shift, {
              toValue: to,
              duration: reduceMotion ? 0 : motion.duration.slow,
              easing: Easing.bezier(...motion.easing.standard),
              useNativeDriver: true
            }).start(() => then?.())

          if (Math.abs(dx) > Math.abs(dy)) {
            const commit = dx < -SWIPE_DISTANCE ? onLeft : dx > SWIPE_DISTANCE ? onRight : null
            if (!commit) return travel(0)
            // Off the edge first, then the card behind it changes, then the
            // frame is put back — so the next card is simply there rather than
            // sliding in from wherever the last one left.
            return travel(Math.sign(dx) * width.current, () => {
              shift.setValue(0)
              commit()
            })
          }

          // Up only. Down is not a gesture here.
          travel(0)
          if (dy < -SWIPE_DISTANCE) onUp?.()
        },
        onPanResponderTerminate: () => shift.setValue(0)
      }),
    [shift]
  )

  return (
    <Animated.View
      {...responder.panHandlers}
      importantForAccessibility='no'
      onLayout={({ nativeEvent }) => {
        width.current = nativeEvent.layout.width || OFFSCREEN
      }}
      style={[style, { transform: [{ translateX: shift }] }]}
    >
      {children}
    </Animated.View>
  )
}

export default SwipeArea
