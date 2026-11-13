import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, FormControl, FormHelperText, FormLabel, Input, Modal, ModalDialog, Stack, Typography } from '@mui/joy'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import { useAccountDeletion } from '@nowry/core/hooks/useAccountDeletion'

/**
 * Delete the account (ADR-081): type the email to confirm; if the sign-in is
 * more than five minutes old, sign in again inside the dialog first (ADR-089,
 * FR-038) — the password, or Google for a Google-only account.
 */
export default function DeleteAccountDialog({ open, onClose, email }) {
  const { t, i18n } = useTranslation()
  const [typedEmail, setTypedEmail] = useState('')
  const [password, setPassword] = useState('')
  const deletion = useAccountDeletion({
    email,
    language: i18n.language,
    onDeleted: () => {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  })
  const { step, busy, error, method, confirm, reauthenticateAndDelete, reset } = deletion
  const reauth = step === 'reauth'
  const matches = Boolean(typedEmail) && typedEmail === email

  useEffect(() => {
    if (!open) {
      setTypedEmail('')
      setPassword('')
      reset()
    }
  }, [open, reset])

  const close = () => {
    if (!busy) onClose()
  }
  const submit = () => {
    if (reauth) reauthenticateAndDelete(method === 'password' ? password : undefined)
    else confirm(typedEmail)
  }
  const errorText = error ? (typeof error === 'string' ? t(error) : error.detail) : null

  return (
    <Modal open={open} onClose={close}>
      <ModalDialog
        role='alertdialog'
        aria-labelledby='delete-account-title'
        sx={{
          width: { xs: '95%', sm: '85%', md: '520px' },
          maxWidth: '520px',
          maxHeight: { xs: '95vh', md: '90vh' },
          overflowY: 'auto',
          p: 0,
          borderRadius: { xs: 'lg', md: 'xl' },
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 'full',
                bgcolor: 'danger.softBg',
                color: 'danger.plainColor',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <WarningRoundedIcon sx={{ fontSize: 'xl2' }} />
            </Box>
            <Typography id='delete-account-title' level='title-lg' sx={{ m: 0, fontWeight: 'xl', lineHeight: 1 }}>
              {reauth ? t('settings.deleteAccount.reauth.title') : t('settings.deleteAccount.title')}
            </Typography>
          </Stack>
        </Box>

        <Box
          component='form'
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          sx={{ px: 3, py: 3 }}
        >
          <Stack spacing={3}>
            {reauth ? (
              <>
                <Typography level='body-md' sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                  {method === 'password' ? t('settings.deleteAccount.reauth.body') : t('settings.deleteAccount.reauth.googleBody')}
                </Typography>
                {method === 'password' && (
                  <FormControl required error={error === 'settings.deleteAccount.reauth.wrongPassword'}>
                    <FormLabel>{t('settings.deleteAccount.reauth.passwordLabel')}</FormLabel>
                    <Input
                      type='password'
                      name='current-password'
                      autoComplete='current-password'
                      size='lg'
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </FormControl>
                )}
              </>
            ) : (
              <>
                <Typography level='body-md' sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                  {t('settings.deleteAccount.message')}
                </Typography>
                <FormControl required>
                  <FormLabel sx={{ fontWeight: 'md' }}>{t('settings.deleteAccount.emailLabel')}</FormLabel>
                  <Input
                    type='email'
                    name='confirm-email'
                    size='lg'
                    autoFocus
                    placeholder={t('settings.deleteAccount.emailPlaceholder')}
                    value={typedEmail}
                    onChange={(e) => setTypedEmail(e.target.value)}
                  />
                  {typedEmail && !matches && (
                    <FormHelperText sx={{ color: 'danger.plainColor' }}>{t('settings.deleteAccount.emailMismatch')}</FormHelperText>
                  )}
                  {!typedEmail && (
                    <FormHelperText sx={{ color: 'text.tertiary' }}>{t('settings.deleteAccount.emailRequired')}</FormHelperText>
                  )}
                </FormControl>
                <Box sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1', border: '1px solid', borderColor: 'divider' }}>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
                    {t('settings.deleteAccount.recoveryNotice')}
                  </Typography>
                </Box>
              </>
            )}
            {errorText && (
              <Typography level='body-sm' role='alert' sx={{ color: 'danger.plainColor' }}>
                {errorText}
              </Typography>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'flex-end',
            gap: 2
          }}
        >
          <Button variant='soft' color='neutral' size='lg' onClick={close} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='soft'
            color='danger'
            size='lg'
            loading={busy}
            disabled={!reauth && !matches}
            onClick={submit}
            startDecorator={!busy && <DeleteForeverRoundedIcon />}
          >
            {reauth
              ? method === 'google'
                ? t('settings.deleteAccount.reauth.googleButton')
                : t('settings.deleteAccount.reauth.confirm')
              : matches
                ? t('settings.deleteAccount.confirmEnabled')
                : t('settings.deleteAccount.confirmDisabled')}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
