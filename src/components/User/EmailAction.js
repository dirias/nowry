import React, { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import EmailActionVerify from './EmailActionVerify'
import EmailActionReset from './EmailActionReset'

/**
 * Where a link in a Nowry email lands (MAIL-005, ADR-078 point 5, FR-022).
 *
 * `/auth/action?mode=verifyEmail|resetPassword&oobCode=…`. The code is
 * Firebase's; this page hands it over. It is read once and then taken out of
 * the address bar, so it is not left in the history or copied with the address.
 * Public: the link may be opened on a device that is not signed in.
 */

const MODES = { verifyEmail: EmailActionVerify, resetPassword: EmailActionReset }

const EmailAction = () => {
  const [params, setParams] = useSearchParams()
  const [link] = useState(() => ({ mode: params.get('mode'), code: params.get('oobCode') }))

  const Mode = MODES[link.mode]
  const usable = Boolean(Mode && link.code)

  useEffect(() => {
    if (usable && params.has('oobCode')) setParams({}, { replace: true })
  }, [usable, params, setParams])

  if (!usable) return <Navigate to='/' replace />
  return <Mode code={link.code} />
}

export default EmailAction
