import React from 'react'
import { Sheet } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { EmptyRows, LoadError, LoadingRows } from '../AdminListParts'
import WaitlistRow, { WaitlistHead } from './WaitlistRow'

/** The empty list: no one waiting (with the hint) only on the unfiltered Waiting view. */
const emptyText = (t, state, locale) => {
  if (state !== 'waiting') return { title: t('admin.wl.list.filterEmpty'), body: null }
  return { title: t('admin.wl.list.empty.title'), body: locale ? null : t('admin.wl.list.empty.body') }
}

/**
 * The rows (boards E, L): one bordered list with its column heads, oldest
 * first; skeleton rows while loading; empty and error say so, the error with
 * Try again.
 */
export default function WaitlistList({ list, state, locale, selected, onToggle }) {
  const { t } = useTranslation()
  if (list.error) return <LoadError message={t('admin.wl.list.error')} onRetry={list.retry} />
  const frame = { bgcolor: 'background.surface', borderRadius: 'lg', overflow: 'hidden', minWidth: 0 }
  if (list.loading)
    return (
      <Sheet variant='outlined' sx={frame}>
        <LoadingRows label={t('admin.wl.list.loading')} testId='waitlist-loading' />
      </Sheet>
    )
  if (list.rows.length === 0)
    return (
      <Sheet variant='outlined' sx={frame}>
        <EmptyRows {...emptyText(t, state, locale)} />
      </Sheet>
    )
  return (
    <Sheet variant='outlined' role='table' aria-label={t('admin.wl.list.title')} sx={frame}>
      <WaitlistHead />
      {list.rows.map((row) => (
        <WaitlistRow key={row.id} row={row} selected={selected.includes(row.id)} onToggle={onToggle} />
      ))}
    </Sheet>
  )
}
