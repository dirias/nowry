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
import { useAuth } from '@nowry/core/context/AuthContext'
import { signInProblem, signInProblemKey } from '@nowry/core/domain/signInProblem'
import { Button, FormField, Input, Stack, Typography } from '../../src/ui'
import { AuthDivider, AuthFooter, AuthLegal, AuthShell } from '../../src/ui/patterns/AuthShell'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  // Why the last sign-in had no account to open (ADR-083), kept by the auth
  // context when the profile read met it; shown until the next attempt.
  const { signInProblem: keptProblem, clearSignInProblem } = useAuth()
  // The private beta names the waitlist, as Register does (ADR-083 case 3).
  const formKey = errors.form ?? (keptProblem === 'invite' ? 'beta.phone.inviteRequired' : signInProblemKey(keptProblem))

  /*
   * ADR-038, ADR-083: an identity the API will not answer with an account (no
   * invite, an unconfirmed address, no account, a conflict) is signed out and
   * told which. Anything else reads through the shared Firebase table.
   */
  const failWith = async (error) => {
    const reason = signInProblem(error)
    if (reason) await authService.logout().catch(() => {})
    setErrors({ form: reason === 'invite' ? 'beta.phone.inviteRequired' : reason ? signInProblemKey(reason) : authErrorKey(error) })
  }

  const submit = async () => {
    const next = {}
    if (!email.trim()) next.email = 'auth.errors.emailRequired'
    if (!password) next.password = 'auth.errors.passwordRequired'
    setErrors(next)
    if (Object.keys(next).length) return

    clearSignInProblem()
    setBusy(true)
    try {
      await authService.login(email.trim(), password)
      // No navigation here: AuthGate moves us the moment the session resolves,
      // so success has exactly one code path whatever caused it.
    } catch (error) {
      await failWith(error)
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
    clearSignInProblem()
    setGoogleBusy(true)
    try {
      // null means the user dismissed the browser. Nothing to say about that.
      await authService.loginWithGoogle()
    } catch (error) {
      await failWith(error)
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
      {formKey ? (
        <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
          {t(formKey)}
        </Typography>
      ) : null}

      <Stack spacing={2}>
        <FormField labelKey='auth.email' errorKey={errors.email}>
          <Input
            startGlyph='Mail'
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
            startGlyph='Lock'
            value={password}
            onChangeText={setPassword}
            accessibilityLabel={t('auth.password')}
            invalid={Boolean(errors.password)}
            secure
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

      <AuthDivider />

      <Button
        variant='secondary'
        size='lg'
        onPress={submitGoogle}
        loading={googleBusy}
        startGlyph={
          <Typography level='title-md' weight='xl'>
            G
          </Typography>
        }
        accessibilityLabel={t('auth.signInGoogle')}
      >
        {t('auth.signInGoogle')}
      </Button>

      {/* The web shows this under both forms; the phone's Sign in had lost it (canvas flag 8). */}
      <AuthLegal />
    </AuthShell>
  )
}
