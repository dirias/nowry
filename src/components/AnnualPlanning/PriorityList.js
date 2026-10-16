import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Stack, IconButton, Tooltip, Button, Chip } from '@mui/joy'
import {
  FlagOutlined as FlagOutlinedIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  DiamondOutlined as DiamondOutlinedIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { categoryDot } from '@nowry/core/tokens/colorSystem'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { touchTarget, identityTile } from '../Common/Form/formStyles'

/** An area saved without a colour (ADR-034 category family). */
const UNCOLOURED_AREA = categoryDot('iris')

/** One glyph per kind, the same two the calendar draws (EventTypeTile). */
const KIND_ICONS = { task: CheckCircleOutlinedIcon, milestone: DiamondOutlinedIcon }

/** The kind a flagged item is: a milestone says so; anything else is a task. */
const kindOf = (priority) => (priority?.linked_entity_type === 'milestone' ? 'milestone' : 'task')

/**
 * The row's identity tile (§15.11): 28px, the kind's glyph on it. A flagged
 * milestone carries its goal's area and takes that colour; a task has no area,
 * so its tile is a quiet ground with the glyph in ink.
 */
const PriorityTile = ({ priority, areas }) => {
  const kind = kindOf(priority)
  const Icon = KIND_ICONS[kind]
  const area = kind === 'milestone' ? areas.find((candidate) => (candidate._id || candidate.id) === priority.focus_area_id) : null
  const areaColor = kind === 'milestone' && priority.focus_area_id ? area?.color || UNCOLOURED_AREA : null
  return (
    <Box
      aria-hidden='true'
      data-testid='priority-tile'
      sx={{
        ...identityTile(areaColor ?? 'background.level2', 28),
        color: areaColor ? readableTextOn(areaColor) : 'text.tertiary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Icon sx={{ fontSize: 'md', color: 'inherit' }} />
    </Box>
  )
}

/**
 * The row's one quiet action: the flag off. Revealed on hover and focus, as a
 * row action is; always there on a touch device, which has no hover to reveal
 * anything (GeneratedCard's rule, keyed off the pointer, not the viewport).
 */
const unflagAction = {
  opacity: 0,
  transition: 'opacity var(--nowry-motion-quick) var(--nowry-motion-standard)',
  '@media (hover: none)': { opacity: 1 },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  '&:focus-visible': { opacity: 1 }
}

/**
 * PriorityList — the flagged items of a plan, one row each (ADR-046 §5).
 *
 * A priority is a flag on a task or a milestone, so a row is the item's
 * identity tile, its title with a meta line that reads the kind and the
 * deadline, the done tick, and "Remove from priorities". There is nothing to
 * edit, delete, pause or reorder: the item is edited where it lives, and the
 * flag is the whole of what this list owns.
 *
 * `filterable` opts a surface into the "active by default" behaviour: completed
 * rows are noise on overview surfaces, so they are hidden on first render behind
 * an Active/All segmented toggle (client-side only — the parent still fetches and
 * owns the full list). AllPrioritiesPage does NOT use it: that page is the
 * dedicated full view with explicit open / completed groups.
 */
const PriorityList = ({
  priorities = [],
  areas = [],
  onToggleComplete = null,
  onUnflag = null,
  emptyMessage = null,
  filterable = false,
  maxVisible = null
}) => {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const resolvedEmptyMessage = emptyMessage || t('annualPlanning.priority.noGoals')

  // "Active" is the one word both surfaces use for an open row: not completed.
  const activePriorities = useMemo(() => priorities.filter((p) => !p.is_completed), [priorities])
  const hiddenCount = priorities.length - activePriorities.length
  // Only surface the toggle when it would actually change something (§11 progressive disclosure).
  const showFilterToggle = filterable && hiddenCount > 0
  const filteredPriorities = filterable && !showAll ? activePriorities : priorities
  const visiblePriorities = maxVisible ? filteredPriorities.slice(0, maxVisible) : filteredPriorities

  const deadlineOf = (priority) =>
    priority.deadline ? new Date(priority.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null

  // Segmented Active/All control — sits above the list, right-aligned, so it
  // never competes with the section heading owned by the parent surface.
  const filterToggle = showFilterToggle && (
    <Box
      role='group'
      aria-label={t('annualPlanning.priority.filterLabel')}
      sx={{
        display: 'inline-flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 'xl',
        bgcolor: 'background.level1',
        alignSelf: 'flex-end'
      }}
    >
      {[
        { value: false, label: t('annualPlanning.priority.filterActive') },
        { value: true, label: t('annualPlanning.priority.filterAll', { count: priorities.length }) }
      ].map((option) => {
        const isSelected = showAll === option.value
        return (
          <Button
            key={String(option.value)}
            size='sm'
            variant='plain'
            color='neutral'
            aria-pressed={isSelected}
            onClick={() => setShowAll(option.value)}
            sx={{
              ...touchTarget,
              px: 1.5,
              borderRadius: 'xl',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'text.primary' : 'text.secondary',
              bgcolor: isSelected ? 'background.surface' : 'transparent',
              boxShadow: isSelected ? 'sm' : 'none',
              '&:hover': { bgcolor: isSelected ? 'background.surface' : 'background.level2' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </Box>
  )

  // True empty — the parent surface has no priorities at all.
  if (priorities.length === 0) {
    return (
      <Typography level='body-sm' textColor='text.tertiary' sx={{ fontStyle: 'italic' }}>
        {resolvedEmptyMessage}
      </Typography>
    )
  }

  // Filtered empty — priorities exist but every one of them is done.
  // Distinct copy from the true-empty case (§13.2) and points at the toggle.
  if (visiblePriorities.length === 0) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
        {filterToggle}
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <FlagOutlinedIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
          <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
            {t('annualPlanning.priority.noActivePriorities')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('annualPlanning.priority.activeEmptyBody')}
          </Typography>
          <Button
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => setShowAll(true)}
            sx={{ mt: 2, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
          >
            {t('annualPlanning.priority.showAll', { count: priorities.length })}
          </Button>
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
      {filterToggle}
      {visiblePriorities.map((priority) => {
        const isCompleted = !!priority.is_completed
        const completeLabel = isCompleted ? t('annualPlanning.priority.markIncomplete') : t('annualPlanning.priority.markComplete')
        const completeGlyph = isCompleted ? (
          <CheckCircleIcon sx={{ fontSize: 20, color: 'inherit' }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'inherit' }} />
        )
        const meta = [t(`annualPlanning.priority.kind.${kindOf(priority)}`), deadlineOf(priority)].filter(Boolean).join(' · ')

        return (
          <Box
            key={priority._id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
              px: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'transparent',
              opacity: isCompleted ? 0.6 : 1,
              transition: 'background-color 0.2s ease',
              '&:hover': { bgcolor: 'background.level1', opacity: 1 },
              '&:hover .priority-unflag, &:focus-within .priority-unflag': { opacity: 1 },
              '&:last-child': { borderBottom: 'none' }
            }}
          >
            {/* Leading slot: the completion control (ADR-015 point 1). The same
                two glyphs render static when the surface passes no handler, so
                the row's shape does not change between editable and read-only. */}
            {onToggleComplete ? (
              <Tooltip title={completeLabel} size='sm'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color={isCompleted ? 'success' : 'neutral'}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleComplete(priority)
                  }}
                  aria-label={completeLabel}
                  aria-pressed={isCompleted}
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 'sm',
                    flexShrink: 0,
                    color: isCompleted ? 'success.plainColor' : 'text.tertiary',
                    '&:hover': { color: 'success.plainColor', bgcolor: 'success.softBg' }
                  }}
                >
                  {completeGlyph}
                </IconButton>
              </Tooltip>
            ) : (
              <Box
                aria-hidden
                sx={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isCompleted ? 'success.plainColor' : 'text.tertiary'
                }}
              >
                {completeGlyph}
              </Box>
            )}

            <PriorityTile priority={priority} areas={areas} />

            {/* Title with its meta line: the kind, and the deadline when there is one */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                level='body-md'
                fontWeight={600}
                sx={{
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? 'text.tertiary' : 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {priority.title}
              </Typography>
              <Typography
                level='body-xs'
                textColor='text.tertiary'
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {meta}
              </Typography>
            </Box>

            {/* Completed chip — visible on all breakpoints (UAT gap-01): on the
                flat Overview/FocusArea lists this chip plus the icon shape are
                the only state cues. */}
            {isCompleted && (
              <Chip size='sm' variant='soft' color='success' sx={{ flexShrink: 0 }}>
                {t('annualPlanning.priority.done')}
              </Chip>
            )}

            {/* The flag off. The item stays where it lives; it just stops being a priority. */}
            {onUnflag && (
              <Tooltip title={t('annualPlanning.priority.unflag')} size='sm'>
                <IconButton
                  className='priority-unflag'
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('annualPlanning.priority.unflag')}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onUnflag(priority)
                  }}
                  sx={{
                    ...unflagAction,
                    flexShrink: 0,
                    color: 'text.tertiary',
                    '&:hover': { color: 'text.primary', bgcolor: 'background.level2' }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 'md' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}

export default PriorityList
