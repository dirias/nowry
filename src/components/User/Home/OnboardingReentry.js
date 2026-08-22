import React, { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded'

import useOnboardingJourney, { JOURNEY_PHASE } from '../../../hooks/useOnboardingJourney'
import { focusRing, touchTarget } from '../../Common/Form/formStyles'
import { failureKey } from '../OnboardingFieldSaveState'
import { visuallyHidden } from '../taxonomySelectorStyles'

/**
 * OnboardingReentry — Home's in-flow onboarding re-entry (ONB-012, ADR-007).
 *
 * WHAT REPLACED WHAT
 *
 * This is the replacement for two pieces of machinery that are now gone: the
 * global `wizard_completed` redirect in `App.js`, which sent every incomplete
 * user to `/onboarding` on every navigation, and the `setup_banner_dismissed`
 * banner that showed on Home for anybody whose wizard flag was false. Both
 * asked a *client* to decide when to nag, and one of them made the answer a
 * forced navigation. FR-044 forbids both: onboarding may not auto-open, may not
 * block Home, and may not restrict any other area of the product.
 *
 * THE VISIBILITY RULE IS THE SERVER'S, NOT OURS
 *
 * `show_reentry` arrives already decided by `GET /users/onboarding`. It means
 * "status is incomplete AND (never postponed OR the 24-hour grace period has
 * elapsed)" — and the clock in that sentence is the server's (ADR-003, FR-042).
 * Nothing here reads `postponed_at`, subtracts dates, or consults
 * `Date.now()`: a device clock that is wrong by a day would otherwise either
 * nag a user who just postponed or hide the invitation forever.
 *
 * `status === 'incomplete'` is asserted alongside it even though the server
 * already implies it. It is one comparison, and it makes the guarantee local
 * and readable rather than an assumption about a field computed elsewhere.
 *
 * DISMISSAL IS A VIEW STATE AND NOTHING ELSE
 *
 * The dismiss control writes to React state — no `sessionStorage`, no
 * `localStorage`, no request. Closing it hides the card in *this* Home view;
 * it does not postpone, does not activate and does not touch journey state at
 * all (ADR-007). Persisting a dismissal locally would be a second, device-local
 * suppression rule competing with the server's, which is precisely the design
 * this task removed. The user's durable "not now" is postponement, and it lives
 * on Welcome.
 *
 * LOADING AND FAILURE MAY NOT COST HOME ANYTHING
 *
 * While the read is in flight this renders `null`, and Home renders in full
 * around it. There is deliberately no skeleton: a placeholder promises a
 * surface that, for every activated user and every user inside the grace
 * period, is never going to arrive — a skeleton that resolves to nothing is a
 * phantom, and this is an invitation, not data the user asked for.
 *
 * A *recoverable* read failure does get a visible row with a retry (FR-049):
 * it is stated as an error, in danger tone with an alert glyph, and never as
 * "nothing to show" — the two must not be confusable. A terminal failure
 * renders nothing, because there is no action to offer and an optional
 * invitation is not worth a permanent error on someone's Home.
 */
const OnboardingReentry = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const headingId = useId()
  const wrapperRef = useRef(null)

  const [dismissed, setDismissed] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const { status, showReentry, journeyPhase, journeyError, reload } = useOnboardingJourney()

  const isReady = journeyPhase === JOURNEY_PHASE.READY
  const invited = isReady && status === 'incomplete' && showReentry === true
  const showCard = invited && !dismissed
  const showFailure = journeyPhase === JOURNEY_PHASE.ERROR && journeyError?.recoverable === true

  /**
   * Removing the element that holds focus drops focus to `<body>` and loses the
   * reader's place (NFR-002). The wrapper outlives the card precisely so focus
   * has somewhere predictable to land, and the polite message says what
   * happened — otherwise the card simply vanishes with no feedback at all.
   */
  const handleDismiss = useCallback(() => {
    setDismissed(true)
    setAnnouncement(t('home.onboardingReentry.dismissed'))
    wrapperRef.current?.focus()
  }, [t])

  const handleContinue = useCallback(() => {
    // Plain navigation. The route reads the server's `resume_screen` and lands
    // the user where they actually stopped (FR-038) — this end knows nothing
    // about which screen that is and must not guess.
    navigate('/onboarding')
  }, [navigate])

  // Nothing to show and nothing to remember: stay out of Home's layout entirely.
  if (!showCard && !showFailure && !dismissed) return null

  return (
    <Box
      ref={wrapperRef}
      tabIndex={-1}
      sx={{
        mb: showCard || showFailure ? { xs: 2, md: 3 } : 0,
        '&:focus': { outline: 'none' }
      }}
    >
      {showCard && (
        <Box
          role='region'
          aria-labelledby={headingId}
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderRadius: 'lg',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <RocketLaunchRounded aria-hidden sx={{ fontSize: 20, color: 'primary.plainColor', flexShrink: 0, mt: { xs: 0, sm: '2px' } }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={headingId} component='h2' level='title-sm' sx={{ mb: 0.25 }}>
              {t('home.onboardingReentry.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('home.onboardingReentry.body')}
            </Typography>
          </Box>

          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' } }}>
            <Button size='sm' variant='solid' onClick={handleContinue} sx={{ flex: { xs: 1, sm: 'none' }, ...touchTarget, ...focusRing }}>
              {t('home.onboardingReentry.cta')}
            </Button>
            <Tooltip title={t('home.onboardingReentry.dismiss')} size='sm' placement='bottom'>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                onClick={handleDismiss}
                aria-label={t('home.onboardingReentry.dismiss')}
                sx={{ '--IconButton-size': { xs: '44px', sm: '32px' }, flexShrink: 0, ...focusRing }}
              >
                <CloseRounded fontSize='small' />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {showFailure && (
        <Box
          role='status'
          aria-live='polite'
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            borderRadius: 'lg',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <ErrorOutlineRounded aria-hidden sx={{ fontSize: 20, color: 'danger.plainColor', flexShrink: 0, mt: { xs: 0, sm: '2px' } }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level='title-sm' sx={{ color: 'danger.plainColor' }}>
              {t('home.onboardingReentry.error.title')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t(failureKey(journeyError))}
            </Typography>
          </Box>
          <Button
            size='sm'
            variant='outlined'
            color='neutral'
            onClick={() => reload()}
            sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' }, ...touchTarget, ...focusRing }}
          >
            {t('onboarding.shell.retry')}
          </Button>
        </Box>
      )}

      <Typography role='status' aria-live='polite' level='body-xs' sx={visuallyHidden}>
        {announcement}
      </Typography>
    </Box>
  )
}

export default OnboardingReentry
