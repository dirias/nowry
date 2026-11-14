import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { authService } from '@nowry/core/api/services/auth.service'
import { ActionResult, ActionWorking } from './EmailActionParts'

/**
 * A verification link, opened (MAIL-005, FR-022).
 *
 * Confirms on load: opening the link is the whole act, so a mail scanner that
 * opens it first does what the person would have done. A code that no longer
 * works is not a failure when the address is already confirmed.
 */

// One request per code, however often the page mounts: a second one would find the code spent.
const applied = new Map()
const applyOnce = (code) => {
  if (!applied.has(code)) applied.set(code, authService.applyEmailCode(code))
  return applied.get(code)
}

/** Where a confirmed person goes next: back to a waiting sign-up, into Nowry, or to sign in. */
const nextStep = (signedIn) => {
  // `finish=1`: the confirm step finishes on arrival, with no second press (E2E-006).
  if (authService.heldSignUp()) return { to: '/register?finish=1', label: 'auth.action.finish' }
  return signedIn ? { to: '/', label: 'auth.action.open' } : { to: '/login', label: 'auth.action.signIn' }
}

const confirm = async (code) => {
  const user = await authService.whenReady()
  try {
    await applyOnce(code)
    return { confirmed: true, signedIn: Boolean(user) }
  } catch (error) {
    const already = user ? await authService.confirmVerification().catch(() => false) : false
    return { confirmed: already, signedIn: Boolean(user) }
  }
}

const EmailActionVerify = ({ code }) => {
  const { t } = useTranslation()
  const [outcome, setOutcome] = useState(null)

  useEffect(() => {
    let live = true
    confirm(code).then((result) => live && setOutcome(result))
    return () => {
      live = false
    }
  }, [code])

  if (!outcome) return <ActionWorking />
  if (!outcome.confirmed) {
    const to = outcome.signedIn ? '/settings' : '/login'
    const body = `${t('auth.action.usedBody')} ${t('auth.action.verifyAgain')}`
    return (
      <ActionResult
        title={t('auth.action.usedTitle')}
        body={body}
        to={to}
        label={t(outcome.signedIn ? 'auth.action.open' : 'auth.action.signIn')}
      />
    )
  }
  const next = nextStep(outcome.signedIn)
  return <ActionResult title={t('auth.action.verifiedTitle')} body={t('auth.action.verifiedBody')} to={next.to} label={t(next.label)} />
}

EmailActionVerify.propTypes = { code: PropTypes.string.isRequired }

export default EmailActionVerify
