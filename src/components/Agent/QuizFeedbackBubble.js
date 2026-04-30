/**
 * QuizFeedbackBubble
 *
 * Renders the AI's evaluation feedback after the user submits an answer.
 * Color-coded by evaluation result: correct / partial / incorrect.
 *
 * Props:
 *   evaluation       {'correct'|'partial'|'incorrect'} - Result of the answer
 *   feedbackMessage  {string}  - AI-generated feedback text
 *   revealedAnswer   {string|null} - The correct answer (shown when incorrect/partial)
 *   hint             {string|null} - Optional hint text
 *   onNext           {function} - Called when user taps next / see results
 *   isLastCard       {boolean} - Whether this is the final card in the session
 */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Sheet, Stack, Tooltip, Typography } from '@mui/joy'
import { CheckCircleRounded, WarningRounded, CancelRounded } from '@mui/icons-material'
import FuriganaText from './FuriganaText'

const EVAL_CONFIG = {
  correct: {
    color: 'success',
    Icon: CheckCircleRounded,
    bgToken: 'success.softBg',
    borderToken: 'success.outlinedBorder'
  },
  partial: {
    color: 'warning',
    Icon: WarningRounded,
    bgToken: 'warning.softBg',
    borderToken: 'warning.outlinedBorder'
  },
  incorrect: {
    color: 'danger',
    Icon: CancelRounded,
    bgToken: 'danger.softBg',
    borderToken: 'danger.outlinedBorder'
  }
}

const QuizFeedbackBubble = ({ evaluation, feedbackMessage, revealedAnswer, hint, onNext, isLastCard }) => {
  const { t } = useTranslation()

  const config = EVAL_CONFIG[evaluation] ?? EVAL_CONFIG.incorrect
  const { color, Icon, bgToken, borderToken } = config

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: '92%' }}>
      <Sheet
        sx={{
          bgcolor: bgToken,
          border: '1px solid',
          borderColor: borderToken,
          borderRadius: 'md',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Result icon + feedback message */}
        <Stack direction='row' gap={1} alignItems='flex-start'>
          <Icon sx={{ fontSize: 18, color: `${color}.plainColor`, flexShrink: 0, mt: 0.25 }} />
          <Typography level='body-sm' sx={{ color: 'text.primary' }} component='div'>
            <FuriganaText>{feedbackMessage}</FuriganaText>
          </Typography>
        </Stack>

        {/* Hint (shown when provided) */}
        {hint && (
          <Typography level='body-sm' sx={{ color: 'text.secondary', fontStyle: 'italic', pl: 3 }} component='div'>
            <FuriganaText>{`${t('quiz.hint_label')}: ${hint}`}</FuriganaText>
          </Typography>
        )}

        {/* Revealed answer (shown when incorrect or partial) */}
        {revealedAnswer && (
          <Sheet
            sx={{
              bgcolor: 'background.level1',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 'sm',
              px: 1.5,
              py: 1,
              ml: 3
            }}
          >
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.25 }}>
              {t('quiz.answer_label')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.primary' }} component='div'>
              <FuriganaText>{revealedAnswer}</FuriganaText>
            </Typography>
          </Sheet>
        )}

        {/* Next / See results button */}
        <Tooltip title={isLastCard ? t('quiz.see_results') : t('quiz.next_card_aria')} size='sm'>
          <Button
            size='sm'
            variant='soft'
            color={color}
            onClick={onNext}
            aria-label={isLastCard ? t('quiz.see_results') : t('quiz.next_card_aria')}
            sx={{
              alignSelf: 'flex-end',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: `${color}.outlinedBorder`,
                outlineOffset: '2px'
              }
            }}
          >
            {isLastCard ? t('quiz.see_results') : t('quiz.next_card')}
          </Button>
        </Tooltip>
      </Sheet>
    </Box>
  )
}

export default QuizFeedbackBubble
