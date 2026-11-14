/**
 * Settings → Security on the phone (ADR-092, FR-044..046): change the password
 * with the current one, or set one on a Google-only account after the native
 * Google sheet. The same hook and words as the web.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePasswordSettings } from '@nowry/core/hooks/usePasswordSettings'
import { Button, FormField, Input, Stack, Typography } from '../ui'

export function PasswordSettings() {
  const { t, i18n } = useTranslation()
  const { mode, googleConnected, busy, error, done, change, setWithGoogle } = usePasswordSettings(i18n.language)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  if (!mode) return null
  const setting = mode === 'set'

  const submit = async () => {
    const ok = setting ? await setWithGoogle(next, confirmation) : await change(current, next, confirmation)
    if (ok) {
      setCurrent('')
      setNext('')
      setConfirmation('')
    }
  }

  return (
    <Stack spacing={2} testID='password-settings'>
      <Typography level='title-md'>{t('settings.security.title')}</Typography>
      <Typography level='title-sm'>{t(setting ? 'settings.security.setPassword' : 'settings.security.changePassword')}</Typography>
      <Typography level='body-sm' color='text.secondary'>
        {setting ? t('settings.security.setPasswordBody') : t('settings.security.otherDevices')}
      </Typography>
      {googleConnected ? (
        <Typography level='body-sm' color='text.secondary'>
          {t('settings.security.googleConnected')}
        </Typography>
      ) : null}
      {setting ? null : (
        <FormField labelKey='settings.security.currentPassword'>
          <Input
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoCapitalize='none'
            textContentType='password'
            accessibilityLabel={t('settings.security.currentPassword')}
          />
        </FormField>
      )}
      <FormField labelKey='settings.security.newPassword'>
        <Input
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize='none'
          textContentType='newPassword'
          accessibilityLabel={t('settings.security.newPassword')}
        />
      </FormField>
      <FormField labelKey='settings.security.confirmPassword'>
        <Input
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoCapitalize='none'
          textContentType='newPassword'
          accessibilityLabel={t('settings.security.confirmPassword')}
        />
      </FormField>
      {error ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t(error.key, error.values)}
        </Typography>
      ) : null}
      {done ? (
        <Typography level='body-sm' color='success.plainColor' accessibilityLiveRegion='polite'>
          {t(done === 'set' ? 'settings.security.passwordSet' : 'settings.security.passwordChanged')}
        </Typography>
      ) : null}
      <Button variant='secondary' onPress={submit} loading={busy}>
        {t(setting ? 'settings.security.setPasswordGoogle' : 'settings.security.save')}
      </Button>
    </Stack>
  )
}
