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
import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

export function SubjectHead({ subject }) {
  const { t } = useTranslation()
  if (!subject?.front) return null

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
      {subject.deckName ? (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('agent.ready.position', { deck: subject.deckName, index: subject.cardIndex, total: subject.totalCards })}
        </Typography>
      ) : null}
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
