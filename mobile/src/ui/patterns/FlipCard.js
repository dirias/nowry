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
 * **One face is in flow, the other is over it.** The web makes BOTH faces
 * absolute and lets the parent's fixed height hold the box open. Ported
 * literally that leaves a flexed column with no in-flow content at all, and the
 * card collapsed to an empty band — the state the first build of this shipped
 * in. So the front is an ordinary child and gives the card its size; the back
 * lies over it and takes that size from it.
 *
 * **Nothing about the turn runs in JavaScript.** The rotation and both faces'
 * visibility are interpolations of one native-driven value, so the whole flip
 * is handed to the UI thread once and no frame of it waits on a render. The
 * build before this swapped the card's CONTENT halfway through, on a timer:
 * `setTimeout(duration / 2)` is not halfway — the standard easing is most of
 * the way round by then — and the swap re-rendered the screen mid-flight, which
 * is the stutter. Worse, a swipe during the turn cancelled the timer, so the
 * card kept the face it was on and every later tap turned it to the same
 * content. It read as locked because it was.
 *
 * Visibility is a STEP at the halfway point, not a fade: each face is on for
 * the half of the turn it faces the reader. `backfaceVisibility` says the same
 * thing and is kept as well, but it cannot be the only mechanism — it is
 * unreliable on some Android GPUs, and the answer showing through the question
 * is the one failure this screen cannot have.
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
 * The two frames the faces change over: halfway, and the frame before it. Two
 * distinct values because an interpolation's input range has to increase — a
 * repeated stop is not a step, it is an invariant violation.
 */
const HALF = [0.499, 0.5]

const FRONT_VISIBLE = [1, 1, 0, 0]
const BACK_VISIBLE = [0, 0, 1, 1]

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

  const rotation = (from, to) => ({
    transform: [{ perspective: FLIP_PERSPECTIVE }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }]
  })

  const visibility = (outputRange) => ({
    backfaceVisibility: 'hidden',
    opacity: turn.interpolate({ inputRange: [0, HALF[0], HALF[1], 1], outputRange })
  })

  return (
    <Animated.View style={[style, rotation('0deg', '180deg')]}>
      {/* In flow: this is what the card is as tall as. */}
      <Animated.View style={[{ flex: 1 }, visibility(FRONT_VISIBLE)]} pointerEvents={flipped ? 'none' : 'auto'}>
        {front}
      </Animated.View>
      {/* Over it, turned the other way round, so it reads upright once the
          card has carried it there. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotateY: '180deg' }] }, visibility(BACK_VISIBLE)]}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        {back}
      </Animated.View>
    </Animated.View>
  )
}

export default FlipCard
