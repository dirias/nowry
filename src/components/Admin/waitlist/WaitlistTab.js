import React, { useState } from 'react'
import { Box, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useReauthRetry } from '@nowry/core/hooks/useReauthRetry'
import { useInviteCohorts } from '@nowry/core/hooks/useAdminInvites'
import { useWaitlist, useWaitlistInvite } from '@nowry/core/hooks/useAdminWaitlist'
import { DEFAULT_COHORT, DEFAULT_LIFETIME_DAYS } from '@nowry/core/domain/invitations'
import { pruneSelection, selectAllState, toggleAll, toggleRow } from '@nowry/core/domain/waitlist'
import AdminReauthDialog from '../AdminReauthDialog'
import SendResult from '../invitations/SendResult'
import WaitlistFilters from './WaitlistFilters'
import WaitlistBar from './WaitlistBar'
import WaitlistList from './WaitlistList'

/** The state and language filters; changing either clears the selection. */
const useFilters = (clear) => {
  const [state, setState] = useState('waiting')
  const [locale, setLocale] = useState(null)
  const change = (setter) => (value) => {
    clear()
    setter(value)
  }
  return { state, locale, setState: change(setState), setLocale: change(setLocale) }
}

/**
 * The Waitlist tab (WAIT-002, WAIT-006, FR-012, board E): filter by state and
 * language, tick waiting rows, and invite them as one batch to the default
 * cohort with the default lifetime, each in its own language. The send runs
 * through the re-sign-in (ADMIN-008b); its answer is the Invitations alert.
 */
export default function WaitlistTab() {
  const { t } = useTranslation()
  const reauth = useReauthRetry()
  const [picked, setPicked] = useState([])
  const [pressedEmpty, setPressedEmpty] = useState(false)
  const clear = () => {
    setPicked([])
    setPressedEmpty(false)
  }
  const filters = useFilters(clear)
  const list = useWaitlist({ state: filters.state, locale: filters.locale })
  const { data: cohorts } = useInviteCohorts()
  const sender = useWaitlistInvite({ run: reauth.run })
  const selected = pruneSelection(picked, list.rows)
  const cohort = cohorts?.default_cohort ?? DEFAULT_COHORT
  const lifetime = cohorts?.default_lifetime ?? DEFAULT_LIFETIME_DAYS
  const left = cohorts?.invitations_left_today ?? null

  const toggle = (row) => {
    setPressedEmpty(false)
    setPicked(toggleRow(selected, row))
  }
  const invite = async () => {
    if (selected.length === 0) return setPressedEmpty(true)
    if (await sender.invite({ ids: selected, cohort, expiresInDays: lifetime })) clear()
    return undefined
  }

  return (
    <Stack component='section' gap={1.5} aria-label={t('admin.wl.list.title')} sx={{ minWidth: 0 }}>
      <WaitlistFilters
        state={filters.state}
        locale={filters.locale}
        totals={list.totals}
        onState={filters.setState}
        onLocale={filters.setLocale}
      />
      <Stack gap={0.75}>
        <WaitlistBar
          allState={selectAllState(list.rows, selected)}
          count={selected.length}
          locale={filters.locale}
          cohort={cohort}
          sending={sender.sending}
          onToggleAll={() => setPicked(toggleAll(list.rows, selected))}
          onClear={clear}
          onInvite={invite}
        />
        {left != null && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', px: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {t('admin.inv.bar.left', { count: left })}
          </Typography>
        )}
      </Stack>
      <Box role='status' aria-live='polite'>
        {pressedEmpty && (
          <Typography level='body-sm' sx={{ color: 'danger.plainColor' }}>
            {t('admin.wl.bar.tickFirst')}
          </Typography>
        )}
        <SendResult outcome={sender.outcome} rows />
      </Box>
      <WaitlistList list={list} state={filters.state} locale={filters.locale} selected={selected} onToggle={toggle} />
      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        {t('admin.wl.caption')}
      </Typography>
      <AdminReauthDialog reauth={reauth} />
    </Stack>
  )
}
