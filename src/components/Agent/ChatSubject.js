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
import { FIELDS, subjectField, subjectTitle } from '@nowry/core/domain/readyQuestions'
import { subjectKind } from '@nowry/core/domain/screenContext'

/** "Clear": the learner can always ask about something else (CHAT-010). */
function ClearButton({ subject, onClear }) {
  const { t } = useTranslation()
  if (!onClear) return null
  return (
    <Button
      variant='plain'
      size='sm'
      onClick={onClear}
      aria-label={t('agent.subject.clearAria', { subject: subjectTitle(subject) ?? t(`agent.subject.${subjectKind(subject)}`) })}
      sx={{ minHeight: 0, py: 0.25 }}
    >
      {t('agent.subject.clear')}
    </Button>
  )
}

function screenDetail(t, subject) {
  if (subject.page === 'deck' && (subject.dueCards != null || subject.newCards != null)) {
    return t('agent.subject.deckCounts', { due: subject.dueCards ?? 0, fresh: subject.newCards ?? 0 })
  }
  if (subject.page === 'today' && subject.reviewsDue != null) {
    return t('agent.subject.todayCounts', { reviews: subject.reviewsDue, tasks: subject.tasksLeft ?? 0 })
  }
  return null
}

/** The head for a deck, a book, a board, the day or the plan (CHAT-010). */
function ScreenSubjectHead({ subject, onClear }) {
  const { t } = useTranslation()
  const kind = subjectKind(subject)
  const title =
    subjectTitle(subject) ?? (kind === 'today' ? t('agent.subject.todayTitle') : kind === 'plan' ? t('agent.subject.planTitle') : '')
  const detail = screenDetail(t, subject)
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
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flex: 1 }}>
          {t(`agent.subject.${kind}`)}
        </Typography>
        <ClearButton subject={subject} onClear={onClear} />
      </Box>
      <Typography level='title-md' sx={{ color: 'text.primary' }}>
        {title}
      </Typography>
      {detail ? (
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {detail}
        </Typography>
      ) : null}
    </Box>
  )
}

/** General's threads that can be picked up again (CHAT-010). */
export function ContinueThreads({ threads = [], onContinue }) {
  const { t } = useTranslation()
  if (!threads.length) return null
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.5, mb: 1.5 }}>
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
        {t('agent.subject.continue')}
      </Typography>
      {threads.map((thread) => {
        const kind = String(thread.subject).split(':')[0]
        const label = t(`agent.subject.${kind}`, { defaultValue: '' })
        return (
          <Button
            key={thread.subject}
            variant='plain'
            color='neutral'
            size='sm'
            onClick={() => onContinue(thread)}
            sx={{ justifyContent: 'flex-start' }}
          >
            {`${thread.title || label} · ${label}`}
          </Button>
        )
      })}
    </Box>
  )
}

/**
 * `onChangeField`, when given, lets the learner correct the deck's field
 * (CHAT-009); `onClear` drops the subject for a general question (CHAT-010).
 */
export function SubjectHead({ subject, onChangeField = null, onClear = null }) {
  const { t } = useTranslation()
  if (!subject) return null
  if (subject.page !== 'study_session') return <ScreenSubjectHead subject={subject} onClear={onClear} />
  if (!subject.front) return null
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
        <ClearButton subject={subject} onClear={onClear} />
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
