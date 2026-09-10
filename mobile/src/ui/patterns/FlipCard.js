/**
 * The study card's two faces, and the turn between them (MOB-034).
 *
 * The web's card has been a true 3D flip since it shipped: a front face
 * carrying the question, a back face carrying the answer, and 180 degrees of
 * rotation between them. The phone stacked the answer under the question
 * instead, which is a different object — the back face showed the front's
 * content, nothing turned, and the card grew as the answer arrived. A flashcard
 * that does not turn is a list.
 *
 * **One face is mounted, not two.** The web draws both faces at once, holds
 * them on top of each other with `position: absolute`, and hides whichever is
 * turned away. That is the CSS idiom and it does not survive the trip: two
 * absolutely positioned faces inside a flexed column left the card 50pt tall
 * with nothing legible in it, which is the state the first build of this
 * shipped in. Here the card holds ONE child in ordinary flow, which is the
 * layout the screen already had working, and the content is swapped at the
 * halfway point of the turn — the frame where the card is edge-on and there is
 * nothing to see. The child is counter-rotated while the back is up, so the
 * answer reads the right way round rather than mirrored.
 *
 * That also disposes of the spoiler the web had to write a comment about: the
 * answer is not in the tree at all until the card is halfway through turning
 * towards it.
 *
 * **240ms, the `slow` step, standard easing** (MOTION.md §2): a flip is
 * position, and position is 240. Under reduced motion there is no turn and no
 * delay — the card is simply the other way round, removed rather than slowed,
 * which is the standard's rule. The faces differ in colour and label, so the
 * state stays legible with nothing moving.
 */
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useReduceMotion, useTheme } from '../../theme'

/** Enough depth for the turn to read as a turn, without the fisheye. */
export const FLIP_PERSPECTIVE = 1200

/** Half a turn, in degrees and as a transform the content is corrected by. */
const HALF_TURN = '180deg'
const MIRRORED = [{ rotateY: HALF_TURN }]
const UPRIGHT = []

export function FlipCard({ flipped, front, back, style }) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const turn = useRef(new Animated.Value(flipped ? 1 : 0)).current
  // Which face's content is in the tree. It follows `flipped` half a turn
  // late, so the swap happens behind the card's own edge.
  const [showing, setShowing] = useState(flipped)

  useEffect(() => {
    if (reduceMotion) {
      turn.setValue(flipped ? 1 : 0)
      setShowing(flipped)
      return undefined
    }

    const duration = theme.motion.duration.slow
    Animated.timing(turn, {
      toValue: flipped ? 1 : 0,
      duration,
      easing: Easing.bezier(...theme.motion.easing.standard),
      useNativeDriver: true
    }).start()

    const swap = setTimeout(() => setShowing(flipped), duration / 2)
    return () => clearTimeout(swap)
  }, [flipped, reduceMotion, turn, theme])

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { perspective: FLIP_PERSPECTIVE },
            { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', HALF_TURN] }) }
          ]
        }
      ]}
    >
      <View style={{ flex: 1, transform: showing ? MIRRORED : UPRIGHT }}>{showing ? back : front}</View>
    </Animated.View>
  )
}

export default FlipCard
