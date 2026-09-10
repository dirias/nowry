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
 * `PanResponder` rather than a gesture library: this is one threshold on one
 * view, react-native ships it, and a native module would cost a rebuild.
 *
 * **Every gesture has a control that does the same thing.** A swipe is a
 * shortcut for a thumb that already knows; the buttons underneath are the way.
 * So this view stays invisible to the accessibility tree — announcing a
 * "swipeable" region that duplicates four visible buttons is noise, not help.
 */
import { useMemo, useRef } from 'react'
import { PanResponder, View } from 'react-native'

/** The web's own threshold. */
export const SWIPE_DISTANCE = 50

export function SwipeArea({ onLeft, onRight, onUp, children, style }) {
  const handlers = useRef({ onLeft, onRight, onUp })
  handlers.current = { onLeft, onRight, onUp }

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only once it is clearly a drag, so a tap on the
        // card still reaches the card.
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => Math.abs(dx) > 8 || Math.abs(dy) > 8,
        onPanResponderRelease: (_event, { dx, dy }) => {
          const { onLeft, onRight, onUp } = handlers.current
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -SWIPE_DISTANCE) onLeft?.()
            else if (dx > SWIPE_DISTANCE) onRight?.()
            return
          }
          // Up only. Down is not a gesture here.
          if (dy < -SWIPE_DISTANCE) onUp?.()
        }
      }),
    []
  )

  return (
    <View {...responder.panHandlers} importantForAccessibility='no' style={style}>
      {children}
    </View>
  )
}

export default SwipeArea
