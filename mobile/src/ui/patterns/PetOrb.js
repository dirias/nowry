/**
 * The companion, drawn (MOB-050).
 *
 * Six stages, told apart by structure rather than by size: the silhouette
 * (an egg, then a circle), an earned mark, aura rings and orbiting motes. That
 * is the shared table's own promise — 24px of diameter spread over six stages
 * is invisible in isolation, and nobody ever sees two stages side by side. So
 * the phone draws exactly what the table says and adds nothing of its own.
 *
 * **It moves, and MOB-050 was wrong that it should not.** That task wrote the
 * stillness down as a decision — an always-running idle animation being battery
 * spent on decoration — and the reasoning mistook what the movement is for. The
 * drift's distance and speed are how the MOOD is read, and the mood is the one
 * thing about a companion that changes minute to minute; the gait is how the
 * SPECIES is read. Neither is available any other way on this screen, so a still
 * pet does not look calm, it looks broken (MOB-090). Both loops are transforms
 * on the native driver, so the cost is not the JavaScript thread, and both stop
 * dead when the device asks for reduced motion.
 *
 * **The colour is user data.** It resolves from the account's accent through
 * the shared `petColor`, so a companion is the colour of the app it lives in,
 * and the glyph on it takes the readable contrast of that colour rather than a
 * token.
 *
 * **It wears a PORTRAIT, and that was missing for a cycle (MOB-089).** The web
 * has drawn one since the pet shipped — a generated image for anyone who has
 * made one, Nowry for everyone else. The phone drew the coloured shape alone,
 * which is not a simplification of the web but a different companion: the
 * thing the learner recognises is the creature, and this was showing them a
 * disc. The shape is still here and still does the work it always did — it is
 * the ground the portrait sits on, and it is what is drawn when there is no
 * portrait at all, or when one fails to load.
 *
 * **Nowry is the Spiral, drawn (BRAND-007).** The six owl illustrations are
 * gone; the default companion is the coil from the shared geometry, one turn
 * further at every stage, in whichever of paper or ink reads on the accent
 * body — the same parts the web draws, from the same module.
 */
import { useState } from 'react'
import { Animated, Image, View } from 'react-native'
import { companionSpecies } from '@nowry/core/domain/petMotion'
import { petPortrait } from '@nowry/core/domain/petPortrait'
import { resolveColor as petColorFor } from '@nowry/core/utils/petColor'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { stageConfig } from '@nowry/core/domain/petStages'
import { earnedGold } from '@nowry/core/tokens/colorSystem'
import { useTheme } from '../../theme'
import { Icon } from '../icons'
import { CompanionMark } from './CompanionMark'
import { useOrbMotion } from './useOrbMotion'

/** The mark each stage earns, as this client's glyphs. */
const MARK_ICONS = { crest: 'ChevronUp', halo: 'Circle', crown: 'Crown' }

/** Each ring sits this much outside the one inside it. */
const RING_STEP = 6

export function PetOrb({
  stage = 1,
  accent = null,
  size = null,
  avatarUrl = null,
  isDefaultCompanion = true,
  species = null,
  mood = 'idle',
  still = false
}) {
  const config = stageConfig(stage)
  const theme = useTheme()
  const motion = useOrbMotion({
    mood,
    species: companionSpecies({ species, isDefaultCompanion }),
    pulseDuration: config.pulseDuration
  })
  const body = size ?? config.sizePx
  const color = petColorFor(accent, stage)
  const rings = config.ringCount
  const outer = body + rings * RING_STEP * 2

  /*
   * A generated portrait is a URL over the network, and a network that is not
   * there must not leave a hole where the companion was. On failure the shape
   * underneath is what remains, which is the same companion at the same stage
   * in the same colour — a fallback rather than an error.
   */
  const [failed, setFailed] = useState(false)
  const portrait = petPortrait({ avatarUrl, isDefaultCompanion, stage })
  const source = failed || portrait?.kind !== 'generated' ? null : { uri: portrait.url }
  const wearsNowry = !source && portrait?.kind === 'default'

  // `still` is for the places a moving portrait would be noise rather than
  // presence: a 24px speaker beside a sentence, a row in a settings list.
  const drift = still ? [] : motion.drift
  const gait = still ? [] : motion.gait

  return (
    <Animated.View
      importantForAccessibility='no'
      accessible={false}
      style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center', transform: drift }}
    >
      {/* Aura, outermost first, each fainter than the one inside it. */}
      {Array.from({ length: rings }, (_, i) => {
        const diameter = body + (i + 1) * RING_STEP * 2
        return (
          <View
            key={`ring-${i}`}
            style={{
              position: 'absolute',
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              borderWidth: 1,
              borderColor: color,
              opacity: 0.35 - i * 0.08
            }}
          />
        )
      })}

      {/* The motes of the last two stages, spaced evenly around the aura. */}
      {Array.from({ length: config.orbitCount }, (_, i) => {
        const angle = (2 * Math.PI * i) / config.orbitCount
        const radius = outer / 2 - 2
        return (
          <View
            key={`mote-${i}`}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              // Earned, so gold (ADR-034) — the body keeps the accent.
              backgroundColor: earnedGold(theme.scheme),
              opacity: 0.9,
              transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }]
            }}
          />
        )
      })}

      {/*
       * The body. An egg is not a circle: the web writes it as an asymmetric
       * CSS radius, which React Native has no equivalent for, so it is built
       * from per-corner radii — taller above than below, which is the part of
       * that shape the eye actually reads.
       */}
      <View
        style={{
          width: body,
          height: body,
          backgroundColor: color,
          borderTopLeftRadius: config.form === 'egg' ? body * 0.56 : body / 2,
          borderTopRightRadius: config.form === 'egg' ? body * 0.56 : body / 2,
          borderBottomLeftRadius: config.form === 'egg' ? body * 0.44 : body / 2,
          borderBottomRightRadius: config.form === 'egg' ? body * 0.44 : body / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // Clips the portrait to the body's silhouette — an egg stays an egg.
          // Everything that must extend BEYOND it (the rings, the motes) is a
          // sibling above, never a child of this, which is the same division
          // the web's orb makes and for the same reason.
          overflow: 'hidden'
        }}
      >
        {source ? (
          /*
           * The GAIT rides on the portrait, inside the clip, never on the body
           * that does the clipping — which is where the web puts it and for a
           * reason that is obvious the moment it is wrong: scaling the body
           * turns the companion's silhouette into an ellipse, so a wing spread
           * read as the whole creature being squashed.
           */
          <Animated.Image
            source={source}
            onError={() => setFailed(true)}
            style={{ width: body, height: body, transform: gait }}
            resizeMode='cover'
            accessible={false}
          />
        ) : wearsNowry ? (
          <Animated.View style={{ transform: gait }}>
            <CompanionMark stage={portrait.stage} mood={mood} size={Math.round(body * 0.78)} literalColor={readableTextOn(color)} />
          </Animated.View>
        ) : config.mark ? (
          <Animated.View style={{ transform: gait }}>
            <Icon name={MARK_ICONS[config.mark]} size='sm' literalColor={readableTextOn(color)} />
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  )
}

export default PetOrb
