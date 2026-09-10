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
 * **Two faces, one box.** Both faces fill the same container absolutely, so the
 * card is exactly one size whichever way round it is. The container's height is
 * whatever the caller gives it; nothing here measures content.
 *
 * **`backfaceVisibility` AND an opacity step.** The former is what makes a flip
 * a flip, but it is unreliable on some Android GPUs, where both faces can paint
 * for a frame mid-turn — the answer flashing through the question is the one
 * failure this screen cannot have. So each face is also switched off at the
 * halfway point. Two mechanisms, one of which is belt.
 *
 * **240ms, the `slow` step, standard easing** (MOTION.md §2): a flip is
 * position, and position is 240. Under reduced motion the duration is zero, so
 * the card is simply the other way round — removed, not slowed, which is the
 * standard's rule. The faces differ in colour and label, so the state stays
 * legible with nothing moving.
 */
import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { useReduceMotion, useTheme } from '../../theme'

/** Enough depth for the turn to read as a turn, without the fisheye. */
export const FLIP_PERSPECTIVE = 1200

/**
 * The frame the hidden face is switched off at: halfway, and the frame before
 * it. Two distinct values because an interpolation's input range has to
 * increase — a repeated stop is not a step, it is an invariant violation.
 */
const HALF = [0.499, 0.5]

export function FlipCard({ flipped, front, back, style }) {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const turn = useRef(new Animated.Value(flipped ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(turn, {
      toValue: flipped ? 1 : 0,
      duration: reduceMotion ? 0 : theme.motion.duration.slow,
      easing: Easing.bezier(...theme.motion.easing.standard),
      useNativeDriver: true
    }).start()
  }, [flipped, reduceMotion, turn, theme])

  const face = (from, to, visibleWhile) => ({
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    transform: [{ perspective: FLIP_PERSPECTIVE }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }],
    // A step, not a fade: 1 for the half of the turn this face faces the
    // reader, 0 for the half it does not.
    opacity: turn.interpolate({
      inputRange: [0, HALF[0], HALF[1], 1],
      outputRange: visibleWhile === 'front' ? [1, 1, 0, 0] : [0, 0, 1, 1]
    })
  })

  return (
    <Animated.View style={style}>
      <Animated.View style={face('0deg', '180deg', 'front')} pointerEvents={flipped ? 'none' : 'auto'}>
        {front}
      </Animated.View>
      <Animated.View style={face('180deg', '360deg', 'back')} pointerEvents={flipped ? 'auto' : 'none'}>
        {back}
      </Animated.View>
    </Animated.View>
  )
}

export default FlipCard
