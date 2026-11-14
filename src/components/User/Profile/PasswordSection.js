import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, FormControl, FormLabel, Input, Stack, Typography } from '@mui/joy'
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded'
import { usePasswordSettings } from '@nowry/core/hooks/usePasswordSettings'

/**
 * Settings → Security, the password (ADR-092, FR-044..046).
 *
 * With a password: current, new and confirmation; the API checks the current
 * one, signs other devices out and emails a notice. Google-only: "Set a
 * password", confirmed with Google first. Both: Change password, and a line
 * that Google sign-in is also connected.
 */
export default function PasswordSection({ openOnArrival = false }) {
  const { t, i18n } = useTranslation()
  const { mode, googleConnected, busy, error, done, change, setWithGoogle, reset } = usePasswordSettings(i18n.language)
  const [open, setOpen] = useState(openOnArrival)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (openOnArrival) setOpen(true)
  }, [openOnArrival])

  if (!mode) return null
  const setting = mode === 'set'

  const close = () => {
    setOpen(false)
    setCurrent('')
    setNext('')
    setConfirmation('')
    reset()
  }
  const submit = async () => {
    const ok = setting ? await setWithGoogle(next, confirmation) : await change(current, next, confirmation)
    if (ok) {
      setOpen(false)
      setCurrent('')
      setNext('')
      setConfirmation('')
    }
  }

  return (
    <Box id='security-password' data-testid='password-section'>
      {done && (
        <Alert color='success' variant='soft' size='sm' role='status' sx={{ mb: 2 }}>
          {t(done === 'set' ? 'settings.security.passwordSet' : 'settings.security.passwordChanged')}
        </Alert>
      )}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={2} sx={{ mb: open ? 2 : 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography level='title-sm'>{t(setting ? 'settings.security.setPassword' : 'settings.security.changePassword')}</Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {setting ? t('settings.security.setPasswordBody') : t('settings.security.otherDevices')}
          </Typography>
          {googleConnected && (
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t('settings.security.googleConnected')}
            </Typography>
          )}
        </Box>
        {!open && (
          <Button
            variant='soft'
            color='neutral'
            size='sm'
            startDecorator={<VpnKeyRounded />}
            onClick={() => {
              reset()
              setOpen(true)
            }}
          >
            {t(setting ? 'settings.security.setPassword' : 'settings.security.changePasswordCta')}
          </Button>
        )}
      </Stack>

      {open && (
        <Stack
          component='form'
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {!setting && (
            <FormControl>
              <FormLabel>{t('settings.security.currentPassword')}</FormLabel>
              <Input
                type='password'
                name='current-password'
                autoComplete='current-password'
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </FormControl>
          )}
          <FormControl>
            <FormLabel>{t('settings.security.newPassword')}</FormLabel>
            <Input type='password' name='new-password' autoComplete='new-password' value={next} onChange={(e) => setNext(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>{t('settings.security.confirmPassword')}</FormLabel>
            <Input
              type='password'
              name='confirm-password'
              autoComplete='new-password'
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </FormControl>
          {error && (
            <Typography level='body-sm' role='alert' sx={{ color: 'danger.plainColor' }}>
              {t(error.key, error.values)}
            </Typography>
          )}
          <Stack direction='row' spacing={1}>
            <Button type='submit' size='sm' loading={busy}>
              {t(setting ? 'settings.security.setPasswordGoogle' : 'settings.security.save')}
            </Button>
            <Button size='sm' variant='plain' color='neutral' onClick={close} disabled={busy}>
              {t('common.cancel')}
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  )
}

PasswordSection.propTypes = { openOnArrival: PropTypes.bool }
