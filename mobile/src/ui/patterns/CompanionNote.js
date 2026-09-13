/**
 * One line from the companion, said without being asked (MOB-088).
 *
 * The web draws this as a bubble hanging off a pet that floats over the page.
 * ADR-022 is the phone's answer to that shape and it is the whole of this
 * component's design: a companion message goes INLINE, in the object it is
 * about, and never over content. A phone screen is one column; something
 * floating over it is covering the card the message is about.
 *
 * So this is a row in the session's own notice band — the band that otherwise
 * carries the gesture hint or the note that a card is already graded. One band,
 * one place, and the card above it is never obscured.
 *
 * **It is dismissible, and that is not decoration.** This is the only thing in
 * the app that speaks unprompted, so it has to be silenceable in one tap; the
 * tap also buys a quiet window, which is the setting doing its job rather than
 * the control doing something invisible.
 *
 * **Listen, when the device can speak** (FR-011). The same control the card
 * itself carries, resolving a voice the same way — a reply about a Japanese
 * card is read by a Japanese voice because `useSpeech` asks the same question
 * `useCardSpeech` does.
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAppearance, useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { IconButton } from '../IconButton'
import { Stack } from '../Stack'
import { PetOrb } from './PetOrb'
import { SpeakToggle } from './SpeakToggle'

/** Small enough to be a speaker rather than a subject. */
const ORB = 24

export function CompanionNote({ stage = 1, avatarUrl = null, isDefaultCompanion = true, text, speech = null, onDismiss }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { accent } = useAppearance()

  if (!text) return null

  return (
    <View
      accessibilityLiveRegion='polite'
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[1],
        padding: theme.spacing[1.5],
        borderRadius: theme.radius.md,
        // `level1` and no border: it is a quiet ground, not a card and not a
        // control (§15.1). A hue here would read as a grade (§15.5).
        backgroundColor: resolveColor(theme, 'background.level1')
      }}
    >
      {/* Still: at 24pt beside a sentence a moving portrait is noise, and the
            sentence is what the reader is here for. */}
      <PetOrb stage={stage} accent={accent} size={ORB} avatarUrl={avatarUrl} isDefaultCompanion={isDefaultCompanion} still />

      <Stack spacing={1} style={{ flex: 1, minWidth: 0 }}>
        <Typography level='body-sm' color='text.secondary'>
          {text}
        </Typography>
        {speech?.canSpeak ? <SpeakToggle speaking={speech.speaking} onPress={speech.toggle} style={{ alignSelf: 'flex-start' }} /> : null}
      </Stack>

      <IconButton variant='tertiary' onPress={onDismiss} accessibilityLabel={t('agent.companion.dismiss')}>
        <Icon name='X' size='sm' color='text.tertiary' />
      </IconButton>
    </View>
  )
}

export default CompanionNote
