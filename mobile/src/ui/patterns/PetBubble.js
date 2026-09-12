/**
 * The companion, where the web keeps it (MOB-089).
 *
 * MOB-050 gave the pet a PLACE instead of a position — one panel on Home with
 * a name, a level, a bar and two keys — on the reasoning that a phone has no
 * room for a thing that floats and no pointer to drag it with. Half of that
 * held and half of it did not. Dragging and roaming are genuinely a pointer's
 * affordances and neither is here. A fixed corner is not: §15.6 has said all
 * along that the companion rests bottom-right, moves bottom-left in a session,
 * and that on a phone "only the chip stays in a corner".
 *
 * What the panel actually cost was the comparison the learner makes. On the web
 * the companion is a portrait in a bubble, present on every page and costing
 * none of it. Here it was a block of chrome on Home — a level, a progress bar,
 * an XP line and a rename key — none of which the web shows anywhere but its
 * settings page, occupying more of Home than the day's tasks. So the panel is
 * gone, the readouts went to Settings where the web keeps them, and this is
 * what is left: the companion, and one tap to talk to it.
 *
 * **The level is a ring, not a number.** The web draws the progress to the next
 * level as an arc around the portrait, and its own note says why: a level alone
 * tells you where you are and never that you are close. It is also what lets
 * the bar and the XP line leave Home without the reader losing anything — the
 * readout is still here, costing no space and interrupting nothing.
 *
 * **It is not on the study session.** The web moves its bubble to the other
 * corner there; a phone has one column, and both bottom corners of a session
 * are grade keys. The session already carries Ask in its header row beside
 * Listen and Mark, which is a better answer than a portrait over the cards
 * being graded — and it is the same answer ADR-022 gives about messages.
 */
import { Pressable, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { resolveColor as petColorFor } from '@nowry/core/utils/petColor'
import { useAppearance, useTheme } from '../../theme'
import { resolveColor } from '../Typography'
import { PetOrb } from './PetOrb'

/** The body's diameter. Large enough to read a portrait, small enough to pass. */
const BODY = 44

/** How far the bubble sits from the screen's edge and from the bar below it. */
const EDGE = 16

/** The progress ring's stroke, and how far it clears the portrait's own edge. */
const RING = 2.5
const RING_INSET = 4

/**
 * The room a screen has to leave under its last row so the bubble covers
 * nothing.
 *
 * A floating object over a scrolling column will otherwise sit on whatever
 * happens to end at the bottom — and on Settings that was the delete-account
 * key, half covered by a portrait. The web never has this problem because it
 * has margins either side of the column; a phone's column is the screen. So
 * the bubble states its own footprint and `Screen` reserves it, which is one
 * number in one place rather than a padding guessed per screen.
 */
export const PET_BUBBLE_CLEARANCE = BODY + EDGE * 2

export function PetBubble({ pet, onPress, bottom = 0 }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { accent } = useAppearance()

  // A companion the account has never revealed is not drawn at all: the reveal
  // is a moment the web owns, and pre-empting it here would spend it.
  if (pet.loading || !pet.revealed || !pet.active) return null

  return (
    <View
      // The bubble floats over the screen and must not take touches that are
      // not on it — a transparent full-width layer would swallow the corner of
      // every list underneath.
      pointerEvents='box-none'
      style={{ position: 'absolute', right: EDGE, bottom: bottom + EDGE }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={t('agent.aria.openBuddy')}
        style={({ pressed }) => ({
          borderRadius: BODY,
          opacity: pressed ? 0.8 : 1,
          // The one shadow in the app that means "over the page rather than on
          // it" — the floating widget's own elevation (§15.6).
          ...theme.elevation.lg,
          backgroundColor: resolveColor(theme, 'background.surface')
        })}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <PetOrb stage={pet.stage} accent={accent} size={BODY} avatarUrl={pet.avatarUrl} isDefaultCompanion={pet.isDefaultCompanion} />
          <LevelRing progress={pet.levelProgress} size={BODY} color={petColorFor(accent, pet.stage)} />
        </View>
      </Pressable>
    </View>
  )
}

/**
 * The arc to the next level, drawn around the portrait.
 *
 * Nothing until progress is actually known: an empty ring on first paint reads
 * as "you have earned nothing", which is usually false. Rotated a quarter turn
 * so it fills from twelve o'clock rather than from three.
 */
function LevelRing({ progress, size, color }) {
  if (progress == null) return null

  const diameter = size + RING_INSET * 2
  const radius = (diameter - RING) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <Svg width={diameter} height={diameter} pointerEvents='none' style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={diameter / 2} cy={diameter / 2} r={radius} fill='none' stroke={color} strokeWidth={RING} opacity={0.16} />
      <Circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill='none'
        stroke={color}
        strokeWidth={RING}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </Svg>
  )
}

export default PetBubble
