import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Link, Stack, Typography } from '@mui/joy'
import useGoalCardModel from '../../hooks/useGoalCardModel'
import GoalNextAction from './goal/GoalNextAction'
import GoalOverflowMenu from './goal/GoalOverflowMenu'
import GoalProgressBar from './goal/GoalProgressBar'
import GoalStatePill from './goal/GoalStatePill'

/**
 * GoalRow — list layout, the same primitives as GoalCard in a single row
 * (DESIGN_GUIDELINES.md §6.2).
 *
 * Replaces the 302-line list row, of which ~467 lines were duplicated with the
 * grid card across the pair. Like GoalCard it contains no derivation, no
 * colour map, no Stepper and no Accordion.
 */
const GoalRow = ({
  goal,
  area,
  activities,
  quarterReports,
  planYear,
  busy = false,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleMilestone,
  onAddMilestone,
  onComplete
}) => {
  const { t } = useTranslation()
  const model = useGoalCardModel(goal, { area, activities, quarterReports, planYear })

  if (!model) return null

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        minHeight: 56,
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s ease',
        '&:hover': { bgcolor: 'background.level1' },
        '&:focus-within': { bgcolor: 'background.level1' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
      }}
    >
      <GoalStatePill state={model.state} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          overlay
          component='button'
          underline='none'
          aria-label={t('annualPlanning.goal.openDetail', { title: goal.title })}
          onClick={() => onOpenDetail?.(goal)}
          sx={{
            textAlign: 'left',
            minWidth: 0,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
          }}
        >
          <Typography level='title-sm' sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {goal.title}
          </Typography>
        </Link>
        <GoalNextAction
          next={model.next}
          deadline={model.deadline}
          state={model.state}
          hasMilestones={model.progress.total > 0}
          locked={model.isLocked}
          busy={busy}
          onToggleMilestone={(index) => onToggleMilestone?.(goal, index)}
          onAddMilestone={() => onAddMilestone?.(goal)}
          onComplete={() => onComplete?.(goal)}
        />
      </Box>

      {/* The bar is the first thing to go at narrow widths — the row keeps the
          state pill, the next action and the overflow menu, which carry the
          same facts in less space (existing behaviour, kept). */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, width: 120, flexShrink: 0 }}>
        <GoalProgressBar
          percent={model.progress.percent}
          state={model.state}
          completed={model.progress.completed}
          total={model.progress.total}
          isMilestoneBased={model.progress.isMilestoneBased}
          dense
        />
      </Box>

      {model.areaName && (
        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ display: { xs: 'none', lg: 'flex' }, minWidth: 0, flexShrink: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: model.areaColor, flexShrink: 0 }} />
          <Typography level='body-xs' sx={{ color: 'text.tertiary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {model.areaName}
          </Typography>
        </Stack>
      )}

      <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <GoalOverflowMenu goal={goal} locked={model.isLocked} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
      </Box>
    </Box>
  )
}

export default GoalRow
