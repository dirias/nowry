/**
 * What a chat is about, kept in view, and what can be asked of it
 * (CHAT-005, ADR-055 §1 and §4).
 *
 * The chat named its card once — "About 効果" — and dropped it at the first
 * message, so neither the learner nor, it turned out, the model kept it in
 * view. The head stays for the whole conversation. It is a summary drawn
 * inside the chat, not the study card: the session's card is not touched.
 *
 * The questions are the subject's ready moves (`readyQuestions`). On the front
 * nothing offered can give the answer away; the server holds that line too.
 * They are secondary buttons, not chips: a tap sends, and a chip in this app
 * is a filter (BUTTONS.md).
 */
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme'
import { Button, Card, Stack, Typography } from '../ui'

export function SubjectHead({ subject }) {
  const { t } = useTranslation()
  if (!subject?.front) return null

  return (
    <Card padding={1.5} radius='md'>
      <Stack spacing={0.5}>
        {subject.deckName ? (
          <Typography level='body-xs' color='text.tertiary'>
            {t('agent.ready.position', { deck: subject.deckName, index: subject.cardIndex, total: subject.totalCards })}
          </Typography>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 12 }}>
          <Typography level='h3'>{subject.front}</Typography>
          <Typography level='body-sm' color={subject.isFlipped ? 'text.secondary' : 'text.tertiary'} numberOfLines={2}>
            {subject.isFlipped && subject.back ? subject.back : t('agent.ready.answerHidden')}
          </Typography>
        </View>
      </Stack>
    </Card>
  )
}

/** The ready questions; `note` says which side they were chosen for, on an empty chat only. */
export function ReadyQuestions({ questions, onAsk, note = null, disabled = false }) {
  const { t } = useTranslation()
  const theme = useTheme()
  if (!questions.length) return null

  return (
    <Stack spacing={1} style={{ paddingTop: theme.spacing[0.5] }}>
      {note ? (
        <Typography level='body-sm' color='text.tertiary'>
          {note}
        </Typography>
      ) : null}
      <View style={{ alignItems: 'flex-start', gap: theme.spacing[1] }}>
        {questions.map((question) => (
          <Button
            key={question.id}
            variant='secondary'
            size='md'
            disabled={disabled}
            onPress={() => onAsk(question)}
            accessibilityLabel={t(question.labelKey)}
          >
            {t(question.labelKey)}
          </Button>
        ))}
      </View>
    </Stack>
  )
}
