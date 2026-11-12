import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, Button, Skeleton, Stack } from '@mui/joy'

import { betaService } from '@nowry/core/api/services/beta.service'
import AuthShell from '../User/AuthShell'
import { ActionResult } from '../User/EmailActionParts'

/**
 * Where the leave link in a waitlist email lands (MAIL-008, FR-026, ADR-080; Design H).
 *
 * Opening the page removes no one: mail scanners open links, so it asks for
 * one press. It works signed out, in the language of the waitlist row when the
 * server knows it. An unknown or used link shows the same page without an
 * address, and gets the same answer.
 *
 * States: reading the link, asking, leaving, left, and a press that failed.
 */
const LOCALES = ['en', 'es', 'fr', 'de', 'ja']

const WaitlistLeave = () => {
  const { token } = useParams()
  const { t, i18n } = useTranslation()
  const [hint, setHint] = useState(null) // null while reading; then { email, locale }
  const [status, setStatus] = useState('asking') // asking | leaving | left | failed

  useEffect(() => {
    let current = true
    betaService
      .readWaitlistLeave(token)
      .then((data) => current && setHint({ email: data?.email_hint ?? null, locale: data?.locale ?? null }))
      .catch(() => current && setHint({ email: null, locale: null }))
    return () => {
      current = false
    }
  }, [token])

  // The row's language when it is one of ours; otherwise the one the page is already in.
  const lng = LOCALES.includes(hint?.locale) ? hint.locale : i18n.language
  const say = (key, options) => t(key, { ...options, lng })

  const leave = async () => {
    setStatus('leaving')
    try {
      await betaService.leaveWaitlist(token)
      setStatus('left')
    } catch (error) {
      setStatus('failed')
    }
  }

  if (hint === null) {
    return (
      <AuthShell
        title={<Skeleton variant='text' level='h2' width={240} />}
        subtitle={<Skeleton variant='text' level='body-sm' width={200} />}
      >
        <Skeleton variant='rectangular' height={48} sx={{ borderRadius: 'md' }} />
      </AuthShell>
    )
  }

  if (status === 'left') {
    return (
      <ActionResult
        title={say('beta.waitlist.leave.doneTitle')}
        body={say('beta.waitlist.leave.doneBody')}
        to='/'
        label={say('beta.waitlist.leave.back')}
      />
    )
  }

  return (
    <AuthShell
      title={say('beta.waitlist.leave.title')}
      subtitle={hint.email ? say('beta.waitlist.leave.body', { email: hint.email }) : say('beta.waitlist.leave.bodyNoEmail')}
    >
      <Stack spacing={1.5}>
        <div aria-live='polite'>
          {status === 'failed' && (
            <Alert color='danger' variant='soft' size='sm'>
              {say('beta.waitlist.failed')}
            </Alert>
          )}
        </div>
        <Button size='lg' fullWidth loading={status === 'leaving'} onClick={leave}>
          {say('beta.waitlist.leave.confirm')}
        </Button>
        <Button size='lg' fullWidth variant='soft' color='neutral' component={RouterLink} to='/' disabled={status === 'leaving'}>
          {say('beta.waitlist.leave.stay')}
        </Button>
      </Stack>
    </AuthShell>
  )
}

export default WaitlistLeave
