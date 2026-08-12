import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Card, Link, Stack, Typography } from '@mui/joy'
import useGoalCardModel from '../../hooks/useGoalCardModel'
import GoalNextAction from './goal/GoalNextAction'
import GoalOverflowMenu from './goal/GoalOverflowMenu'
import GoalProgressBar from './goal/GoalProgressBar'
import GoalStatePill from './goal/GoalStatePill'

/**
 * GoalCard — grid layout, one of two thin layouts over one logic core.
 *
 * Replaces GoalCardGrid.js (454 lines). It owns no derivation, no colour map,
 * no Stepper and no Accordion: everything it renders comes from
 * useGoalCardModel or a shared primitive. That constraint is what keeps the
 * card and the row from drifting apart again (ADR-003 §6).
 *
 * Hierarchy, top to bottom: title, next action, progress, count, state pill,
 * focus-area dot. The title is first because it is what users scan for; it used
 * to sit fourth, below two chips.
 *
 * No fixed height. The old `height: { xs: 220, md: 280 }` reserved room for two
 * accordions that were collapsed almost always, which is why cards read as
 * mostly empty space.
 */
const GoalCard = ({
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
    <Card
      variant='outlined'
      sx={{
        height: '100%',
        p: { xs: 2, md: 3 },
        gap: 1.5,
        bgcolor: 'background.surface',
        borderColor: 'divider',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: 'primary.outlinedBorder',
          boxShadow: 'md',
          transform: 'translateY(-4px)'
        },
        // Frames the card whenever any child inside it takes focus, so a
        // keyboard user can see which goal they are on.
        '&:focus-within': { borderColor: 'primary.outlinedBorder' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
      }}
    >
      {/* Title + overflow. The Link's overlay makes the whole card one tab stop
          that opens the drawer; the next-action control and the overflow button
          sit above it and stay independently focusable. */}
      <Stack direction='row' spacing={1} alignItems='flex-start' justifyContent='space-between'>
        <Link
          overlay
          component='button'
          underline='none'
          // Not an href: the drawer is a panel, not a route. `component='button'`
          // keeps real, single-tab-stop interactive semantics.
          aria-label={t('annualPlanning.goal.openDetail', { title: goal.title })}
          onClick={() => onOpenDetail?.(goal)}
          sx={{
            textAlign: 'left',
            minWidth: 0,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
          }}
        >
          <Typography
            level='title-md'
            sx={{
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4
            }}
          >
            {goal.title}
          </Typography>
        </Link>
        <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <GoalOverflowMenu goal={goal} locked={model.isLocked} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        </Box>
      </Stack>

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

      <GoalProgressBar
        percent={model.progress.percent}
        state={model.state}
        completed={model.progress.completed}
        total={model.progress.total}
        isMilestoneBased={model.progress.isMilestoneBased}
      />

      <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between' sx={{ mt: 'auto' }}>
        <GoalStatePill state={model.state} />
        {model.areaName && (
          <Stack direction='row' spacing={0.75} alignItems='center' sx={{ minWidth: 0 }}>
            {/* The only place user-chosen colour appears on a goal. It used to
                paint a 4px top border and the progress fill, which is how an
                86%-complete On Track goal rendered red. */}
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: model.areaColor, flexShrink: 0 }} />
            <Typography level='body-xs' sx={{ color: 'text.tertiary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {model.areaName}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

export default GoalCard
