/**
 * QuizSummaryCard
 *
 * Displayed at the end of a quiz session, showing score and weak card terms.
 * Offers "Review Weak Cards" (navigates to /study) and "Done" (closes quiz).
 *
 * Props:
 *   summary        {{ totalCards: number, correct: number, partial: number, incorrect: number, scorePercentage: number, weakCardTerms: string[] }}
 *   onReviewWeak   {function} - Navigate to /study with weak cards context
 *   onClose        {function} - Close the quiz summary and return to chat
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Sheet, Stack, Tooltip, Typography } from '@mui/joy'

const QuizSummaryCard = ({ summary, onReviewWeak, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { total_cards: totalCards, correct, score_percentage: scorePercentage, weak_card_terms: weakCardTerms = [], source } = summary ?? {}
  const isAiQuiz = source === 'ai_quiz'
  const hasWeakCards = weakCardTerms.length > 0

  return (
    <Box sx={{ maxWidth: '95%' }}>
      <Sheet
        sx={{
          bgcolor: 'background.level1',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'md',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5
        }}
      >
        {/* Title */}
        <Typography level='title-md' sx={{ color: 'text.primary' }}>
          {t('quiz.summary_title')}
        </Typography>

        {/* Score */}
        <Typography level='h3' sx={{ color: 'primary.plainColor', lineHeight: 1 }}>
          {correct}/{totalCards}
        </Typography>

        {/* Weak cards section */}
        {hasWeakCards && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('quiz.weak_cards_label')}
            </Typography>
            <Stack direction='row' flexWrap='wrap' gap={0.5}>
              {weakCardTerms.map((term, i) => (
                <Chip key={i} size='sm' variant='soft' color='danger'>
                  {term}
                </Chip>
              ))}
            </Stack>
          </Box>
        )}

        {/* Actions */}
        <Stack direction='row' justifyContent='flex-end' gap={1} sx={{ mt: 0.5 }} flexWrap='wrap'>
          {hasWeakCards && (
            <Tooltip title={t('quiz.review_weak_aria')} size='sm'>
              <Button
                size='sm'
                variant='outlined'
                color='danger'
                onClick={onReviewWeak}
                aria-label={t('quiz.review_weak_aria')}
                sx={{
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'danger.outlinedBorder', outlineOffset: '2px' }
                }}
              >
                {t('quiz.review_weak')}
              </Button>
            </Tooltip>
          )}
          <Tooltip title={t('quiz.summary.view_history')} size='sm'>
            <Button
              size='sm'
              variant='plain'
              color='primary'
              onClick={() => {
                onClose()
                navigate('/study/history')
              }}
              aria-label={t('quiz.summary.view_history')}
              sx={{
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
              }}
            >
              {t('quiz.summary.view_history')}
            </Button>
          </Tooltip>
          <Tooltip title={t('quiz.done_aria')} size='sm'>
            <Button
              size='sm'
              variant='solid'
              color='primary'
              onClick={onClose}
              aria-label={t('quiz.done_aria')}
              sx={{
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
              }}
            >
              {t('quiz.done')}
            </Button>
          </Tooltip>
        </Stack>
      </Sheet>
    </Box>
  )
}

export default QuizSummaryCard
