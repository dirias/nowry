import React, { useMemo } from 'react'
import { Box, Typography, Tooltip, Skeleton } from '@mui/joy'
import { Link as RouterLink } from 'react-router-dom'
import useAnnualPlan from '@nowry/core/hooks/useAnnualPlan'
import { watchedPriorities, deadlineReadout } from '@nowry/core/domain/priorityWatch'
import { useTranslation } from 'react-i18next'
import { categoryDot } from '@nowry/core/tokens/colorSystem'

/** An area saved without a colour (ADR-034 category family). */
const UNCOLOURED_AREA = categoryDot('iris')

/** Where a flagged item lives: a milestone on its goal's area page, a task on the Priorities tab. */
const priorityHref = (priority) =>
  priority.linked_entity_type === 'milestone' && priority.focus_area_id
    ? `/annual-planning/area/${priority.focus_area_id}`
    : '/annual-planning/priorities'

/**
 * FocusBar — the strip on Home that shows the areas and the priorities at a glance.
 *
 * The annual plan is edited in Planning and WATCHED here. Since ADR-046 §5 a
 * priority is a flag on a task or a milestone, so flagging is the choice: the
 * band shows the first four flagged open items, deadline first
 * (`watchedPriorities`), and offers no picker. With areas but nothing flagged
 * it says where a priority comes from, in a hint and not a call to action.
 */
const FocusBar = () => {
  const { t } = useTranslation()
  const { focusAreas, goals, priorities, loading } = useAnnualPlan()

  const watched = useMemo(() => watchedPriorities(priorities, goals), [priorities, goals])

  const renderPriorityItem = (priority) => {
    const hasDeadline = Boolean(priority.deadline)
    const daysUntil = hasDeadline ? Math.ceil((new Date(priority.deadline) - new Date()) / 86400000) : null
    const isOverdue = hasDeadline && daysUntil < 0
    const isUrgent = hasDeadline && daysUntil >= 0 && daysUntil <= 3
    const readout = deadlineReadout(priority)
    const deadlineText = readout ? (readout.key ? t(readout.key, readout.params) : new Date(priority.deadline).toLocaleDateString()) : null
    const tooltipText = `${priority.title} - ${deadlineText ?? t('focusBar.noDeadline')}`

    return (
      <Tooltip key={priority._id || priority.id} title={tooltipText} size='sm'>
        <Box
          component={RouterLink}
          to={priorityHref(priority)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 0.75, md: 1 },
            py: 0.5,
            borderRadius: 'sm',
            border: '1px solid',
            borderColor: isOverdue ? 'danger.outlinedBorder' : isUrgent ? 'warning.outlinedBorder' : 'divider',
            bgcolor: 'background.level1',
            textDecoration: 'none',
            transition: 'all 0.2s',
            minWidth: 0,
            maxWidth: { xs: 120, sm: 160, md: 200 },
            '&:hover': {
              bgcolor: isOverdue ? 'danger.softBg' : isUrgent ? 'warning.softBg' : 'background.level2',
              borderColor: isOverdue ? 'danger.solidBg' : isUrgent ? 'warning.solidBg' : 'neutral.outlinedHoverBorder'
            }
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              flex: 1,
              minWidth: 0
            }}
          >
            {priority.title}
          </Typography>
          {hasDeadline && (
            <Typography
              level='body-xs'
              sx={{
                color: isOverdue ? 'danger.plainColor' : isUrgent ? 'warning.plainColor' : 'text.tertiary',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {isOverdue ? '!' : `${daysUntil}d`}
            </Typography>
          )}
        </Box>
      </Tooltip>
    )
  }

  // §7: Show Skeleton placeholder during load so layout stays stable (no pop-in shift)
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          px: 1.5,
          py: 0.75,
          borderRadius: 'sm',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          height: 38 // Matches the real bar's height exactly
        }}
      >
        <Skeleton variant='rectangular' width={64} height={26} sx={{ borderRadius: 'sm' }} />
        <Skeleton variant='rectangular' width={64} height={26} sx={{ borderRadius: 'sm' }} />
        <Skeleton variant='rectangular' width={64} height={26} sx={{ borderRadius: 'sm' }} />
        <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5, display: { xs: 'none', md: 'block' } }} />
        <Skeleton variant='rectangular' width={120} height={26} sx={{ borderRadius: 'sm' }} />
        <Skeleton variant='rectangular' width={120} height={26} sx={{ borderRadius: 'sm' }} />
      </Box>
    )
  }

  // Don't render the bar if there's genuinely no data to show
  if (focusAreas.length === 0 && watched.length === 0) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 1.5 },
        mb: 2,
        px: { xs: 1, md: 1.5 },
        py: 0.75,
        borderRadius: 'sm',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        flexWrap: 'wrap'
      }}
    >
      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 } }}>
          {focusAreas.slice(0, 3).map((area) => {
            const progress = area.progress || 0
            const hexColor = area.color || UNCOLOURED_AREA

            return (
              <Tooltip key={area._id || area.id} title={`${area.name}: ${progress}%`} size='sm'>
                <Box
                  component={RouterLink}
                  to={`/annual-planning/area/${area._id || area.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: { xs: 0.75, md: 1 },
                    py: 0.5,
                    borderRadius: 'sm',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.level1',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: hexColor,
                      bgcolor: `${hexColor}10`
                    }
                  }}
                >
                  <Typography sx={{ fontSize: 'sm', lineHeight: 1 }}>{area.icon || '🎯'}</Typography>
                  <Typography
                    level='body-xs'
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary'
                    }}
                  >
                    {progress}%
                  </Typography>
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      )}

      {/* Divider - Desktop only */}
      {focusAreas.length > 0 && watched.length > 0 && (
        <Box
          sx={{
            width: '1px',
            height: 20,
            bgcolor: 'divider',
            flexShrink: 0,
            display: { xs: 'none', md: 'block' }
          }}
        />
      )}

      {/* Priorities - Responsive: 4 on desktop, 2 on mobile */}
      {watched.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 }, flex: 1, minWidth: 0 }}>
          {watched.map((priority, index) => {
            // Hide 3rd and 4th priorities on mobile
            if (index >= 2) {
              return (
                <Box key={priority._id || priority.id} sx={{ display: { xs: 'none', md: 'flex' }, minWidth: 0 }}>
                  {renderPriorityItem(priority)}
                </Box>
              )
            }
            return renderPriorityItem(priority)
          })}
        </Box>
      )}

      {/* Areas but nothing flagged: a hint about where a priority comes from, not a call to action */}
      {watched.length === 0 && focusAreas.length > 0 && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flex: 1 }}>
          {t('focusBar.flagHint')}
        </Typography>
      )}
    </Box>
  )
}

export default FocusBar
