import React from 'react'
import { Stack } from '@mui/joy'
import { useSearchParams } from 'react-router-dom'
import { INVITE_STATES } from '@nowry/core/domain/invitations'
import { useReauthRetry } from '@nowry/core/hooks/useReauthRetry'
import AdminReauthDialog from '../AdminReauthDialog'
import InviteForm from './InviteForm'
import InviteList from './InviteList'

/**
 * The Invitations tab (ADMIN-007a, FR-012): the paste-and-send card above the
 * list. Every write here — check, send, resend, invite again, revoke — runs
 * through one re-sign-in (ADMIN-008b): an old sign-in opens the dialog, and
 * the write runs once more after it. `?state=open` opens the list filtered to
 * that state (the Overview's "Invitations ending in 3 days", board A).
 */
export default function InvitationsTab() {
  const reauth = useReauthRetry()
  const [params] = useSearchParams()
  const asked = params.get('state')
  const initialState = INVITE_STATES.includes(asked) ? asked : null
  return (
    <Stack gap={3} sx={{ minWidth: 0 }}>
      <InviteForm run={reauth.run} />
      <InviteList run={reauth.run} initialState={initialState} />
      <AdminReauthDialog reauth={reauth} />
    </Stack>
  )
}
