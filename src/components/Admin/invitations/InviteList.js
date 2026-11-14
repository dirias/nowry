import React, { useState } from 'react'
import { Alert, Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { adminInvitesService } from '@nowry/core/api/services/adminInvites.service'
import { useInviteList } from '@nowry/core/hooks/useAdminInvites'
import { isReauthCancelled } from '@nowry/core/domain/recentSignIn'
import { INVITE_STATES, apiErrorCode, apiErrorDetail } from '@nowry/core/domain/invitations'
import { focusRing } from '../../Common/Form/formStyles'
import InviteRow, { ROW_GRID } from './InviteRow'
import InviteConfirm from './InviteConfirm'
import { localTime } from './inviteDates'

const DONE_KEY = Object.freeze({
  resend: 'admin.inv.notice.resent',
  inviteAgain: 'admin.inv.notice.invitedAgain',
  revoke: 'admin.inv.notice.revoked'
})

/** What an action's refusal says (board I): the hour limit with its local time, a used link, or a failure. */
const refusalNotice = (error, invite, language) => {
  const code = apiErrorCode(error)
  if (code === 'resend_too_soon') {
    const time = localTime(apiErrorDetail(error).retry_at, language)
    return { tone: 'warning', key: 'admin.inv.notice.tooSoon', values: { email: invite.email, time } }
  }
  if (code === 'invite_used') return { tone: 'neutral', key: 'admin.inv.notice.used', values: { email: invite.email } }
  return { tone: 'danger', key: 'admin.inv.notice.failed', values: {} }
}

/** Resend, invite again and revoke: confirmed in place, then run through the re-sign-in. */
const useRowAction = ({ run, reload, language }) => {
  const [confirming, setConfirming] = useState(null) // { invite, action }
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState(null) // { tone, key, values }
  const confirm = async () => {
    const { invite, action } = confirming
    const call = action === 'revoke' ? () => adminInvitesService.revoke(invite.id) : () => adminInvitesService.resend(invite.id)
    setWorking(true)
    setNotice(null)
    try {
      await run(action, call)
      setNotice({ tone: 'success', key: DONE_KEY[action], values: { email: invite.email } })
      setConfirming(null)
      reload()
    } catch (error) {
      if (isReauthCancelled(error)) return
      setNotice(refusalNotice(error, invite, language))
      setConfirming(null)
    } finally {
      setWorking(false)
    }
  }
  const ask = (invite, action) => {
    setNotice(null)
    setConfirming({ invite, action })
  }
  return { confirming, working, notice, ask, confirm, cancel: () => setConfirming(null) }
}

const StateFilters = ({ value, totals, onChange }) => {
  const { t } = useTranslation()
  const all = INVITE_STATES.reduce((sum, state) => sum + (totals[state] ?? 0), 0)
  const filters = [{ state: null, count: all }, ...INVITE_STATES.map((state) => ({ state, count: totals[state] ?? 0 }))]
  return (
    <Stack direction='row' gap={1} flexWrap='wrap' role='group' aria-label={t('admin.inv.list.filtersLabel')}>
      {filters.map(({ state, count }) => {
        const on = value === state
        const label = `${t(`admin.inv.states.${state ?? 'all'}`)} · ${count}`
        return (
          <Chip
            key={state ?? 'all'}
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => onChange(state)}
            slotProps={{ action: { 'aria-pressed': on, 'aria-label': label, sx: focusRing } }}
            sx={{
              bgcolor: on ? 'background.level2' : 'background.level1',
              color: on ? 'text.primary' : 'text.secondary',
              fontWeight: on ? 'lg' : 'md',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {label}
          </Chip>
        )
      })}
    </Stack>
  )
}

const LoadingRows = () => {
  const { t } = useTranslation()
  return (
    <Stack aria-busy='true' aria-label={t('admin.inv.list.loading')} data-testid='invite-list-loading'>
      {[70, 100, 85, 60].map((width) => (
        <Box key={width} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant='text' level='body-md' sx={{ width: `${width}%` }} />
        </Box>
      ))}
    </Stack>
  )
}

const EmptyState = ({ filtered }) => {
  const { t } = useTranslation()
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
        {filtered ? t('admin.inv.list.filterEmpty') : t('admin.inv.list.empty.title')}
      </Typography>
      {!filtered && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('admin.inv.list.empty.body')}
        </Typography>
      )}
    </Box>
  )
}

const LoadError = ({ onRetry }) => {
  const { t } = useTranslation()
  return (
    <Stack gap={1.5} alignItems='flex-start'>
      <Alert variant='soft' color='danger' sx={{ alignSelf: 'stretch' }}>
        {t('admin.inv.list.error')}
      </Alert>
      <Button size='sm' variant='soft' color='neutral' onClick={onRetry}>
        {t('admin.tryAgain')}
      </Button>
    </Stack>
  )
}

const HeadRow = () => {
  const { t } = useTranslation()
  return (
    <Box
      role='row'
      sx={{ ...ROW_GRID, display: { xs: 'none', md: 'grid' }, px: 0.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      {['address', 'cohort', 'state', 'sent'].map((column) => (
        <Typography key={column} role='columnheader' level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 'lg' }}>
          {t(`admin.inv.list.columns.${column}`)}
        </Typography>
      ))}
      <span role='columnheader' />
    </Box>
  )
}

const Rows = ({ invites, rowAction, label }) => (
  <Box role='table' aria-label={label}>
    <HeadRow />
    {invites.map((invite) => (
      <React.Fragment key={invite.id}>
        <InviteRow invite={invite} onAction={rowAction.ask} />
        {rowAction.confirming?.invite.id === invite.id && (
          <Box sx={{ py: 1.25 }}>
            <InviteConfirm
              invite={invite}
              action={rowAction.confirming.action}
              busy={rowAction.working}
              onCancel={rowAction.cancel}
              onConfirm={rowAction.confirm}
            />
          </Box>
        )}
      </React.Fragment>
    ))}
  </Box>
)

/**
 * The invitations sent (ADMIN-007a, FR-012, boards D, I and L): filters by
 * state with their totals, one row per invitation with Resend, Invite again or
 * Revoke, each confirmed in place. Loading is skeleton rows; empty and error
 * say so, the error with Try again.
 */
export default function InviteList({ run }) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState(null)
  const list = useInviteList(filter)
  const rowAction = useRowAction({ run, reload: list.reload, language: i18n?.language })
  const body = list.loading ? (
    <LoadingRows />
  ) : list.error ? (
    <LoadError onRetry={list.retry} />
  ) : list.invites.length === 0 ? (
    <EmptyState filtered={filter !== null} />
  ) : (
    <Rows invites={list.invites} rowAction={rowAction} label={t('admin.inv.list.title')} />
  )
  return (
    <Stack component='section' gap={1.5} aria-label={t('admin.inv.list.title')}>
      <StateFilters value={filter} totals={list.totals} onChange={setFilter} />
      <Box role='status' aria-live='polite'>
        {rowAction.notice && (
          <Alert variant='soft' color={rowAction.notice.tone}>
            {t(rowAction.notice.key, rowAction.notice.values)}
          </Alert>
        )}
      </Box>
      {body}
    </Stack>
  )
}
