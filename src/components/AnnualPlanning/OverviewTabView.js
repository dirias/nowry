import React from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Button, Grid, Stack, Skeleton } from '@mui/joy'
import { ArrowForward as ArrowForwardIcon, Flag as FlagIcon } from '@mui/icons-material'
import PriorityList from './PriorityList'
import FocusAreaCard from './FocusAreaCard'
import EmptyState from './EmptyState'
import { withQuarter } from './AnnualPlanningTabBar'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

/**
 * OverviewTabView — the Annual Planning overview tab.
 *
 * Dashboard, not a management surface: it shows focus areas and a read-only recall
 * list of yearly commitments. Priorities CRUD (add, edit, delete, reorder, activate)
 * lives on the Priorities tab, so the two surfaces have genuinely different jobs
 * instead of being the same list rendered twice.
 *
 * Reads all plan data from the layout's outlet context — never calls useAnnualPlan.
 */
const OverviewTabView = () => {
  const { t } = useTranslation()
  const { areas, priorities, quarterGoals, quarter, loading, error } = useOutletContext()

  const prioritiesHref = withQuarter('/annual-planning/priorities', quarter)

  // The layout already resolved the quarter scope (snapshot-aware for closed
  // quarters) into quarterGoals — reusing it keeps area progress and the header
  // percentage derived from exactly the same goal set.
  const areaGoals = (area) => quarterGoals.filter((g) => g.focus_area_id === area._id || g.focus_area_id?._id === area._id)

  const getAreaProgress = (area, goalsForArea) => {
    if (quarter === 'All') return area.progress || 0
    if (goalsForArea.length === 0) return 0
    let sum = 0
    goalsForArea.forEach((g) => {
      if (g.milestones?.length > 0) {
        const done = g.milestones.filter((m) => m.completed).length
        sum += (done / g.milestones.length) * 100
      } else {
        sum += g.progress || 0
      }
    })
    return Math.round(sum / goalsForArea.length)
  }

  // The layout renders the error + retry block above the outlet; rendering the
  // body's own stale/empty content underneath it would just add noise.
  if (error && !loading) return null

  return (
    <Box>
      <Typography level='title-md' sx={{ mb: 1.5 }}>
        {t('annualPlanning.overview.focusAreasTitle')}
      </Typography>

      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: { xs: 3, md: 4 } }}>
        {loading
          ? [1, 2, 3].map((i) => (
              <Grid key={i} xs={12} sm={6} md={4}>
                {/* Height matches the real card so nothing shifts when data lands */}
                <Skeleton variant='rectangular' height={132} sx={{ borderRadius: 'lg' }} />
              </Grid>
            ))
          : areas.map((area, index) => {
              const goalsForArea = areaGoals(area)
              return (
                <Grid key={area._id || index} xs={12} sm={6} md={4}>
                  <FocusAreaCard
                    area={area}
                    progress={getAreaProgress(area, goalsForArea)}
                    goalCount={goalsForArea.length}
                    to={withQuarter(`/annual-planning/area/${area._id}`, quarter)}
                  />
                </Grid>
              )
            })}
      </Grid>

      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ mb: 1.5 }}>
        <Typography level='title-md'>{t('annualPlanning.overview.prioritiesTitle')}</Typography>
        {/* Always visible, not gated on a count — this link is how the user learns
            the Priorities tab is where commitments are actually managed. */}
        <Button
          component={Link}
          to={prioritiesHref}
          variant='plain'
          size='sm'
          color='neutral'
          endDecorator={<ArrowForwardIcon />}
          sx={focusRing}
        >
          {t('annualPlanning.overview.prioritiesManage')}
        </Button>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          ))}
        </Stack>
      ) : priorities.length === 0 ? (
        <EmptyState
          py={6}
          icon={<FlagIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
          title={t('annualPlanning.overview.prioritiesEmptyTitle')}
          body={t('annualPlanning.overview.prioritiesEmptyBody')}
          bodyMaxWidth={420}
          action={
            <Button component={Link} to={prioritiesHref} size='sm' sx={{ mt: 2, ...focusRing }}>
              {t('annualPlanning.overview.prioritiesEmptyCta')}
            </Button>
          }
        />
      ) : (
        /* Read-only preview: no edit, no delete, no activate toggle, no drag.
           Active-only by default — done/inactive rows are noise on a dashboard. */
        <PriorityList
          priorities={priorities}
          filterable
          maxVisible={3}
          showEditButton={false}
          showDeleteButton={false}
          onToggleActive={null}
        />
      )}
    </Box>
  )
}

export default OverviewTabView
