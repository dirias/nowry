import React from 'react'
import { Stack } from '@mui/joy'
import { useReauthRetry } from '@nowry/core/hooks/useReauthRetry'
import AdminReauthDialog from '../AdminReauthDialog'
import InviteForm from './InviteForm'
import InviteList from './InviteList'

/**
 * The Invitations tab (ADMIN-007a, FR-012): the paste-and-send card above the
 * list. Every write here — check, send, resend, invite again, revoke — runs
 * through one re-sign-in (ADMIN-008b): an old sign-in opens the dialog, and
 * the write runs once more after it.
 */
export default function InvitationsTab() {
  const reauth = useReauthRetry()
  return (
    <Stack gap={3} sx={{ minWidth: 0 }}>
      <InviteForm run={reauth.run} />
      <InviteList run={reauth.run} />
      <AdminReauthDialog reauth={reauth} />
    </Stack>
  )
}
