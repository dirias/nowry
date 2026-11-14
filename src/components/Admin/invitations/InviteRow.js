import React from 'react'
import { Box, Button, Chip, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { rowActions } from '@nowry/core/domain/invitations'
import { shortDate } from './inviteDates'

/** The state tag's colour (board D): open is the accent, used is done, revoked is danger. */
const STATE_COLOR = Object.freeze({ open: 'primary', used: 'success', expired: 'neutral', revoked: 'danger' })

/** The columns: address · cohort · state · sent · actions; a phone keeps address, state and actions. */
export const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1.6fr) 120px 96px 190px minmax(160px, auto)' },
  alignItems: 'center',
  columnGap: 1.5,
  rowGap: 0.5,
  '& > .desk-only': { display: { xs: 'none', md: 'block' } }
}

const dates = (invite, language) => {
  const sent = shortDate(invite.sent_at ?? invite.created_at, language)
  return {
    sent,
    ends: shortDate(invite.expires_at, language),
    used: shortDate(invite.used_at, language),
    revoked: shortDate(invite.revoked_at, language)
  }
}

/** The sent / ends / used column, and the phone's one meta line. */
const dateLines = (t, invite, d) => {
  switch (invite.state) {
    case 'open':
      return { column: t('admin.inv.list.sentEnds', d), phone: t('admin.inv.list.meta.open', d) }
    case 'used':
      return { column: t('admin.inv.list.sentUsed', d), phone: t('admin.inv.list.meta.used', { date: d.used }) }
    case 'revoked':
      return { column: d.sent, phone: t('admin.inv.list.meta.revoked', { date: d.revoked || d.sent }) }
    default:
      return { column: d.sent, phone: t('admin.inv.list.meta.expired', { date: d.ends }) }
  }
}

const ACTION_LABEL = Object.freeze({
  resend: 'admin.inv.actions.resend',
  inviteAgain: 'admin.inv.actions.inviteAgain',
  revoke: 'admin.inv.actions.revoke'
})

const RowActions = ({ invite, onAction }) => {
  const { t } = useTranslation()
  return (
    <Stack direction='row' gap={0.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
      {rowActions(invite).map((action) => (
        <Button
          key={action}
          size='sm'
          variant='plain'
          color={action === 'revoke' ? 'danger' : 'primary'}
          onClick={() => onAction(invite, action)}
          aria-label={t(`admin.inv.actions.${action}Aria`, { email: invite.email })}
        >
          {t(ACTION_LABEL[action])}
        </Button>
      ))}
    </Stack>
  )
}

/** One invitation (board D): address, cohort, state, dates and what can be done with it. */
export default function InviteRow({ invite, onAction }) {
  const { t, i18n } = useTranslation()
  const lines = dateLines(t, invite, dates(invite, i18n?.language))
  return (
    <Box role='row' sx={{ ...ROW_GRID, py: 1.25, px: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box role='cell' sx={{ minWidth: 0 }}>
        <Typography level='title-sm' sx={{ overflowWrap: 'anywhere' }}>
          {invite.email}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', display: { xs: 'block', md: 'none' } }}>
          {lines.phone}
        </Typography>
        {invite.last_error && (
          <Typography level='body-xs' sx={{ color: 'danger.plainColor' }}>
            {t('admin.inv.list.notSent')}
          </Typography>
        )}
      </Box>
      <Typography role='cell' className='desk-only' level='body-sm' sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
        {invite.cohort}
      </Typography>
      <Box role='cell'>
        <Chip size='sm' variant='soft' color={STATE_COLOR[invite.state] ?? 'neutral'}>
          {t(`admin.inv.states.${invite.state}`)}
        </Chip>
      </Box>
      <Typography role='cell' className='desk-only' level='body-sm' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {lines.column}
      </Typography>
      <Box role='cell'>
        <RowActions invite={invite} onAction={onAction} />
      </Box>
    </Box>
  )
}
