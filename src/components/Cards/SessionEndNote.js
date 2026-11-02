/**
 * The companion's word on a finished session, inside the object (ADR-022,
 * ADR-060 §4). Under the keys, never over them: the floating bubble stays
 * down for this message, and what it has to say sits where the rows it read
 * are. One line of prose beside the companion's mark, and a way to put it away.
 */
import React from 'react'
import { Box, IconButton, Typography } from '@mui/joy'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { useTranslation } from 'react-i18next'
import { usePet } from '@nowry/core/context/AgentContext'
import { CompanionMark } from '../Agent/CompanionMark'

export default function SessionEndNote({ message, onDismiss }) {
  const { t } = useTranslation()
  const { stage } = usePet()
  if (!message) return null
  return (
    <Box
      role='note'
      data-testid='session-end-note'
      sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: 'background.level1', borderRadius: 'md', p: 1.5 }}
    >
      <Box sx={{ color: 'primary.plainColor', display: 'flex', flexShrink: 0, pt: 0.25 }}>
        <CompanionMark stage={stage} size={24} />
      </Box>
      <Typography level='body-sm' sx={{ flex: 1, minWidth: 0 }}>
        {message}
      </Typography>
      {onDismiss && (
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          onClick={onDismiss}
          aria-label={t('agent.companion.dismiss')}
          sx={{ m: -0.5 }}
        >
          <CloseRounded fontSize='small' />
        </IconButton>
      )}
    </Box>
  )
}
