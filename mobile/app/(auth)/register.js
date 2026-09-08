/**
 * Create an account (MOB-016).
 *
 * `createUserWithEmailAndPassword` works on React Native unchanged, so this is
 * the shared `authService.register` with no mobile-specific path.
 *
 * The confirmation field is checked here rather than by the server, because it
 * is the one validation the server cannot do: it never sees the second value.
 */
import { useState } from 'react'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services'
import { authErrorKey } from '@nowry/core/domain/authErrors'
import { Button, FormField, Input, Screen, Stack, Typography } from '../../src/ui'

const MIN_PASSWORD = 6

export default function Register() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const next = {}
    if (!username.trim()) next.username = 'auth.errors.usernameRequired'
    if (!email.trim()) next.email = 'auth.errors.emailRequired'
    if (!password) next.password = 'auth.errors.passwordRequired'
    else if (password.length < MIN_PASSWORD) next.password = 'auth.errors.passwordLength'
    if (confirm !== password) next.confirm = 'auth.errors.passwordMismatch'
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

  return (
    <Screen>
      <Stack spacing={3} justifyContent='center' flex={1}>
        <Stack spacing={1}>
          <Typography level='h2'>{t('auth.createAccount')}</Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('auth.createAccountSubtitle')}
          </Typography>
        </Stack>

        {errors.form ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t(errors.form)}
          </Typography>
        ) : null}

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

        <Button onPress={submit} loading={busy} accessibilityLabel={t('auth.signUp')}>
          {t('auth.signUp')}
        </Button>

        <Link href='/login' asChild>
          <Button variant='tertiary' size='sm'>
            {t('auth.signInLink')}
          </Button>
        </Link>
      </Stack>
    </Screen>
  )
}
