import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Divider, FormControl, FormHelperText, FormLabel, Input, Modal, ModalDialog, Stack, Typography } from '@mui/joy'
import { Google } from '@mui/icons-material'
import { focusRing } from './Form/formStyles'

const footerSx = {
  display: 'flex',
  // BUTTONS.md §6: Cancel on the left, the action on the right; stacked on xs, Cancel first.
  flexDirection: { xs: 'column', sm: 'row' },
  justifyContent: 'space-between',
  gap: 1.5,
  '& > button': { width: { xs: '100%', sm: 'auto' }, ...focusRing }
}

/**
 * The one re-sign-in dialog (ADMIN-008b, ADR-089, board J): "Sign in again to …",
 * the ways this account signs in — Google, its password, or both with Google
 * first — and a footer of Cancel and "Sign in and <action>". Account deletion and
 * every admin write draw it; the caller names the action and does it after.
 *
 * @param {{
 *   open: boolean, title: string, body: React.ReactNode, methods: Array<'google'|'password'>,
 *   confirmLabel: string, confirmColor?: 'primary'|'danger', confirmDecorator?: React.ReactNode,
 *   passwordLabel?: string, busy?: boolean, error?: string|null, passwordError?: boolean,
 *   onCancel: () => void, onSubmit: (proof: {method: 'google'|'password', password?: string}) => void
 * }} props
 */
export default function ReauthDialog({
  open,
  title,
  body,
  methods,
  confirmLabel,
  confirmColor = 'primary',
  confirmDecorator,
  passwordLabel,
  busy = false,
  error = null,
  passwordError = false,
  onCancel,
  onSubmit
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const hasPassword = methods.includes('password')
  const hasGoogle = methods.includes('google')

  useEffect(() => {
    if (!open) setPassword('')
  }, [open])

  const close = () => {
    if (!busy) onCancel()
  }
  const submit = (event) => {
    event?.preventDefault()
    onSubmit(hasPassword ? { method: 'password', password } : { method: 'google' })
  }

  return (
    <Modal open={open} onClose={close}>
      <ModalDialog
        role='dialog'
        aria-labelledby='reauth-title'
        aria-describedby='reauth-body'
        sx={{
          width: { xs: '95%', sm: 440 },
          maxWidth: 440,
          p: 3,
          gap: 2.5,
          borderRadius: 'lg',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack spacing={0.5}>
          <Typography id='reauth-title' component='h2' level='title-lg'>
            {title}
          </Typography>
          <Typography id='reauth-body' level='body-sm' sx={{ color: 'text.secondary' }}>
            {body}
          </Typography>
        </Stack>

        <Stack component='form' spacing={2} onSubmit={submit}>
          {hasGoogle && hasPassword && (
            <>
              <Button
                variant='soft'
                color='neutral'
                size='lg'
                startDecorator={<Google />}
                disabled={busy}
                onClick={() => onSubmit({ method: 'google' })}
                aria-label={t('reauth.google')}
                sx={focusRing}
              >
                {t('reauth.google')}
              </Button>
              <Divider sx={{ color: 'text.tertiary', typography: 'body-xs' }}>{t('reauth.orPassword')}</Divider>
            </>
          )}
          {hasPassword && (
            <FormControl required error={passwordError}>
              <FormLabel>{passwordLabel ?? t('reauth.passwordLabel')}</FormLabel>
              <Input
                type='password'
                name='current-password'
                autoComplete='current-password'
                size='lg'
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error && passwordError && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
          )}
          {error && !passwordError && (
            <Typography level='body-sm' role='alert' sx={{ color: 'danger.plainColor' }}>
              {error}
            </Typography>
          )}
        </Stack>

        <Stack sx={footerSx}>
          <Button variant='plain' color='neutral' size='lg' onClick={close} disabled={busy} aria-label={t('common.cancel')}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={confirmColor === 'danger' ? 'soft' : 'solid'}
            color={confirmColor}
            size='lg'
            loading={busy}
            startDecorator={!busy && (confirmDecorator ?? (!hasPassword ? <Google /> : null))}
            onClick={submit}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
