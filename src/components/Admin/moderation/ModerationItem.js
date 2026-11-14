import React, { forwardRef, useRef } from 'react'
import { Box, Button, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { publicPath, reportGroups } from '@nowry/core/domain/moderation'
import { shortDate } from '../invitations/inviteDates'
import UnpublishConfirm from './UnpublishConfirm'
import { groupCaption, itemCaption } from './moderationText'

/** One reason's reports (board B): each reporter's words quoted, then "Copyright · 1 reporter". */
const ReportGroup = ({ group }) => {
  const { t } = useTranslation()
  return (
    <Box sx={{ borderLeft: '3px solid', borderColor: 'divider', pl: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {group.notes.map((note, index) => (
        <Typography key={index} level='body-sm' sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
          <q>{note}</q>
        </Typography>
      ))}
      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        {groupCaption(t, group)}
      </Typography>
    </Box>
  )
}

/** A removed item's record (board B, Removed): when, why, and the note the owner read. */
const RemovalRecord = ({ removal }) => {
  const { t, i18n } = useTranslation()
  return (
    <Stack gap={0.5}>
      <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
        {t('admin.mod.item.removed', {
          date: shortDate(removal.removed_at, i18n?.language),
          reason: t(`admin.mod.reasons.${removal.reason ?? 'other'}`)
        })}
      </Typography>
      {removal.note && (
        <Typography level='body-sm' sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
          {t('admin.mod.item.removedNote', { note: removal.note })}
        </Typography>
      )}
    </Stack>
  )
}

/** The actions (board B): Open (secondary), Keep public (secondary, to review only), Unpublish… (soft danger). */
const ItemActions = ({ item, state, busy, unpublishRef, onKeep, onUnpublish }) => {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={1} flexWrap='wrap'>
      <Button
        component='a'
        href={publicPath(item)}
        target='_blank'
        rel='noopener noreferrer'
        size='sm'
        variant='soft'
        color='neutral'
        aria-label={t('admin.mod.actions.openAria', { title: item.title })}
      >
        {t(item.content_type === 'book' ? 'admin.mod.actions.openBook' : 'admin.mod.actions.openDeck')}
      </Button>
      {state === 'to_review' && (
        <Button size='sm' variant='soft' color='neutral' loading={busy === 'keep'} disabled={Boolean(busy)} onClick={onKeep}>
          {t('admin.mod.actions.keep')}
        </Button>
      )}
      <Button ref={unpublishRef} size='sm' variant='soft' color='danger' disabled={Boolean(busy)} onClick={onUnpublish}>
        {t('admin.mod.actions.unpublish')}
      </Button>
    </Stack>
  )
}

/**
 * The selected item's card (board B): caption, title, its reports, and the
 * actions; Unpublish opens the confirmation in place under them. A removed
 * item shows its removal instead, with no action.
 */
const ModerationItem = forwardRef(function ModerationItem({ item, state, busy, confirming, onConfirming, onKeep, onRemove }, ref) {
  const { t, i18n } = useTranslation()
  const unpublishRef = useRef(null)
  const removed = state === 'removed' || Boolean(item.removal)
  const cancel = () => {
    onConfirming(false)
    unpublishRef.current?.focus()
  }
  return (
    <Sheet
      ref={ref}
      tabIndex={-1}
      variant='outlined'
      role='region'
      aria-label={t('admin.mod.item.label')}
      sx={{
        bgcolor: 'background.surface',
        borderRadius: 'lg',
        p: { xs: 1.75, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minWidth: 0,
        position: { md: 'sticky' },
        top: { md: 16 },
        scrollMarginTop: 16,
        outline: 'none'
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {itemCaption(t, item, i18n?.language)}
        </Typography>
        <Typography component='h2' level='title-lg' sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
          {item.title}
        </Typography>
      </Box>
      {reportGroups(item).map((group) => (
        <ReportGroup key={group.reason} group={group} />
      ))}
      {removed ? (
        item.removal && <RemovalRecord removal={item.removal} />
      ) : (
        <>
          <ItemActions
            item={item}
            state={state}
            busy={busy}
            unpublishRef={unpublishRef}
            onKeep={() => onKeep(item)}
            onUnpublish={() => onConfirming(true)}
          />
          {confirming && (
            <UnpublishConfirm
              key={`${item.content_type}:${item.content_id}`}
              item={item}
              busy={busy === 'unpublish'}
              onCancel={cancel}
              onConfirm={(removal) => onRemove(item, removal)}
            />
          )}
        </>
      )}
    </Sheet>
  )
})

export default ModerationItem
