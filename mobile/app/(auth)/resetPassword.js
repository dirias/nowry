/**
 * Send a password reset email (MOB-016), on the shared AuthShell (SITE-010).
 *
 * Success is stated rather than navigated away from. The user has to go and
 * read an email, so the screen that told them to is the right place to still be
 * standing when they come back. The copy says what actually arrives — a link —
 * through the shared keys, so the web says the same (PRD D-M4).
 *
 * The message is the same whether or not the address has an account, for the
 * same reason a wrong password and an unknown account share one message: the
 * difference tells an attacker which addresses are registered.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services'
import { authErrorKey } from '@nowry/core/domain/authErrors'
import { Box, Button, FormField, Input, Stack, Typography } from '../../src/ui'
import { AuthFooter, AuthShell } from '../../src/ui/patterns/AuthShell'

export default function ResetPassword() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!email.trim()) {
      setErrors({ email: 'auth.errors.emailRequired' })
      return
    }
    setErrors({})
    setBusy(true)
    try {
      // The reset email is sent in the user's language, which is why the
      // service takes one.
      await authService.resetPassword(email.trim(), i18n.language)
      setSent(true)
    } catch (error) {
      setErrors({ form: authErrorKey(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.title')}
      subtitle={t('auth.resetPassword.subtitle.step1')}
      backHref='/login'
      footer={<AuthFooter href='/login' label={t('auth.resetPassword.backToLogin')} />}
    >
      {sent ? (
        // The mail is sent, so the screen says what to do next — on a ground,
        // not a hue: nothing went wrong.
        <Box bg='background.level1' padding={2} radius='lg'>
          <Stack spacing={1}>
            <Typography level='title-md'>{t('auth.resetPassword.successTitle')}</Typography>
            <Typography level='body-sm' color='text.secondary' accessibilityLiveRegion='polite'>
              {t('auth.resetPassword.successMsg')}
            </Typography>
          </Stack>
        </Box>
      ) : (
        <>
          {errors.form ? (
            <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t(errors.form)}
            </Typography>
          ) : null}

          <FormField labelKey='auth.email' errorKey={errors.email}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              accessibilityLabel={t('auth.email')}
              invalid={Boolean(errors.email)}
              keyboardType='email-address'
              autoCapitalize='none'
              autoComplete='email'
              textContentType='emailAddress'
              returnKeyType='go'
              onSubmitEditing={submit}
            />
          </FormField>

          <Button size='lg' onPress={submit} loading={busy} accessibilityLabel={t('auth.resetPassword.sendCode')}>
            {t('auth.resetPassword.sendCode')}
          </Button>
        </>
      )}
    </AuthShell>
  )
}
