import React, { useState } from 'react'
import { Button, FormControl, FormHelperText, FormLabel, Option, Select, Sheet, Stack, Textarea, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { NOTE_MAX, REMOVAL_REASONS, defaultRemovalReason, newestReport, unpublishCount } from '@nowry/core/domain/moderation'
import { confirmBody } from './moderationText'

/**
 * The confirmation in place (board B): what an unpublish does and what goes
 * with it, the reason (prefilled from the newest report), an optional note for
 * the owner, who is emailed, then Cancel on the left and the soft danger key on
 * the right, carrying the count; stacked full width on a phone, Cancel first.
 */
export default function UnpublishConfirm({ item, busy, onCancel, onConfirm }) {
  const { t } = useTranslation()
  const reported = newestReport(item)?.reason
  const [reason, setReason] = useState(() => defaultRemovalReason(item))
  const [note, setNote] = useState('')
  const total = unpublishCount(item)
  const titleId = `unpublish-${item.content_type}-${item.content_id}`
  const reasonLabel = (value) =>
    value === reported ? t('admin.mod.confirm.fromReport', { reason: t(`admin.mod.reasons.${value}`) }) : t(`admin.mod.reasons.${value}`)

  return (
    <Sheet
      variant='outlined'
      role='group'
      aria-labelledby={titleId}
      sx={{
        bgcolor: 'background.body',
        borderRadius: 'lg',
        borderColor: 'danger.outlinedBorder',
        p: 1.75,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25
      }}
    >
      <Typography id={titleId} level='title-sm' sx={{ overflowWrap: 'anywhere' }}>
        {t('admin.mod.confirm.title', { title: item.title })}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {confirmBody(t, item, total)}
      </Typography>
      <FormControl size='sm'>
        <FormLabel id={`${titleId}-reason`}>{t('admin.mod.confirm.reason')}</FormLabel>
        <Select
          autoFocus
          value={reason}
          onChange={(_, value) => value && setReason(value)}
          slotProps={{ button: { 'aria-labelledby': `${titleId}-reason`, role: 'combobox' } }}
        >
          {REMOVAL_REASONS.map((value) => (
            <Option key={value} value={value}>
              {reasonLabel(value)}
            </Option>
          ))}
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>
          {t('admin.mod.confirm.note')}
          <Typography component='span' level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'md', ml: 0.75 }}>
            {t('admin.mod.confirm.noteHint', { max: NOTE_MAX })}
          </Typography>
        </FormLabel>
        {/* size='md' (16px): iOS Safari zooms the page on focus of a smaller text field. */}
        <Textarea
          size='md'
          minRows={2}
          maxRows={5}
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
          slotProps={{ textarea: { maxLength: NOTE_MAX, 'aria-label': t('admin.mod.confirm.note') } }}
        />
        <FormHelperText sx={{ justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>
          {`${note.length}/${NOTE_MAX}`}
        </FormHelperText>
      </FormControl>
      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        {item.public_copies > 0 ? t('admin.mod.confirm.emailCopies', { count: item.public_copies }) : t('admin.mod.confirm.email')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' gap={1.5}>
        <Button variant='plain' color='neutral' onClick={onCancel} disabled={busy} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant='soft'
          color='danger'
          loading={busy}
          onClick={() => onConfirm({ reason, note: note.trim() })}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {t('admin.mod.confirm.confirm', { count: total })}
        </Button>
      </Stack>
    </Sheet>
  )
}
