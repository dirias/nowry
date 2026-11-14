/**
 * The companion evolved (ADR-075, EVO-014).
 *
 * The web's reveal, on the phone: the same sequence from the same data
 * (`@nowry/core/domain/petEvolution`), drawn with this platform's own tools.
 * A spiral of light draws around the old form, turns and tightens with a few
 * motes riding it inward, closes into a flash of earned gold under which the
 * form is swapped, and opens again as the new form arrives.
 *
 * **It takes the screen, and only for this.** A level that changes no form
 * keeps its row in the summary (`PetLevelUp`): that row is a message about the
 * companion and sits with it. A new form is the thing the whole XP loop builds
 * toward, so it gets a moment of its own — once, and then the summary is there.
 *
 * **One thing moves.** While the spiral is on screen the companion holds
 * still (`still` on the orb); its own entrance comes after the spiral has
 * gone. No sound, no haptics, no confetti (ADR-075 §3).
 *
 * **Never a wait.** A tap anywhere skips to the end, Back closes it, and under
 * reduced motion the new form is simply there. Every length is the shared
 * timeline's, in the motion scale's steps; nothing here writes a duration.
 *
 * The spiral is an effect, not anatomy: it wraps a form of any shape and needs
 * no asset per stage. It wears the accent's plain colour; gold stays with the
 * flash, which is the earned thing.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, View } from 'react-native'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import { StatusBar } from 'expo-status-bar'
import { useTranslation } from 'react-i18next'
import {
  EVOLUTION_DONE,
  MOTE_COUNT,
  evolutionLayer,
  beatDuration,
  firstBeat,
  motePath,
  nextBeat,
  spiralLength,
  spiralPath
} from '@nowry/core/domain/petEvolution'
import { earnedGold } from '@nowry/core/tokens/colorSystem'
import { useReduceMotion, useTheme } from '../../theme'
import { Button } from '../Button'
import { Typography, resolveColor } from '../Typography'
import { PetOrb } from './PetOrb'

const VARIANT = 'full'
const FRAME = 220
const ORB = 132
const STROKE = 3
const MOTE = 5
const AnimatedPath = Animated.createAnimatedComponent(Path)

/** 0 → 1 over one beat, on the house's curve. */
const play = (value, duration, easing, useNativeDriver = true) => {
  value.setValue(0)
  return Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver })
}

