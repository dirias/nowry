/**
 * What the floating chat is about, and what can be asked of it — the web's
 * half of the phone's chat head (CHAT-008, ADR-055).
 *
 * The panel greeted every learner with the same welcome and never named the
 * card, so a chat opened mid-session read as a chat about nothing. On a card,
 * the head replaces the welcome and stays above the conversation. It is a
 * summary inside the panel; the study card behind it is not touched.
 *
 * Questions are secondary buttons (BUTTONS.md): a tap sends. They take Tab
 * and Enter only — keys 1–4 grade the card behind the panel.
 */
import React from 'react'
import { Box, Button, Option, Select, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { FIELDS, subjectField } from '@nowry/core/domain/readyQuestions'

/** `onChangeField`, when given, lets the learner correct the deck's field (CHAT-009). */
export function SubjectHead({ subject, onChangeField = null }) {
  const { t } = useTranslation()
  if (!subject?.front) return null
  const field = subjectField(subject)

  return (
    <Box
      sx={{
        borderRadius: 'md',
        bgcolor: 'background.level1',
        px: 1.75,
        py: 1.5,
        mb: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary', flex: 1, minWidth: 0 }}>
          {subject.deckName
            ? t('agent.ready.position', { deck: subject.deckName, index: subject.cardIndex, total: subject.totalCards })
            : ''}
        </Typography>
        {onChangeField ? (
          <Select
            size='sm'
            variant='plain'
            value={field}
            onChange={(_, value) => value && onChangeField(value)}
            aria-label={t('agent.ready.field.changeAria', { field: t(`agent.ready.field.${field}`) })}
            sx={{ minHeight: 0, fontSize: 'xs', color: 'primary.plainColor' }}
          >
            {FIELDS.map((value) => (
              <Option key={value} value={value}>
                {t(`agent.ready.field.${value}`)}
              </Option>
            ))}
          </Select>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.25 }}>
        <Typography level='title-lg' sx={{ color: 'text.primary' }}>
          {subject.front}
        </Typography>
        <Typography level='body-sm' sx={{ color: subject.isFlipped ? 'text.secondary' : 'text.tertiary' }}>
          {subject.isFlipped && subject.back ? subject.back : t('agent.ready.answerHidden')}
        </Typography>
      </Box>
    </Box>
  )
}

export function ReadyQuestions({ questions, onAsk, note = null, disabled = false }) {
  const { t } = useTranslation()
  if (!questions.length) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, mb: 1 }}>
      {note ? (
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {note}
        </Typography>
      ) : null}
      {questions.map((question) => (
        <Button key={question.id} variant='soft' color='neutral' size='sm' disabled={disabled} onClick={() => onAsk(question)}>
          {t(question.labelKey)}
        </Button>
      ))}
    </Box>
  )
}
