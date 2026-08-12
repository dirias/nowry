import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, LinearProgress, Button, Stack, Sheet, Skeleton } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { Target, TrendingUp } from 'lucide-react'
import { annualPlanningService } from '../../../api/services'
import { GOAL_STATE_COLOR, getGoalProgress, getGoalState } from '../../AnnualPlanning/goalDerivation'

const SKELETON_ROWS = 4

/**
 * AnnualGoalsCard — the Home surface's view of the top annual goals.
 *
 * Repointed at the shared derivation core (ADR-003 / FE-7). It previously
 * computed progress from `goal.activities[].completed` — a field that exists on
 * neither the Goal nor the Activity model — so it returned 0 for every goal and
 * painted every one `danger`, contradicting the Goals tab. Progress and colour
 * now come from exactly the same functions the Goals tab uses, so the two
 * surfaces cannot disagree.
 */
const AnnualGoalsCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await annualPlanningService.getGoals()

      // Lowest progress first: the goals needing attention lead.
      const sortedGoals = data
        .map((goal) => ({ goal, progress: getGoalProgress(goal), state: getGoalState(goal) }))
        .sort((a, b) => a.progress.percent - b.progress.percent)
        .slice(0, 4)

      setGoals(sortedGoals)
    } catch (error) {
      // A fetch failure lands on the same empty state as "no goals yet" rather
      // than a console-only dead end: the card still offers a way forward.
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const renderRow = (key, content) => <Box key={key}>{content}</Box>

  return (
    <Sheet
      variant='outlined'
      sx={{
        p: 3,
        borderRadius: 'lg',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: 'md', transform: 'translateY(-2px)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Target size={24} strokeWidth={2} />
        <Typography level='title-lg'>{t('dashboard.annualGoals.title')}</Typography>
      </Box>

      {/* Loading keeps the card's real structure on screen — per-row Skeletons,
          never a spinner standing in for the whole card. */}
      {loading ? (
        <Stack spacing={2.5} sx={{ flex: 1 }} aria-busy='true' aria-label={t('dashboard.annualGoals.loadingAria')}>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) =>
            renderRow(
              index,
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Skeleton variant='text' level='body-sm' width='60%' />
                  <Skeleton variant='text' level='body-xs' width='2.5rem' />
                </Box>
                <Skeleton variant='rectangular' height={6} sx={{ borderRadius: 'sm' }} />
              </>
            )
          )}
        </Stack>
      ) : goals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
            {t('dashboard.annualGoals.noGoals')}
          </Typography>
          <Button
            size='sm'
            variant='soft'
            onClick={() => navigate('/annual-planning')}
            sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
          >
            {t('dashboard.annualGoals.createGoal')}
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={2.5} sx={{ flex: 1 }}>
            {goals.map(({ goal, progress, state }) => (
              <Box key={goal._id || goal.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  {/* goal.title, not goal.category — the Goal model has no
                      `category` field, so that rendered nothing. */}
                  <Typography
                    level='body-sm'
                    sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {goal.title}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', flexShrink: 0, ml: 1 }}>
                    {t('annualPlanning.goal.percentComplete', { percent: progress.percent })}
                  </Typography>
                </Box>
                <LinearProgress
                  determinate
                  value={progress.percent}
                  variant='soft'
                  color={GOAL_STATE_COLOR[state]}
                  thickness={6}
                  aria-label={t('annualPlanning.goal.progress')}
                  aria-valuetext={
                    progress.isMilestoneBased
                      ? t('annualPlanning.goal.milestoneCount', {
                          completed: progress.completed,
                          total: progress.total,
                          count: progress.total
                        })
                      : t('annualPlanning.goal.percentComplete', { percent: progress.percent })
                  }
                  sx={{ bgcolor: 'background.level2', borderRadius: 'sm' }}
                />
              </Box>
            ))}
          </Stack>

          <Button
            variant='plain'
            endDecorator={<TrendingUp size={16} />}
            onClick={() => navigate('/annual-planning')}
            sx={{
              mt: 3,
              justifyContent: 'center',
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
            }}
          >
            {t('dashboard.annualGoals.viewFullPlan')}
          </Button>
        </>
      )}
    </Sheet>
  )
}

export default AnnualGoalsCard
