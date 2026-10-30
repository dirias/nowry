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
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FIELDS, subjectField } from '@nowry/core/domain/readyQuestions'
import { useTheme } from '../theme'
import { Button, Card, Stack, Typography } from '../ui'
import { ChoiceSheet } from '../ui/patterns'

/**
 * `onChangeField`, when given, makes the field a control: "Math · change"
 * opens the six fields (CHAT-009). The questions follow the field, so a wrong
 * guess is one tap from right.
 */
export function SubjectHead({ subject, onChangeField = null }) {
  const { t } = useTranslation()
  const [choosing, setChoosing] = useState(false)
  if (!subject?.front) return null
  const field = subjectField(subject)

  return (
    <Card padding={1.5} radius='md'>
      <Stack spacing={0.5}>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
          {subject.deckName ? (
            <Typography level='body-xs' color='text.tertiary' style={{ flex: 1 }} numberOfLines={1}>
              {t('agent.ready.position', { deck: subject.deckName, index: subject.cardIndex, total: subject.totalCards })}
            </Typography>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {onChangeField ? (
            <Button
              variant='tertiary'
              size='sm'
              onPress={() => setChoosing(true)}
              accessibilityLabel={t('agent.ready.field.changeAria', { field: t(`agent.ready.field.${field}`) })}
            >
              {`${t(`agent.ready.field.${field}`)} · ${t('agent.ready.field.change')}`}
            </Button>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 12 }}>
          <Typography level='h3'>{subject.front}</Typography>
          <Typography level='body-sm' color={subject.isFlipped ? 'text.secondary' : 'text.tertiary'} numberOfLines={2}>
            {subject.isFlipped && subject.back ? subject.back : t('agent.ready.answerHidden')}
          </Typography>
        </View>
      </Stack>
      {onChangeField ? (
        <ChoiceSheet
          visible={choosing}
          onClose={() => setChoosing(false)}
          title={t('agent.ready.field.sheetTitle')}
          options={FIELDS.map((value) => ({ value, label: t(`agent.ready.field.${value}`) }))}
          value={field}
          onChange={(value) => {
            setChoosing(false)
            onChangeField(value)
          }}
        />
      ) : null}
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
