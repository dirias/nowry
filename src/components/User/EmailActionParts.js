import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Button, Skeleton, Typography } from '@mui/joy'
import AuthShell from './AuthShell'

/**
 * The two frames every state of `/auth/action` is drawn in (MAIL-005, FR-022).
 */

/** The quiet moment while Firebase answers. */
export const ActionWorking = () => {
  const { t } = useTranslation()
  return (
    <AuthShell
      title={<Skeleton variant='text' level='h2' width={240} />}
      subtitle={<Skeleton variant='text' level='body-sm' width={180} />}
    >
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }} role='status' aria-live='polite'>
        {t('auth.action.working')}
      </Typography>
    </AuthShell>
  )
}

/** One outcome: what happened, one line about it, and the one place to go next. */
export const ActionResult = ({ title, body, to, label }) => (
  <AuthShell title={title} subtitle={body}>
    <Button size='lg' fullWidth component={RouterLink} to={to}>
      {label}
    </Button>
  </AuthShell>
)

ActionResult.propTypes = {
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
}
