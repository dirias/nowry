import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Tooltip, Typography } from '@mui/joy'
import { CalendarToday as CalendarTodayIcon, Close as CloseIcon } from '@mui/icons-material'
import { focusRing } from './goalStyles'

/**
 * MilestoneDueDateBadge — one milestone due date, read-only or editable.
 *
 * Consolidates two implementations of the same idea: the drawer stepper's
 * read-only badge and the goal form's hand-rolled editable one. Keeping them
 * apart had let them drift — the form's copy never coloured an overdue date,
 * shipped two hardcoded English tooltips and a `🗓` emoji, and was a
 * `<Box onClick>` with no role, no tabIndex and no accessible name, so it was
 * unreachable by keyboard. The editable variant here is a real button.
 *
 * `overdue` is supplied by the caller from `goalDerivation.isMilestoneOverdue`
 * — the feature's single date comparison. This component does no date math of
 * its own beyond formatting.
 *
 * @param {string} dueDate      ISO yyyy-mm-dd, or '' / null when unset
 * @param {boolean} overdue     from isMilestoneOverdue — never recomputed here
 * @param {boolean} interactive false renders a static badge; true renders a
 *                              picker button plus a clear control
 * @param {Function} onPick     (nextIsoDate: string) => void
 * @param {Function} onClear    () => void
 * @param {string} milestoneTitle interpolated into both aria-labels
 */
const MilestoneDueDateBadge = ({ dueDate, overdue = false, interactive = false, onPick, onClear, milestoneTitle = '' }) => {
  const { t, i18n } = useTranslation()
  const dateInputRef = useRef(null)

  // Format against the app's active language, not the browser's:
  // `undefined` renders "30 jun." inside an otherwise-English drawer
  // whenever the two disagree.
  const formatted = dueDate
    ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric'
      })
    : ''

  const toneSx = {
    bgcolor: overdue ? 'danger.softBg' : 'primary.softBg',
    borderColor: overdue ? 'danger.outlinedBorder' : 'primary.outlinedBorder',
    color: overdue ? 'danger.plainColor' : 'primary.plainColor'
  }

  if (!interactive) {
    if (!dueDate) return null
    return (
      <Typography
        level='body-xs'
        startDecorator={<CalendarTodayIcon fontSize='inherit' />}
        sx={{
          flexShrink: 0,
          px: 0.75,
          py: 0.25,
          borderRadius: 'sm',
          border: '1px solid',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          '--Typography-gap': '0.25rem',
          ...toneSx
        }}
      >
        {formatted}
      </Typography>
    )
  }

  const openPicker = () => {
    const input = dateInputRef.current
    if (!input) return
    // showPicker() is the supported path; Safari and older Chrome need the click.
    try {
      input.showPicker()
    } catch {
      input.click()
    }
  }

  // Unset dates read as a quiet dashed offer rather than a filled badge, so a
  // row with no date does not look like a row with one.
  const unsetSx = {
    borderStyle: 'dashed',
    borderColor: 'divider',
    bgcolor: 'transparent',
    color: 'text.tertiary'
  }

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <Tooltip title={t('annualPlanning.goal.milestoneDueDateAria', { title: milestoneTitle })} size='sm' placement='top'>
        <Box
          component='button'
          type='button'
          onClick={openPicker}
          aria-label={t('annualPlanning.goal.milestoneDueDateAria', { title: milestoneTitle })}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            minHeight: { xs: 44, sm: 32 },
            borderRadius: 'sm',
            border: '1px solid',
            fontWeight: 600,
            fontSize: 'xs',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            ...(dueDate ? toneSx : unsetSx),
            '&:hover': { borderColor: 'primary.outlinedBorder', color: 'primary.plainColor' },
            ...focusRing
          }}
        >
          <CalendarTodayIcon sx={{ fontSize: 14 }} />
          {dueDate ? formatted : t('annualPlanning.goal.milestoneNoDate')}
        </Box>
      </Tooltip>

      {/* The native picker. Sized over the button so the popup anchors to it,
          but non-interactive: the button above is the only affordance. */}
      <Box
        component='input'
        ref={dateInputRef}
        type='date'
        tabIndex={-1}
        aria-hidden='true'
        value={dueDate || ''}
        onChange={(e) => onPick?.(e.target.value)}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Clearing used to be right-click only — mouse-only and undiscoverable. */}
      {dueDate && (
        <Tooltip title={t('annualPlanning.goal.milestoneClearDateAria', { title: milestoneTitle })} size='sm' placement='top'>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={() => onClear?.()}
            aria-label={t('annualPlanning.goal.milestoneClearDateAria', { title: milestoneTitle })}
            sx={{ minWidth: { xs: 44, sm: 28 }, minHeight: { xs: 44, sm: 28 }, ...focusRing }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default MilestoneDueDateBadge
