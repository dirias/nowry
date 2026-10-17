import * as React from 'react'
import { Box, IconButton, Typography } from '@mui/joy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { focusRing, listRow, measureFill, measureTrack, readout, touchTargetBox } from '../../Common/Form/formStyles'

/**
 * One row of Home's day panel, for a block and for a task alike (PLAN-019,
 * ADR-021 amendment 2026-10-17, PRD-items D11).
 *
 * Four columns, four questions: **When** (44px: a block's time; a task's
 * "Late", or nothing for today) · **what** (the 16px tile, a label, never a
 * control) · **which** (the title over one meta line) · **done** (the circle,
 * always last, always a circle). The title opens the item sheet; the circle is
 * the row's one action.
 */

/** The When column, as the agenda's block row sets it. */
export const WHEN_COLUMN_WIDTH = 44

const LEAD_TONE = {
  quiet: { color: 'text.tertiary', fontWeight: 'md' },
  strong: { color: 'text.primary', fontWeight: 'lg' },
  now: { color: 'primary.plainColor', fontWeight: 'lg' }
}

const tickSx = (on) => ({
  ...touchTargetBox,
  borderRadius: 'sm',
  flexShrink: 0,
  color: on ? 'success.plainColor' : 'text.tertiary',
  ...focusRing
})

/** The title and its meta line; a button when the row opens something. */
const RowBody = ({ title, meta, struck, dimmed, onOpen, openLabel }) => {
  const content = (
    <>
      <Typography
        level='body-sm'
        noWrap
        sx={{
          fontWeight: 'md',
          color: struck || dimmed ? 'text.tertiary' : 'text.primary',
          textDecoration: struck ? 'line-through' : 'none'
        }}
      >
        {title}
      </Typography>
      {meta ? (
        <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary' }}>
          {meta}
        </Typography>
      ) : null}
    </>
  )
  if (!onOpen) return <Box sx={{ flex: 1, minWidth: 0 }}>{content}</Box>
  return (
    <Box
      component='button'
      type='button'
      onClick={onOpen}
      aria-label={openLabel}
      sx={{
        flex: 1,
        minWidth: 0,
        p: 0,
        border: 0,
        bgcolor: 'transparent',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        borderRadius: 'sm',
        ...focusRing
      }}
    >
      {content}
    </Box>
  )
}

export const DayRow = ({
  lead = '',
  leadTone = 'quiet',
  tile,
  title,
  meta = null,
  done = false,
  struck = false,
  dimmed = false,
  onOpen = null,
  openLabel,
  tickLabel,
  onToggle,
  testId,
  state
}) => (
  <Box sx={{ ...listRow, gap: 1.5 }} data-testid={testId} data-row-state={state}>
    <Typography level='body-sm' sx={{ ...readout, width: WHEN_COLUMN_WIDTH, flexShrink: 0, ...LEAD_TONE[leadTone] }}>
      {lead}
    </Typography>
    {tile}
    <RowBody title={title} meta={meta} struck={struck} dimmed={dimmed} onOpen={onOpen} openLabel={openLabel} />
    <IconButton
      size='sm'
      variant='plain'
      color={done ? 'success' : 'neutral'}
      onClick={onToggle}
      aria-label={tickLabel}
      aria-pressed={done}
      sx={tickSx(done)}
    >
      {done ? <CheckCircleIcon fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
    </IconButton>
  </Box>
)

/**
 * A foot row on the same rails: an empty When column, a glyph in the tile's
 * slot, words on the title rail. A link ("Open the day") or a disclosure
 * ("Upcoming · 4"), never a third kind of control.
 */
export const DayFootRow = ({ glyph, children, onClick, expanded, component = 'button', ...rest }) => (
  <Box
    component={component}
    type={component === 'button' ? 'button' : undefined}
    onClick={onClick}
    aria-expanded={expanded}
    {...rest}
    sx={{
      ...listRow,
      gap: 1.5,
      minHeight: 44,
      width: 'calc(100% + 24px)',
      border: 0,
      bgcolor: 'transparent',
      font: 'inherit',
      textAlign: 'left',
      textDecoration: 'none',
      cursor: 'pointer',
      color: 'text.secondary'
    }}
  >
    <Box sx={{ width: WHEN_COLUMN_WIDTH, flexShrink: 0 }} />
    <Box sx={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center', color: 'text.tertiary', '& svg': { fontSize: 'lg' } }}>
      {glyph}
    </Box>
    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
      {children}
    </Typography>
  </Box>
)

/** The panel's progress edge (§15.4): content width, 3px, under the segment, on both tabs. */
export const DayEdge = ({ rate, label }) => (
  <Box role='img' aria-label={label} sx={{ ...measureTrack, width: '100%', mb: 1 }}>
    <Box sx={measureFill(Math.round((rate || 0) * 100))} />
  </Box>
)

export default DayRow
