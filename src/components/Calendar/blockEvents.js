import React from 'react'
import { Box, Typography } from '@mui/joy'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import AdjustOutlinedIcon from '@mui/icons-material/AdjustOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'

import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { clockOn, groupStateOf, stateOf } from '@nowry/core/domain/blocks'
import { identityTile } from '../Common/Form/formStyles'

/**
 * How a block is drawn on the web calendar (PLAN-004; PRD D11).
 *
 * A block is the one row anatomy (ADR-021): a 16px identity tile in its
 * source's colour, the title, a meta line. State is a GROUND (§15.5): kept is
 * the soft tint with a leading check, skipped is `level2` with the title
 * struck, running is the solid, upcoming and missed sit on the surface with a
 * hairline. No hex anywhere — a goal block borrows its area's data colour the
 * way the deadline tiles do (ADR-019), with the glyph derived by contrast.
 */

/** The icon KEY each source hands out, resolved to this client's set (ADR-031). */
export const SOURCE_ICONS = {
  routine: RepeatRoundedIcon,
  study: StyleOutlinedIcon,
  focus: TimerOutlinedIcon,
  goal: AdjustOutlinedIcon,
  task: CheckCircleOutlinedIcon,
  free: ScheduleOutlinedIcon
}

const sourceOf = (occurrence) => occurrence?.block?.source?.type ?? 'free'

/** The tile's fill and the colour of a glyph on it, for an occurrence. */
export const blockTileColors = (occurrence, focusAreas = []) => {
  const type = sourceOf(occurrence)
  if (type === 'goal') {
    const area = (focusAreas ?? []).find((a) => a.id === occurrence.block?.areaId)
    if (area?.color) return { bg: area.color, fg: readableTextOn(area.color) }
  }
  if (type === 'study' || type === 'routine') return { bg: 'primary.solidBg', fg: 'primary.solidColor' }
  if (type === 'focus') return { bg: 'warning.plainColor', fg: 'background.surface' }
  return { bg: 'neutral.outlinedBorder', fg: 'text.primary' }
}

/** The ground, ink and decoration each state draws (PRD D11: state is a ground). */
/**
 * State is a ground, never a border or a hue (§15.5, ADR-045 §6): upcoming
 * sits on `level1`, kept on the soft tint with a check, skipped on `level2`
 * struck, running on the solid, missed on `level1` in tertiary ink. The
 * outlined box the first cut drew for upcoming was a shape family the
 * standard set aside, and in dark mode it read as a second ring around
 * FullCalendar's own.
 */
export const BLOCK_STATE_SX = {
  kept: { bgcolor: 'primary.softBg', color: 'primary.plainColor' },
  partial: { bgcolor: 'primary.softBg', color: 'primary.plainColor' },
  skipped: { bgcolor: 'background.level2', color: 'text.tertiary', textDecoration: 'line-through' },
  running: { bgcolor: 'primary.solidBg', color: 'primary.solidColor' },
  upcoming: { bgcolor: 'background.level1', color: 'text.primary' },
  missed: { bgcolor: 'background.level1', color: 'text.tertiary' }
}

/** The state of a grid event — a run reads its items together, a single its own log and the clock. */
export const eventStateOf = ({ occurrence, group }, todayKey, nowMinutes) => {
  const clock = clockOn(occurrence.date, todayKey, nowMinutes)
  return group ? groupStateOf(group.occurrences, clock) : stateOf(occurrence, clock)
}

/** "6 h 10 min" or "45 min", from a minute count. */
export const formatMinutes = (minutes, t) => {
  const total = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours > 0 && rest === 0) return t('calendarPage.blocks.hours', { hours })
  return hours > 0 ? t('calendarPage.blocks.hoursMinutes', { hours, minutes: rest }) : t('calendarPage.blocks.minutes', { minutes: rest })
}

/** "20 min · study" — the row's meta line. */
export const blockMeta = (occurrence, t) =>
  t('calendarPage.blocks.meta', {
    minutes: occurrence.lengthMin,
    source: t(`calendarPage.blocks.source.${sourceOf(occurrence)}`)
  })

/**
 * The identity tile (ADR-019): 16px with no glyph on the grid, 28px with the
 * source's glyph on the agenda row. On a running block the solid ground is
 * the tile's own colour, so the tile inverts to stay visible.
 */
export const BlockTile = ({ occurrence, focusAreas, size = 16, glyph = false, inverted = false }) => {
  const colors = inverted ? { bg: 'primary.solidColor', fg: 'primary.solidBg' } : blockTileColors(occurrence, focusAreas)
  const Icon = SOURCE_ICONS[sourceOf(occurrence)] ?? ScheduleOutlinedIcon
  return (
    <Box
      aria-hidden='true'
      sx={{
        ...identityTile(colors.bg, size),
        color: colors.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {glyph && <Icon sx={{ fontSize: 'md', color: 'inherit' }} />}
    </Box>
  )
}

/**
 * The grid event. In Week a run of routine items is one event named by its
 * period and count; a study block on today's date says what is due.
 */
export const BlockEventContent = ({ event, focusAreas, todayKey, nowMinutes, dueToday, t }) => {
  const { occurrence, group } = event.extendedProps
  const state = eventStateOf({ occurrence, group }, todayKey, nowMinutes)
  const stateSx = BLOCK_STATE_SX[state] ?? BLOCK_STATE_SX.upcoming
  const isStudyToday = !group && sourceOf(occurrence) === 'study' && occurrence.date === todayKey && dueToday > 0
  const label = group
    ? t('calendarPage.blocks.routineGroup', { period: t(`calendarPage.blocks.period.${group.period}`), size: group.count })
    : occurrence.title
  const suffix = isStudyToday ? ` · ${t('calendarPage.blocks.cards', { count: dueToday })}` : ''

  return (
    <Box
      data-block-state={state}
      sx={{
        /* One line, centred in whatever height the grid gives: a ten-minute
           block is one line tall (the grid's `eventMinHeight`), a longer one
           keeps its line at the top. */
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 0.75,
        borderRadius: 'sm',
        overflow: 'hidden',
        ...stateSx
      }}
    >
      {state === 'kept' || state === 'partial' ? (
        <CheckRoundedIcon sx={{ fontSize: 'md', flexShrink: 0, color: 'inherit' }} />
      ) : (
        <BlockTile occurrence={occurrence} focusAreas={focusAreas} inverted={state === 'running'} />
      )}
      <Typography
        level='body-xs'
        noWrap
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'inherit',
          fontWeight: 'md',
          textDecoration: stateSx.textDecoration ?? 'none'
        }}
      >
        {label}
        {suffix}
      </Typography>
    </Box>
  )
}
