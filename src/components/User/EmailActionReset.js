import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, FormControl, FormHelperText, FormLabel, Input, Stack } from '@mui/joy'
import { LockRounded } from '@mui/icons-material'
import AuthShell from './AuthShell'
import { authService } from '@nowry/core/api/services/auth.service'
import { passwordLongEnough } from '@nowry/core/domain/authRules'
import { ActionResult, ActionWorking } from './EmailActionParts'

/**
 * A password-reset link, opened (MAIL-005, FR-022).
 *
 * Opening the link changes nothing: the code is only checked, to learn whose
 * password it is for. The password changes when the form is submitted, so a
 * mail scanner that opens the link first leaves the account as it was.
 */

const problems = (password, again, t) => {
  const found = {}
  if (!passwordLongEnough(password)) found.password = t('auth.errors.passwordLength')
  if (password !== again) found.again = t('auth.errors.passwordMismatch')
  return found
}

const PasswordField = ({ label, value, onChange, error, autoFocus = false }) => (
  <FormControl error={Boolean(error)}>
    <FormLabel>{label}</FormLabel>
    <Input
      type='password'
      autoComplete='new-password'
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      startDecorator={<LockRounded />}
      size='lg'
    />
    {error && <FormHelperText>{error}</FormHelperText>}
  </FormControl>
)

PasswordField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  autoFocus: PropTypes.bool
}

/** The form: nothing about the account changes until it is submitted. */
const ResetForm = ({ code, email, onSignInNeeded }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [fields, setFields] = useState({ password: '', again: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    const found = problems(fields.password, fields.again, t)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setFailed(false)
    try {
      await authService.confirmReset(code, fields.password)
    } catch (error) {
      setSaving(false)
      return error?.code === 'auth/weak-password' ? setErrors({ password: t('auth.errors.passwordLength') }) : setFailed(true)
    }
    // Signed in with the new password when that works; the sign-in page when it does not.
    await authService.login(email, fields.password).then(() => navigate('/', { replace: true }), onSignInNeeded)
  }

  return (
    <form onSubmit={save} noValidate>
      {/* Outside the Stack: an empty live region inside it would still take a gap. */}
      <div aria-live='polite'>
        {failed && (
          <Alert color='danger' variant='soft' sx={{ mb: 2.5 }}>
            {t('auth.action.resetFailed')}
          </Alert>
        )}
      </div>
      <Stack spacing={2.5}>
        <PasswordField
          label={t('auth.resetPassword.newPasswordLabel')}
          value={fields.password}
          onChange={(password) => setFields({ ...fields, password })}
          error={errors.password}
          autoFocus
        />
        <PasswordField
          label={t('auth.resetPassword.confirmNewPasswordLabel')}
          value={fields.again}
          onChange={(again) => setFields({ ...fields, again })}
          error={errors.again}
        />
        <Button type='submit' size='lg' fullWidth loading={saving}>
          {t('auth.action.resetSubmit')}
        </Button>
      </Stack>
    </form>
  )
}

ResetForm.propTypes = { code: PropTypes.string.isRequired, email: PropTypes.string.isRequired, onSignInNeeded: PropTypes.func.isRequired }

const EmailActionReset = ({ code }) => {
  const { t } = useTranslation()
  const [stage, setStage] = useState({ name: 'working', email: '' }) // working | form | used | done

  useEffect(() => {
    let live = true
    authService.checkResetCode(code).then(
      (email) => live && setStage({ name: 'form', email }),
      () => live && setStage({ name: 'used', email: '' })
    )
    return () => {
      live = false
    }
  }, [code])

  if (stage.name === 'working') return <ActionWorking />
  if (stage.name === 'used') {
    return (
      <ActionResult
        title={t('auth.action.usedTitle')}
        body={t('auth.action.usedBody')}
        to='/resetPassword'
        label={t('auth.action.resetAgain')}
      />
    )
  }
  if (stage.name === 'done') {
    return (
      <ActionResult
        title={t('auth.action.resetDoneTitle')}
        body={t('auth.action.resetDoneBody')}
        to='/login'
        label={t('auth.action.signIn')}
      />
    )
  }
  return (
    <AuthShell title={t('auth.action.resetTitle')} subtitle={t('auth.action.resetFor', { email: stage.email })}>
      <ResetForm code={code} email={stage.email} onSignInNeeded={() => setStage({ name: 'done', email: stage.email })} />
    </AuthShell>
  )
}

EmailActionReset.propTypes = { code: PropTypes.string.isRequired }

export default EmailActionReset
