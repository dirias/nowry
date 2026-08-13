import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Skeleton } from '@mui/joy'

/**
 * GoalRowSkeleton — list-view counterpart to GoalCardSkeleton, matching
 * GoalRow's single-row geometry so the list does not reflow on load.
 */
const GoalRowSkeleton = () => {
  const { t } = useTranslation()

  return (
    <Box
      aria-busy='true'
      aria-label={t('annualPlanning.goals.loadingAria')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        minHeight: 56,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Skeleton variant='rectangular' width={72} height={20} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
      <Skeleton variant='text' level='title-sm' sx={{ flex: 1 }} />
      <Skeleton variant='rectangular' width={120} height={6} sx={{ borderRadius: 'sm', display: { xs: 'none', md: 'block' } }} />
      <Skeleton variant='circular' width={28} height={28} sx={{ flexShrink: 0 }} />
    </Box>
  )
}

export default GoalRowSkeleton
