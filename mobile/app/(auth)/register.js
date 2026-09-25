/**
 * Create an account (MOB-016), on the shared AuthShell (SITE-010).
 *
 * `createUserWithEmailAndPassword` works on React Native unchanged, so this is
 * the shared `authService.register` with no mobile-specific path. Google is the
 * web's second way in and is now the phone's too (PRD D-M3): one account, one
 * contract — the same consent, the same password floor from `authRules`.
 *
 * The confirmation field is checked here rather than by the server, because it
 * is the one validation the server cannot do: it never sees the second value.
 */
import { useState } from 'react'
import { Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services'
import { authErrorKey } from '@nowry/core/domain/authErrors'
import { passwordLongEnough } from '@nowry/core/domain/authRules'
import { legalUrl } from '@nowry/core/constants/site'
import { Button, Checkbox, Divider, FormField, Input, Stack, Typography } from '../../src/ui'
import { AuthFooter, AuthShell } from '../../src/ui/patterns/AuthShell'

export default function Register() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  const submit = async () => {
    const next = {}
    if (!username.trim()) next.username = 'auth.errors.usernameRequired'
    if (!email.trim()) next.email = 'auth.errors.emailRequired'
    if (!password) next.password = 'auth.errors.passwordRequired'
    else if (!passwordLongEnough(password)) next.password = 'auth.errors.passwordLength'
    if (confirm !== password) next.confirm = 'auth.errors.passwordMismatch'
    if (!accepted) next.consent = 'auth.errors.termsRequired'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await authService.register(email.trim(), password, username.trim())
      // AuthGate moves us once the session resolves.
    } catch (error) {
      setErrors({ form: authErrorKey(error) })
    } finally {
      setPassword('')
      setConfirm('')
      setBusy(false)
    }
  }

  // The same path as Sign in (ADR-028): null means the browser was dismissed.
  const submitGoogle = async () => {
    setErrors({})
    setGoogleBusy(true)
    try {
      await authService.loginWithGoogle()
    } catch (error) {
      setErrors({ form: authErrorKey(error) })
    } finally {
      setGoogleBusy(false)
    }
  }

  // The phone has no legal routes; the web's pages are the contract (D-M6).
  const openLegal = (kind) => () => Linking.openURL(legalUrl(kind))

  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.createAccountSubtitle')}
      footer={<AuthFooter prompt={t('auth.hasAccount')} href='/login' label={t('auth.signInLink')} />}
    >
      {errors.form ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t(errors.form)}
        </Typography>
      ) : null}

      <Stack spacing={2}>
        <FormField labelKey='auth.username' errorKey={errors.username}>
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.usernamePlaceholder')}
            accessibilityLabel={t('auth.username')}
            invalid={Boolean(errors.username)}
            autoCapitalize='none'
            autoComplete='username'
            returnKeyType='next'
          />
        </FormField>

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
            autoComplete='new-password'
            textContentType='newPassword'
            returnKeyType='next'
          />
        </FormField>

        <FormField labelKey='auth.confirmPassword' errorKey={errors.confirm}>
          <Input
            value={confirm}
            onChangeText={setConfirm}
            accessibilityLabel={t('auth.confirmPassword')}
            invalid={Boolean(errors.confirm)}
            secureTextEntry
            autoCapitalize='none'
            autoComplete='new-password'
            textContentType='newPassword'
            returnKeyType='go'
            onSubmitEditing={submit}
          />
        </FormField>

        <Stack spacing={0.5}>
          <Checkbox
            checked={accepted}
            onPress={() => setAccepted((value) => !value)}
            accessibilityLabel={`${t('auth.agreeTerms')} ${t('auth.termsOfService')} ${t('auth.and')} ${t('auth.privacyPolicy')}`}
            label={
              <Typography level='body-sm' color='text.secondary' style={{ flex: 1 }}>
                {t('auth.agreeTerms')}{' '}
                <Typography level='body-sm' color='primary.plainColor' weight='lg' onPress={openLegal('terms')} accessibilityRole='link'>
                  {t('auth.termsOfService')}
                </Typography>{' '}
                {t('auth.and')}{' '}
                <Typography level='body-sm' color='primary.plainColor' weight='lg' onPress={openLegal('privacy')} accessibilityRole='link'>
                  {t('auth.privacyPolicy')}
                </Typography>
              </Typography>
            }
          />
          {errors.consent ? (
            <Typography level='body-xs' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t(errors.consent)}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Button size='lg' onPress={submit} loading={busy} accessibilityLabel={t('auth.signUp')}>
        {t('auth.signUp')}
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
