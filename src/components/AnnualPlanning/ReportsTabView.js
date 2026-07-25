import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Container, Skeleton, Stack, Typography, Button } from '@mui/joy'
import useAnnualPlan from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import AnnualPlanningTabBar from './AnnualPlanningTabBar'
import QuarterReportsView from './QuarterReportsView'

const ReportsTabView = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const year = new Date().getFullYear()
  const { plan, areas, loading, error, reload } = useAnnualPlan(year, user)

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      <AnnualPlanningTabBar />

      {/* Error state — previously missing entirely, so any fetch failure left this
          tab silently blank (Rule 2 fix: CLAUDE.md mandates Loading/Success/Error/Empty
          for every feature component; matches GoalsTabView's existing pattern). */}
      {error && !loading && (
        <Stack spacing={1} sx={{ mt: 2, alignItems: 'flex-start' }}>
          <Typography level='body-sm' color='danger'>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button size='sm' variant='soft' onClick={reload}>
            {t('common.retry')}
          </Button>
        </Stack>
      )}

      {!error &&
        (loading ? (
          <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'sm', mt: 2 }} />
        ) : plan?._id ? (
          <QuarterReportsView planId={plan._id} focusAreas={areas} />
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography level='h4' sx={{ fontWeight: 700, color: 'text.primary' }}>
              {t('annualPlanning.tabs.reportsEmptyTitle')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('annualPlanning.tabs.reportsEmptyBody')}
            </Typography>
          </Box>
        ))}
    </Container>
  )
}

export default ReportsTabView
