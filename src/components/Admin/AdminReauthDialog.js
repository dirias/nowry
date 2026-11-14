import React from 'react'
import { useTranslation } from 'react-i18next'
import ReauthDialog from '../Common/ReauthDialog'

/** When the last sign-in was, in the admin's language, or null. */
const formatSignIn = (seconds, language) => {
  if (!Number.isFinite(Number(seconds)) || !seconds) return null
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(seconds) * 1000))
  } catch {
    return null
  }
}

/**
 * The shared re-sign-in dialog worded for an admin write (ADMIN-008b, FR-010,
 * board J): "Sign in again to send invitations" … "Sign in and send". `reauth`
 * is `useReauthRetry()`; after the sign-in the write the admin asked for runs.
 */
export default function AdminReauthDialog({ reauth }) {
  const { t, i18n } = useTranslation()
  const action = reauth.pending?.action ?? 'send'
  const when = formatSignIn(reauth.pending?.lastSignIn, i18n?.language)
  const body = [t('admin.reauth.body'), when ? t('admin.reauth.lastSignIn', { when }) : null, t('admin.reauth.nothingYet')]
    .filter(Boolean)
    .join(' ')

  return (
    <ReauthDialog
      open={Boolean(reauth.pending)}
      title={t(`admin.reauth.${action}.title`)}
      body={body}
      methods={reauth.methods}
      confirmLabel={t(`admin.reauth.${action}.confirm`)}
      busy={reauth.busy}
      error={reauth.error ? t(reauth.error) : null}
      passwordError={reauth.error === 'reauth.wrongPassword'}
      onCancel={reauth.cancel}
      onSubmit={reauth.signIn}
    />
  )
}
