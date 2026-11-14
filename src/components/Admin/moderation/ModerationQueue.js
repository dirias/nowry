import React from 'react'
import { Box, Chip, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { itemKey, newestReport, reasonColor } from '@nowry/core/domain/moderation'
import { focusRing } from '../../Common/Form/formStyles'
import { EmptyRows, LoadError, LoadingRows } from '../AdminListParts'
import { rowMeta } from './moderationText'

const oneLine = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

/** The tag a row carries: the newest report's reason, or the removal's; kept is success, removed danger. */
const rowTag = (item, state) => {
  const reason = state === 'removed' ? (item.removal?.reason ?? newestReport(item)?.reason) : newestReport(item)?.reason
  if (!reason) return null
  const color = state === 'removed' ? 'danger' : state === 'kept' ? 'success' : reasonColor(reason)
  return { reason, color }
}

/** One queue row (board B): title, meta, the reason tag; the selected row on the accent's soft ground. */
const QueueRow = ({ item, state, selected, onSelect }) => {
  const { t, i18n } = useTranslation()
  const tag = rowTag(item, state)
  return (
    <Box
      component='button'
      type='button'
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(itemKey(item))}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        px: 1.75,
        py: 1.25,
        border: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: selected ? 'primary.softBg' : 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        '&:last-of-type': { borderBottom: 0 },
        '&:hover': { bgcolor: selected ? 'primary.softBg' : 'background.level1' },
        ...focusRing,
        '&:focus-visible': { ...focusRing['&:focus-visible'], outlineOffset: '-2px' }
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={oneLine}>
          {item.title}
        </Typography>
        <Typography level='body-xs' sx={{ ...oneLine, color: 'text.tertiary' }}>
          {rowMeta(t, item, i18n?.language)}
        </Typography>
      </Box>
      {tag && (
        <Chip size='sm' variant='soft' color={tag.color}>
          {t(`admin.mod.reasons.${tag.reason}`)}
        </Chip>
      )}
    </Box>
  )
}

/**
 * The queue (boards B, L): one bordered list of rows, newest report first as
 * the API sends them; skeleton rows while loading; empty and error say so, the
 * error with Try again.
 */
export default function ModerationQueue({ queue, state, selectedKey, onSelect }) {
  const { t } = useTranslation()
  if (queue.error) return <LoadError message={t('admin.mod.list.error')} onRetry={queue.retry} />
  const frame = { bgcolor: 'background.surface', borderRadius: 'lg', overflow: 'hidden', minWidth: 0 }
  if (queue.loading)
    return (
      <Sheet variant='outlined' sx={frame}>
        <LoadingRows label={t('admin.mod.list.loading')} testId='moderation-loading' />
      </Sheet>
    )
  if (queue.items.length === 0)
    return (
      <Sheet variant='outlined' sx={frame}>
        {state === 'to_review' ? (
          <EmptyRows title={t('admin.mod.list.empty.title')} body={t('admin.mod.list.empty.body')} />
        ) : (
          <EmptyRows title={t('admin.mod.list.filterEmpty')} />
        )}
      </Sheet>
    )
  return (
    <Sheet
      variant='outlined'
      role='group'
      aria-label={t('admin.mod.list.title')}
      sx={{ ...frame, display: 'flex', flexDirection: 'column' }}
    >
      {queue.items.map((item) => (
        <QueueRow key={itemKey(item)} item={item} state={state} selected={itemKey(item) === selectedKey} onSelect={onSelect} />
      ))}
    </Sheet>
  )
}
