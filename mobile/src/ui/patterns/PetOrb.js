/**
 * The companion, drawn (MOB-050).
 *
 * Six stages, told apart by structure rather than by size: the silhouette
 * (an egg, then a circle), an earned mark, aura rings and orbiting motes. That
 * is the shared table's own promise — 24px of diameter spread over six stages
 * is invisible in isolation, and nobody ever sees two stages side by side. So
 * the phone draws exactly what the table says and adds nothing of its own.
 *
 * **Nothing here animates.** The web's orb pulses on a per-stage duration
 * because it is a floating object on a desktop page. An always-running idle
 * animation on a phone is battery spent on decoration, and the stage is already
 * legible without it — which is the entire reason the structural features
 * exist. If the pet ever gains motion here it will be a reaction to something,
 * not a heartbeat.
 *
 * **The colour is user data.** It resolves from the account's accent through
 * the shared `petColor`, so a companion is the colour of the app it lives in,
 * and the glyph on it takes the readable contrast of that colour rather than a
 * token.
 *
 * **It wears a PORTRAIT, and that was missing for a cycle (MOB-089).** The web
 * has drawn one since the pet shipped — a generated image for anyone who has
 * made one, Nowry's six bundled illustrations for everyone else. The phone drew
 * the coloured shape alone, which is not a simplification of the web but a
 * different companion: the thing the learner recognises is the owl, and this
 * was showing them a disc. The shape is still here and still does the work it
 * always did — it is the ground the portrait sits on, and it is what is drawn
 * when there is no portrait at all, or when one fails to load.
 */
import { useState } from 'react'
import { Image, View } from 'react-native'
import { petPortrait } from '@nowry/core/domain/petPortrait'
import { resolveColor as petColorFor } from '@nowry/core/utils/petColor'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { stageConfig } from '@nowry/core/domain/petStages'
import { Icon } from '../icons'
import { nowryArtFor } from './nowryArt'

/** The mark each stage earns, as this client's glyphs. */
const MARK_ICONS = { crest: 'ChevronUp', halo: 'Circle', crown: 'Crown' }

/** Each ring sits this much outside the one inside it. */
const RING_STEP = 6

export function PetOrb({ stage = 1, accent = null, size = null, avatarUrl = null, isDefaultCompanion = true }) {
  const config = stageConfig(stage)
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
  const source = failed || !portrait ? null : portrait.kind === 'generated' ? { uri: portrait.url } : nowryArtFor(portrait.stage)

  return (
    <View
      importantForAccessibility='no'
      accessible={false}
      style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}
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
              backgroundColor: color,
              opacity: 0.8,
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
          <Image
            source={source}
            onError={() => setFailed(true)}
            style={{ width: body, height: body }}
            resizeMode='cover'
            accessible={false}
          />
        ) : config.mark ? (
          <Icon name={MARK_ICONS[config.mark]} size='sm' literalColor={readableTextOn(color)} />
        ) : null}
      </View>
    </View>
  )
}

export default PetOrb
