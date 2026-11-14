import React from 'react'
import { Button, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { shortDate } from './inviteDates'

/**
 * The confirmation in place under a row (board I): what happens, Cancel on the
 * left, the action on the right; stacked full width on a phone, Cancel first.
 * Revoke is the soft danger key; Resend and Invite again the primary.
 */
export default function InviteConfirm({ invite, action, busy, onCancel, onConfirm }) {
  const { t, i18n } = useTranslation()
  const danger = action === 'revoke'
  const values = { email: invite.email, cohort: invite.cohort, date: shortDate(invite.sent_at ?? invite.created_at, i18n?.language) }
  return (
    <Sheet
      variant='outlined'
      role='group'
      aria-labelledby={`confirm-${invite.id}`}
      sx={{
        bgcolor: 'background.body',
        borderRadius: 'lg',
        borderColor: danger ? 'danger.outlinedBorder' : 'divider',
        p: 1.75,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25
      }}
    >
      <Typography id={`confirm-${invite.id}`} level='title-sm' sx={{ overflowWrap: 'anywhere' }}>
        {t(`admin.inv.confirm.${action}.title`, values)}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t(`admin.inv.confirm.${action}.body`, values)}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' gap={1.5}>
        <Button variant='plain' color='neutral' onClick={onCancel} disabled={busy} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant={danger ? 'soft' : 'solid'}
          color={danger ? 'danger' : 'primary'}
          loading={busy}
          onClick={onConfirm}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {t(`admin.inv.confirm.${action}.confirm`)}
        </Button>
      </Stack>
    </Sheet>
  )
}
