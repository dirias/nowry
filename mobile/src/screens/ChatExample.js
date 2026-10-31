/**
 * One example sentence in a companion reply, as a row (CHAT-004, ADR-055 §5).
 *
 * The sentence, its reading and its translation each get a line, because a
 * bullet holding all three — script, romaji, English — was the densest thing
 * on the screen and the one the learner came for. The row can be heard, with
 * the card's language as the hint so kanji are read as the deck's language
 * (ADR-050), and kept as a card (CHAT-006).
 *
 * While the card's answer is hidden, the translation waits behind "Show
 * meaning" (CHAT-013, ADR-056 §4): the sentence and its reading are the clue,
 * and the learner gets one honest try at the meaning before seeing it.
 */
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSpeech } from '../hooks/useCardSpeech'
import { useTheme } from '../theme'
import { Button, Typography, resolveColor } from '../ui'
import { SpeakToggle } from '../ui/patterns'

export function ChatExample({ example, hint = null, action = null, meaningHidden = false }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const speech = useSpeech({ text: example.sentence, hint })
  const [revealed, setRevealed] = useState(false)
  const showMeaning = !meaningHidden || revealed

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[1.5],
        paddingVertical: theme.spacing[1.5],
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: resolveColor(theme, 'divider')
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Typography level='body-lg'>{example.sentence}</Typography>
        {example.reading ? (
          <Typography level='body-sm' color='text.secondary'>
            {example.reading}
          </Typography>
        ) : null}
        {example.translation && showMeaning ? (
          <Typography level='body-sm' color='text.tertiary'>
            {example.translation}
          </Typography>
        ) : null}
        {example.translation && !showMeaning ? (
          <Button
            variant='tertiary'
            size='sm'
            onPress={() => setRevealed(true)}
            accessibilityLabel={t('agent.ready.showMeaningAria')}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('agent.ready.showMeaning')}
          </Button>
        ) : null}
        {action}
      </View>
      {speech.canSpeak ? <SpeakToggle speaking={speech.speaking} onPress={speech.toggle} /> : null}
    </View>
  )
}

export default ChatExample
