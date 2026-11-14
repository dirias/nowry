import React from 'react'
import { Box, Checkbox, Chip, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { WAITLIST_STATE_COLOR, isSelectable, localeCode, rowMeta, sourceKey } from '@nowry/core/domain/waitlist'
import { shortDate } from '../invitations/inviteDates'

/**
 * The columns (board E): tick · address · language · came from · joined list · state.
 * A phone keeps the tick, the address with its meta line and the state; the
 * language, source and date move into that meta line ("ES · hero · 2 Nov").
 */
export const WL_GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '16px minmax(0, 1fr) auto', md: '16px minmax(0, 1.6fr) 70px 110px 100px 90px' },
  alignItems: 'center',
  columnGap: 1.5,
  rowGap: 0.5,
  px: 1.75,
  '& > .desk-only': { display: { xs: 'none', md: 'block' } }
}

const meta = {
  level: 'body-xs',
  sx: { color: 'text.tertiary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
}

/** The source as a reader names it: the column's label and the phone's short word; an unknown source as it came. */
const sourceNames = (t, source) => {
  const key = sourceKey(source)
  if (key) return { label: t(`admin.wl.sources.${key}`), short: t(`admin.wl.sourcesShort.${key}`) }
  return { label: source || '', short: source || '' }
}

/** The phone meta line: language · source · the row's date, "invited 12 Nov" once it reached a step. */
const metaLine = (t, row, short, language) => {
  const { date, dateKey } = rowMeta(row)
  const day = shortDate(date, language)
  const when = dateKey && day ? t(dateKey, { date: day }) : day
  return [localeCode(row.locale), short, when].filter(Boolean).join(' · ')
}

/** One waitlist row (board E); only a waiting row can be ticked. */
export default function WaitlistRow({ row, selected, onToggle }) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language
  const source = sourceNames(t, row.source)
  return (
    <Box
      role='row'
      aria-selected={selected}
      sx={{
        ...WL_GRID,
        py: 1.25,
        bgcolor: selected ? 'primary.softBg' : 'transparent',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 }
      }}
    >
      <Box role='cell' sx={{ display: 'flex' }}>
        <Checkbox
          size='sm'
          checked={selected}
          disabled={!isSelectable(row)}
          onChange={() => onToggle(row)}
          slotProps={{ input: { 'aria-label': t('admin.wl.list.select', { email: row.email }) } }}
        />
      </Box>
      <Box role='cell' sx={{ minWidth: 0 }}>
        <Typography level='title-sm' noWrap title={row.email}>
          {row.email}
        </Typography>
        <Typography {...meta} sx={{ ...meta.sx, display: { xs: 'block', md: 'none' } }}>
          {metaLine(t, row, source.short, language)}
        </Typography>
      </Box>
      <Typography role='cell' className='desk-only' {...meta}>
        {localeCode(row.locale) ?? ''}
      </Typography>
      <Typography role='cell' className='desk-only' {...meta}>
        {source.label}
      </Typography>
      <Typography role='cell' className='desk-only' {...meta} sx={{ ...meta.sx, fontVariantNumeric: 'tabular-nums' }}>
        {shortDate(row.created_at, language)}
      </Typography>
      <Box role='cell'>
        <Chip size='sm' variant='soft' color={WAITLIST_STATE_COLOR[row.status] ?? 'neutral'}>
          {t(`admin.wl.states.${row.status}`)}
        </Chip>
      </Box>
    </Box>
  )
}

/** The column heads on the level1 ground; a phone has none (board E). */
export const WaitlistHead = () => {
  const { t } = useTranslation()
  const heads = [
    'admin.inv.list.columns.address',
    'admin.wl.list.columns.language',
    'admin.wl.list.columns.source',
    'admin.wl.list.columns.listed',
    'admin.inv.list.columns.state'
  ]
  return (
    <Box
      role='row'
      sx={{
        ...WL_GRID,
        display: { xs: 'none', md: 'grid' },
        py: 1,
        bgcolor: 'background.level1',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <span role='columnheader' />
      {heads.map((key) => (
        <Typography
          key={key}
          role='columnheader'
          level='body-xs'
          sx={{ color: 'text.tertiary', fontWeight: 'lg', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {t(key)}
        </Typography>
      ))}
    </Box>
  )
}
