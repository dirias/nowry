/**
 * Sign in with email (MOB-016), on the shared AuthShell (SITE-010).
 *
 * Every Firebase call here works on React Native unchanged — `signInWithEmailAndPassword`
 * through the shared `authService`. Google is the one exception (ADR-028, MOB-017).
 *
 * The error text comes from `authErrorKey` in @nowry/core, the same table the
 * web screens read, so a wrong password says the same thing on both clients by
 * construction rather than by two switches that agree today.
 *
 * The primary is never disabled to enforce validation (BUTTONS.md §4). An empty
 * field fails loudly under the field on press; a grey button that will not say
 * why is a dead end.
 */
import { useState } from 'react'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services'
import { authErrorKey } from '@nowry/core/domain/authErrors'
import { Button, Divider, FormField, Input, Stack, Typography } from '../../src/ui'
import { AuthFooter, AuthShell } from '../../src/ui/patterns/AuthShell'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  const submit = async () => {
    const next = {}
    if (!email.trim()) next.email = 'auth.errors.emailRequired'
    if (!password) next.password = 'auth.errors.passwordRequired'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await authService.login(email.trim(), password)
      // No navigation here: AuthGate moves us the moment the session resolves,
      // so success has exactly one code path whatever caused it.
    } catch (error) {
      setErrors({ form: authErrorKey(error) })
    } finally {
      // The password is never logged and never stored. It leaves this scope here.
      setPassword('')
      setBusy(false)
    }
  }

  /*
   * Google is the one path that differs per client (ADR-028). `signInWithGoogle`
   * resolves to null when the user dismissed the browser, and that is a decision
   * rather than a failure — showing "sign-in failed" because someone changed
   * their mind is the app arguing with them.
   */
  const submitGoogle = async () => {
    setErrors({})
    setGoogleBusy(true)
    try {
      // null means the user dismissed the browser. Nothing to say about that.
      await authService.loginWithGoogle()
    } catch (error) {
      setErrors({ form: authErrorKey(error) })
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      subtitle={t('auth.signInSubtitle')}
      footer={<AuthFooter prompt={t('auth.newHere')} href='/register' label={t('landing.hero.cta')} />}
    >
      {errors.form ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t(errors.form)}
        </Typography>
      ) : null}

      <Stack spacing={2}>
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
            returnKeyType='next'
          />
        </FormField>

        <FormField labelKey='auth.password' errorKey={errors.password}>
          <Input
            value={password}
            onChangeText={setPassword}
            accessibilityLabel={t('auth.password')}
            invalid={Boolean(errors.password)}
            secureTextEntry
            autoCapitalize='none'
            autoComplete='current-password'
            textContentType='password'
            returnKeyType='go'
            onSubmitEditing={submit}
          />
        </FormField>

        <Stack direction='row'>
          <Link href='/resetPassword' asChild>
            <Button variant='tertiary' size='sm'>
              {t('auth.forgotPassword')}
            </Button>
          </Link>
        </Stack>
      </Stack>

      <Button size='lg' onPress={submit} loading={busy} accessibilityLabel={t('auth.signIn')}>
        {t('auth.signIn')}
      </Button>

      <Stack direction='row' alignItems='center' spacing={1.5}>
        <Typography level='body-xs' color='text.tertiary'>
          {t('auth.orContinueWith')}
        </Typography>
        <Divider style={{ flex: 1 }} />
      </Stack>

      <Button variant='secondary' size='lg' onPress={submitGoogle} loading={googleBusy} accessibilityLabel={t('auth.signInGoogle')}>
        {t('auth.signInGoogle')}
      </Button>
    </AuthShell>
  )
}
