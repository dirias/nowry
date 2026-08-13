import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Skeleton, Stack } from '@mui/joy'

/**
 * GoalCardSkeleton — a placeholder shaped like the card it stands in for,
 * rendered inside the real grid. Not a region-level <Skeleton loading> wrapper:
 * gating the whole grid hides the layout the user is waiting to see, and the
 * house rule forbids a full-page loading gate.
 */
const GoalCardSkeleton = () => {
  const { t } = useTranslation()

  return (
    <Card
      variant='outlined'
      aria-busy='true'
      aria-label={t('annualPlanning.goals.loadingAria')}
      sx={{ height: '100%', p: { xs: 2, md: 3 }, gap: 1.5, bgcolor: 'background.surface', borderColor: 'divider' }}
    >
      <Skeleton variant='text' level='title-md' width='80%' />
      <Skeleton variant='text' level='body-sm' width='60%' />
      <Skeleton variant='rectangular' height={6} sx={{ borderRadius: 'sm' }} />
      <Stack direction='row' spacing={1} alignItems='center'>
        <Skeleton variant='rectangular' width={72} height={20} sx={{ borderRadius: 'sm' }} />
        <Skeleton variant='text' level='body-xs' width='30%' />
      </Stack>
    </Card>
  )
}

export default GoalCardSkeleton
