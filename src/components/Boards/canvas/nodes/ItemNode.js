import React, { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Skeleton, Typography } from '@mui/joy'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded'
import PlusHandles from '../PlusHandles'
import ItemGlyph, { areaColorOf } from '../../ItemGlyph'
import { useBoardLinks } from '../../boardLinksContext'
import { focusRing, oneLine, touchTargetBox } from '../../../Common/Form/formStyles'
import { appear, selectedRing } from './nodeStyles'

const KINDS = ['task', 'milestone', 'goal']
const TICKABLE = ['task', 'milestone']

/** A due date as the meta line says it: "Oct 17". */
export const formatDue = (key, language) =>
  new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(new Date(`${key}T00:00:00`))

const tileSx = (selected, fresh) => ({
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  pl: 1.5,
  pr: 0.75,
  py: 1,
  minHeight: 56,
  borderRadius: 'md',
  bgcolor: 'background.surface',
  border: '1px solid',
  borderColor: 'divider',
  ...selectedRing(selected),
  ...(fresh ? appear : {})
})

/** The tile's body is a button that reads as the tile: no ground, no border, the row's own type. */
const bodySx = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  p: 0,
  m: 0,
  border: 0,
  bgcolor: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 'sm',
  ...focusRing
}

const tickSx = (on) => ({
  ...touchTargetBox,
  '--IconButton-size': '28px',
  borderRadius: 'sm',
  flexShrink: 0,
  color: on ? 'success.plainColor' : 'text.tertiary',
  ...focusRing
})

/**
 * An item on the board (BOARD-005, PRD D6, ADR-046): a task, a milestone or a
 * goal, by reference, read live — its title, a meta line (kind · due ·
 * priority) and, for a task or a milestone, the tick that writes done. The
 * tick shows the new state at once and goes back if the write fails. A click
 * on the tile opens the item sheet (a goal opens its area in Planning). An
 * item gone from the plan keeps its stored title, struck, and says so.
 */
function ItemNode({ id, data, selected }) {
  const { t, i18n } = useTranslation()
  const links = useBoardLinks()
  const { node, fresh } = data
  const ref = node.ref ?? null
  const kind = KINDS.includes(ref?.kind) ? ref.kind : 'task'
  const reading = links ? links.read(ref) : { status: 'static', kind }
  const [pending, setPending] = useState(null)

  const recordDone = reading.status === 'ready' ? reading.done : null
  // The optimistic state holds until the record agrees with it.
  useEffect(() => {
    if (pending !== null && recordDone === pending) setPending(null)
  }, [pending, recordDone])

  const done = pending ?? Boolean(recordDone)
  const ready = reading.status === 'ready'
  const title = ready ? reading.title : node.title || t(`boards.item.kind.${kind}`)
  const color = links ? areaColorOf(reading.areaId, links.areas) : null

  const meta = (() => {
    if (reading.status === 'missing') return t('boards.item.missing')
    if (reading.status === 'error') return t('boards.item.loadError')
    const parts = [t(`boards.item.kind.${kind}`)]
    if (ready && reading.due) parts.push(t('items.readout.due', { date: formatDue(reading.due, i18n?.language) }))
    if (ready && reading.priority) parts.push(t('items.readout.priority'))
    return parts.join(' · ')
  })()

  const tick = async () => {
    const next = !done
    setPending(next)
    try {
      await links.setDone(ref, next, reading)
    } catch {
      setPending(null)
    }
  }

  const missing = reading.status === 'missing'
  const text = (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      {reading.status === 'loading' ? (
        <>
          <Skeleton variant='text' level='title-sm' width='70%' />
          <Skeleton variant='text' level='body-xs' width='45%' />
        </>
      ) : (
        <>
          <Typography
            level='title-sm'
            sx={{
              ...oneLine,
              color: missing || done ? 'text.tertiary' : 'text.primary',
              textDecoration: missing || done ? 'line-through' : 'none'
            }}
          >
            {title}
          </Typography>
          <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
            {meta}
          </Typography>
        </>
      )}
    </Box>
  )
  const glyph = <ItemGlyph kind={kind} color={missing ? null : color} />

  return (
    <>
      <PlusHandles id={id} />
      <Box data-testid={`board-item-${id}`} sx={tileSx(selected, fresh)}>
        {ready ? (
          <Box
            component='button'
            type='button'
            className='board-item-open'
            aria-label={t('boards.item.open', { title })}
            onClick={(event) => {
              if (event.shiftKey || event.metaKey || event.ctrlKey) return
              links.openItem(ref, reading)
            }}
            sx={bodySx}
          >
            {glyph}
            {text}
          </Box>
        ) : (
          <Box sx={{ ...bodySx, cursor: 'default' }}>
            {glyph}
            {text}
          </Box>
        )}
        {ready && TICKABLE.includes(kind) && (
          <IconButton
            className='nodrag'
            size='sm'
            variant='plain'
            color={done ? 'success' : 'neutral'}
            aria-label={t(done ? 'boards.item.markUndone' : 'boards.item.markDone', { title })}
            aria-pressed={done}
            onClick={tick}
            sx={tickSx(done)}
          >
            {done ? <CheckCircleRounded sx={{ fontSize: 'xl' }} /> : <RadioButtonUncheckedRounded sx={{ fontSize: 'xl' }} />}
          </IconButton>
        )}
      </Box>
    </>
  )
}

export default memo(ItemNode)