export function EvolutionReveal({ fromStage, toStage, level, accent = null, onClose }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const [beat, setBeat] = useState(firstBeat(VARIANT))
  const done = beat === EVOLUTION_DONE

  // One value per beat: each is the 0–1 progress of the thing that beat moves.
  const draw = useRef(new Animated.Value(0)).current
  const tighten = useRef(new Animated.Value(0)).current
  const flash = useRef(new Animated.Value(0)).current
  const open = useRef(new Animated.Value(0)).current

  const geometry = useMemo(() => {
    const options = { size: FRAME }
    return {
      path: spiralPath(options),
      length: spiralLength(options),
      motes: Array.from({ length: MOTE_COUNT }, (_, index) => motePath(index, options))
    }
  }, [])

  // The setting is read asynchronously; when it says "reduce", the sequence ends where it stands.
  useEffect(() => {
    if (reduceMotion) setBeat(EVOLUTION_DONE)
  }, [reduceMotion])

  useEffect(() => {
    if (done) return undefined
    const easing = Easing.bezier(...theme.motion.easing.standard)
    const duration = beatDuration(VARIANT, beat)
    const value = { anticipation: draw, transformation: tighten, flash, reveal: open }[beat]
    // The dash offset is an SVG prop, which the native driver cannot reach; the transforms can.
    const moving = play(value, duration, easing, beat !== 'anticipation')
    // The beat ends when its own animation does — one timeline, not an animation and a clock
    // that have to agree (motion.test.js). A skip stops it, and a stopped beat advances nothing.
    moving.start(({ finished }) => {
      if (finished) setBeat(nextBeat(VARIANT, beat))
    })
    return () => moving.stop()
  }, [beat, done, theme, draw, tighten, flash, open])

  const skip = () => {
    if (!done) setBeat(EVOLUTION_DONE)
  }

  const toName = t(`pet.stage.${toStage}.name`)
  const fromName = t(`pet.stage.${fromStage}.name`)
  // What each layer is doing now: the shared rule, so the swap happens under the gold (EVO-016).
  const fromLayer = evolutionLayer(VARIANT, beat, 'from')
  const flashLayer = evolutionLayer(VARIANT, beat, 'flash')
  const toLayer = evolutionLayer(VARIANT, beat, 'to')
  const gold = earnedGold(theme.scheme)
  const spiralColor = resolveColor(theme, 'primary.plainColor')
  const opening = beat === 'reveal'

  // The coil as a whole: it turns and tightens, vanishes under the flash, then opens outward and fades.
  const coilStyle = opening
    ? {
        opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ rotate: '270deg' }, { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }]
      }
    : {
        opacity: beat === 'flash' ? 0 : 1,
        transform: [
          { rotate: tighten.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          { scale: tighten.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }
        ]
      }
  const steps = geometry.motes[0].length - 1
  const stops = Array.from({ length: steps + 1 }, (_, step) => step / steps)

  return (
    <Modal visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Pressable
        accessibilityViewIsModal
        accessibilityRole='none'
        onPress={skip}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[3],
          padding: theme.spacing[4],
          backgroundColor: resolveColor(theme, 'background.body')
        }}
      >
        <Typography level='body-sm' color='text.tertiary'>
          {t('pet.evolution.eyebrow')}
        </Typography>

        <View
          style={{ width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center' }}
          importantForAccessibility='no-hide-descendants'
        >
          {fromLayer === 'gone' ? null : (
            <Animated.View
              style={
                fromLayer === 'fading'
                  ? {
                      position: 'absolute',
                      opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                      transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }]
                    }
                  : { position: 'absolute' }
              }
            >
              <PetOrb stage={fromStage} accent={accent} size={ORB} still />
            </Animated.View>
          )}

          {toLayer === 'gone' ? null : (
            <Animated.View
              style={
                toLayer === 'arriving'
                  ? {
                      position: 'absolute',
                      opacity: open,
                      transform: [{ scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }]
                    }
                  : { position: 'absolute' }
              }
            >
              <PetOrb stage={toStage} accent={accent} size={ORB} still={!done} />
            </Animated.View>
          )}

          {/* The flash: earned gold over the old form as it fades, gone as the new one arrives. */}
          {flashLayer === 'gone' ? null : (
            <Animated.View
              pointerEvents='none'
              style={{
                position: 'absolute',
                opacity: flashLayer === 'arriving' ? flash : open.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [{ scale: flashLayer === 'arriving' ? flash.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1 }]
              }}
            >
              <Svg width={FRAME * 0.8} height={FRAME * 0.8}>
                <Defs>
                  <RadialGradient id='evolution-gold' cx='50%' cy='50%' r='50%'>
                    <Stop offset='0' stopColor={gold} stopOpacity={1} />
                    <Stop offset='0.7' stopColor={gold} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={FRAME * 0.4} cy={FRAME * 0.4} r={FRAME * 0.4} fill='url(#evolution-gold)' />
              </Svg>
            </Animated.View>
          )}

          {done || reduceMotion ? null : (
            <Animated.View pointerEvents='none' style={[{ position: 'absolute', width: FRAME, height: FRAME }, coilStyle]}>
              <Svg width={FRAME} height={FRAME} viewBox={`0 0 ${FRAME} ${FRAME}`}>
                <AnimatedPath
                  d={geometry.path}
                  stroke={spiralColor}
                  strokeWidth={STROKE}
                  strokeLinecap='round'
                  fill='none'
                  strokeDasharray={geometry.length}
                  strokeDashoffset={
                    beat === 'anticipation' ? draw.interpolate({ inputRange: [0, 1], outputRange: [geometry.length, 0] }) : 0
                  }
                />
              </Svg>
              {beat === 'transformation'
                ? geometry.motes.map((points, index) => (
                    <Animated.View
                      key={index}
                      style={{
                        position: 'absolute',
                        left: -MOTE / 2,
                        top: -MOTE / 2,
                        width: MOTE,
                        height: MOTE,
                        borderRadius: 999,
                        backgroundColor: spiralColor,
                        opacity: tighten.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                        transform: [
                          { translateX: tighten.interpolate({ inputRange: stops, outputRange: points.map((point) => point.x) }) },
                          { translateY: tighten.interpolate({ inputRange: stops, outputRange: points.map((point) => point.y) }) }
                        ]
                      }}
                    />
                  ))
                : null}
            </Animated.View>
          )}
        </View>

        {/* The words wait for the form: what they name is not there until it is. */}
        <View
          accessible
          accessibilityLiveRegion='polite'
          accessibilityLabel={
            done
              ? `${toName}. ${t('pet.evolution.became', { from: fromName, to: toName })}`
              : t('pet.evolution.evolving', { name: fromName })
          }
          style={{ alignItems: 'center', gap: theme.spacing[1], opacity: done ? 1 : 0 }}
        >
          <Typography level='h2'>{toName}</Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('pet.evolution.became', { from: fromName, to: toName })}
          </Typography>
          <Typography level='body-sm' color='text.tertiary'>
            {t('pet.levelUp.reached', { level })}
          </Typography>
        </View>

        {/* The hint sits where the key will, so nothing moves when the sequence ends. */}
        <View style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <Button onPress={onClose}>{t('pet.evolution.continue', { name: toName })}</Button>
          ) : (
            <Typography level='body-xs' color='text.tertiary'>
              {t('pet.evolution.skip')}
            </Typography>
          )}
        </View>
      </Pressable>
    </Modal>
  )
}

export default EvolutionReveal
