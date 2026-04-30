/**
 * QuizModeHeader
 *
 * Replaces the normal pet panel header during an active quiz session.
 * Shows deck name, progress bar, card counter, and an exit button.
 *
 * Props:
 *   deckName      {string}   - Name of the deck being quizzed
 *   currentIndex  {number}   - 1-based index of the current card
 *   totalCards    {number}   - Total cards in the session
 *   onExit        {function} - Called when the user taps the exit (×) button
 */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/joy'
import { CloseRounded } from '@mui/icons-material'

const QuizModeHeader = ({ deckName, currentIndex, totalCards, onExit }) => {
  const { t } = useTranslation()

  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: 'primary.softBg',
        borderBottom: '1px solid',
        borderColor: 'primary.outlinedBorder'
      }}
    >
      <Stack direction='row' alignItems='center' gap={1.5}>
        {/* Label + deck name */}
        <Typography
          level='body-sm'
          sx={{ color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}
        >
          {t('quiz.mode_label')} · {deckName}
        </Typography>

        {/* Progress bar */}
        <LinearProgress determinate value={progress} sx={{ flex: 1, borderRadius: 'xl' }} />

        {/* Card counter */}
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
          {currentIndex}/{totalCards}
        </Typography>

        {/* Exit button */}
        <Tooltip title={t('quiz.exit_aria')} size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={onExit}
            aria-label={t('quiz.exit_aria')}
            sx={{
              flexShrink: 0,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.outlinedBorder',
                outlineOffset: '2px'
              }
            }}
          >
            <CloseRounded sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}

export default QuizModeHeader
