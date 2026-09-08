/**
 * Send a password reset email (MOB-016).
 *
 * Success is stated rather than navigated away from. The user has to go and
 * read an email, so the screen that told them to is the right place to still be
 * standing when they come back.
 *
 * The message is the same whether or not the address has an account, for the
 * same reason a wrong password and an unknown account share one message: the
 * difference tells an attacker which addresses are registered.
 */
import { useState } from 'react'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services'
import { authErrorKey } from '@nowry/core/domain/authErrors'
import { Button, FormField, Input, Screen, Stack, Typography } from '../../src/ui'

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
    <Screen>
      <Stack spacing={3} justifyContent='center' flex={1}>
        <Typography level='h2'>{t('auth.resetPassword')}</Typography>

        {sent ? (
          <Typography level='body-md' color='text.secondary' accessibilityLiveRegion='polite'>
            {t('auth.success')}
          </Typography>
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

            <Button onPress={submit} loading={busy} accessibilityLabel={t('auth.resetPassword')}>
              {t('auth.resetPassword')}
            </Button>
          </>
        )}

        <Link href='/login' asChild>
          <Button variant='tertiary' size='sm'>
            {t('auth.signInLink')}
          </Button>
        </Link>
      </Stack>
    </Screen>
  )
}
