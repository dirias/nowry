/**
 * The companion levelled up (PEND-001).
 *
 * Reported as "when pet level up, there is no notice thing". On the phone that
 * was literally true: the session awards session and streak XP, the reply says
 * whether either crossed a level, and the phone threw the reply away. The orb
 * on Home simply looked different the next time you glanced at it.
 *
 * **The orb is the celebration.** Not a toast over the screen: a level-up is a
 * message about the companion, and a message about something sits in that
 * thing's object rather than floating over it (ADR-022). So this is a row in
 * the session summary, drawn at the stage it just reached — the pet you now
 * have, not an announcement about it.
 *
 * **One beat, then still.** A single scale-and-glow on mount, out and back on
 * the house's slowest duration, and then the row is an ordinary row. The web's version is a portal toast that
 * auto-dismisses after 3.6 seconds, which is the thing that was missed: a
 * celebration with a timer is a celebration you can be looking away from. This
 * one stays on the summary for as long as the summary does.
 *
 * **No sound.** The assessment on PEND-001 asks for it opt-in and off by
 * default, and this client has no audio path at all; adding one for a beat
 * nobody asked to hear would be the second mistake in the same feature.
 *
 * Under reduced motion the beat does not play and the row simply appears. It
 * carries the same two sentences either way, so nothing is only in the
 * animation.
 */
import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useReduceMotion, useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { PetOrb } from './PetOrb'

/**
 * How far the orb swells. The timing is `slow` out and `slow` back from the
 * house scale — a beat is the one movement on this screen that is allowed to
 * be the slowest one, because it is the only thing the reader is meant to
 * watch (MOTION.md, DS-001).
 */
const BEAT_SCALE = 1.12

export function PetLevelUp({ level, stage, accent = null }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const beat = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduceMotion) return undefined
    const run = Animated.sequence([
      Animated.timing(beat, {
        toValue: 1,
        duration: theme.motion.duration.slow,
        easing: Easing.bezier(...theme.motion.easing.standard),
        useNativeDriver: true
      }),
      Animated.timing(beat, {
        toValue: 0,
        duration: theme.motion.duration.slow,
        easing: Easing.bezier(...theme.motion.easing.standard),
        useNativeDriver: true
      })
    ])
    run.start()
    return () => run.stop()
    // The beat belongs to the level it announces: a second level-up on the same
    // summary is a new moment and plays again.
  }, [beat, reduceMotion, theme, level])

  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, BEAT_SCALE] })
  const glow = beat.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] })

  return (
    <View
      accessible
      accessibilityLiveRegion='polite'
      accessibilityLabel={`${t('pet.levelUp.reached', { level })}. ${t(`pet.stage.${stage}.name`)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}
    >
      <View importantForAccessibility='no-hide-descendants'>
        {/* The glow is a ring behind the orb rather than a shadow on it: a
            shadow would say "raised", and the orb has not moved layer. */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            borderRadius: 999,
            backgroundColor: resolveColor(theme, 'primary.solidBg'),
            opacity: glow
          }}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <PetOrb stage={stage} accent={accent} />
        </Animated.View>
      </View>

      <View style={{ flex: 1 }}>
        <Typography level='title-md'>{t('pet.levelUp.reached', { level })}</Typography>
        <Typography level='body-sm' color='text.secondary'>
          {t(`pet.stage.${stage}.name`)}
        </Typography>
      </View>
    </View>
  )
}

export default PetLevelUp
