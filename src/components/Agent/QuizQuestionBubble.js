/**
 * QuizQuestionBubble
 *
 * Renders the AI's quiz question inside the chat message list.
 * Displays a type badge chip + a styled question card with a left accent border.
 *
 * States:
 *   Loading — Skeleton placeholder box
 *   Success — Chip badge + styled Sheet with question text
 *   Error   — Typography in danger color (handled upstream; this component receives valid data)
 *   Empty   — N/A (questions always have text when rendered)
 *
 * Props:
 *   questionType  {string}  - e.g. 'definition' | 'contextual' | 'comparison' | 'fill_in' | 'open_recall'
 *   questionText  {string}  - The question to display
 *   loading       {boolean} - Show skeleton when true
 */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Chip, Sheet, Skeleton, Typography } from '@mui/joy'
import FuriganaText from './FuriganaText'

const QuizQuestionBubble = ({ questionType, questionText, loading }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: '85%' }}>
        <Skeleton loading variant='rectangular' sx={{ height: 64, borderRadius: 'md', width: '100%' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: '85%' }}>
      {/* Question type badge */}
      <Chip size='sm' variant='soft' color='primary' sx={{ alignSelf: 'flex-start' }}>
        {t(`quiz.type.${questionType}`, questionType)}
      </Chip>

      {/* Question card with left accent border */}
      <Sheet
        sx={{
          bgcolor: 'primary.softBg',
          border: '1px solid',
          borderColor: 'primary.outlinedBorder',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.solidBg',
          borderRadius: 'md',
          px: 2,
          py: 1.5
        }}
      >
        <Typography level='body-md' sx={{ color: 'text.primary' }} component='div'>
          <FuriganaText>{questionText}</FuriganaText>
        </Typography>
      </Sheet>
    </Box>
  )
}

export default QuizQuestionBubble
