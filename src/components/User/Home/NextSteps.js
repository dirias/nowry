import React, { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/joy'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import FlagRounded from '@mui/icons-material/FlagRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import SchoolRounded from '@mui/icons-material/SchoolRounded'

/**
 * useNextSteps names its icons rather than returning components, so that the
 * hook can move into @nowry/core (MOB-003B). This is the web resolution; the
 * mobile client will keep its own over the same keys.
 */
const STEP_ICONS = { study: SchoolRounded, book: MenuBookRounded, plan: FlagRounded }

import useNextSteps from '../../../hooks/useNextSteps'
import { JOURNEY_PHASE } from '../../../hooks/useOnboardingJourney'
import { focusRing, listRow } from '../../Common/Form/formStyles'
import { visuallyHidden } from '../taxonomySelectorStyles'

/**
 * NextSteps — what an activated user does after their first deck (ONB-023, ADR-024).
 *
 * WHAT THIS REPLACED
 *
 * A six-slide "What Nowry can do" carousel that rendered *ahead* of the
 * three-screen journey, gated on a `localStorage` flag. It addressed a user who
 * had already registered but held nothing the slides could refer to, it could
 * not link anywhere, and two of its six cards named card types rather than
 * destinations. ADR-024 retired it and moved capability to the one moment the
 * user has both a reason to look and somewhere to go: after activation, on
 * Home, next to everything else they own.
 *
 * THE VISIBILITY RULE IS THE SERVER'S
 *
 * `show_next_steps` arrives already decided by `GET /users/onboarding`:
 * activated, and not dismissed. Its status test is the exact complement of
 * `show_reentry`'s, so this panel and `OnboardingReentry` can never both appear
 * — FR-074 holds by construction rather than by a comparison here that could
 * drift. Dismissal is a request for the same reason ADR-007 kept re-entry off
 * `localStorage`: a device-local flag is right on one device and wrong on every
 * other.
 *
 * The dismissal is applied optimistically. A failed one costs the user a panel
 * that returns on the next load, which is not worth an error row on somebody's
 * Home — deliberately unlike the *read* failure `OnboardingReentry` does
 * surface, because there the user would otherwise never learn that an
 * invitation exists.
 *
 * A ROW IS A DESTINATION FIRST
 *
 * FR-069: every row opens one route that exists. FR-070/FR-071: a row the data
 * says is done renders as done and stops inviting; a row whose signal has not
 * resolved renders as available, never as done — see `useNextSteps` for why
 * that asymmetry is the only safe default. Once every row is done the panel
 * retires itself (FR-073), so a user who simply gets on with it is never asked
 * to dismiss a list of things they have already finished.
 *
 * WHERE THE JOURNEY COMES FROM
 *
 * A prop, not a hook call. `OnboardingSurfaces` reads it once and hands the
 * same snapshot to this panel and to `OnboardingReentry`, because the one
 * response body answers both — see that file for why owning the read here
 * would put a duplicate request on every Home load.
 *
 * LOADING COSTS HOME NOTHING
 *
 * Renders `null` while the journey read is in flight, exactly as
 * `OnboardingReentry` does and for the same reason: for every incomplete user
 * this surface is never going to arrive, and a skeleton that resolves to
 * nothing is a phantom (FR-075).
 */
const NextSteps = ({ journey }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const headingId = useId()

  const [dismissed, setDismissed] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const { status, showNextSteps, journeyPhase, dismissNextSteps } = journey
  const { steps, allDone } = useNextSteps()

  const isReady = journeyPhase === JOURNEY_PHASE.READY
  const offered = isReady && status === 'activated' && showNextSteps === true

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    setAnnouncement(t('home.nextSteps.dismissed'))
    // Fire and forget: the panel is already gone from this view, and the only
    // consequence of a failure is that it comes back next time.
    dismissNextSteps()
  }, [dismissNextSteps, t])

  const handleOpen = useCallback((to) => navigate(to), [navigate])

  if (!offered || dismissed || allDone) {
    // The polite message still needs a host for the render that follows a
    // dismissal, so the live region outlives the panel by exactly one pass.
    return announcement ? (
      <Typography role='status' aria-live='polite' level='body-xs' sx={visuallyHidden}>
        {announcement}
      </Typography>
    ) : null
  }

  return (
    <Box
      component='section'
      role='region'
      aria-labelledby={headingId}
      sx={{
        mb: { xs: 2, md: 3 },
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderRadius: 'lg',
        bgcolor: 'background.level1',
        // A hairline rather than a shadow, matching OnboardingReentry: this sits
        // in Home's flow and lifts off nothing (ELEVATION.md §2).
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction='row' alignItems='flex-start' spacing={1} sx={{ mb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={headingId} component='h2' level='title-sm' sx={{ mb: 0.25 }}>
            {t('home.nextSteps.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('home.nextSteps.body')}
          </Typography>
        </Box>
        <Tooltip title={t('home.nextSteps.dismiss')} size='sm' placement='bottom'>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={handleDismiss}
            aria-label={t('home.nextSteps.dismiss')}
            sx={{ '--IconButton-size': { xs: '44px', sm: '32px' }, flexShrink: 0, ...focusRing }}
          >
            <CloseRounded fontSize='small' />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack
        component='ul'
        sx={{ listStyle: 'none', m: 0, p: 0 }}
        divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}
      >
        {steps.map(({ id, i18nKey, to, iconKey, done }) => {
          // An unknown key draws nothing rather than crashing Home.
          const Icon = STEP_ICONS[iconKey] ?? null
          const title = t(`home.nextSteps.items.${i18nKey}.title`)
          const description = t(`home.nextSteps.items.${i18nKey}.description`)

          return (
            <Box component='li' key={id}>
              <Box
                component={done ? 'div' : 'button'}
                type={done ? undefined : 'button'}
                onClick={done ? undefined : () => handleOpen(to)}
                aria-label={done ? undefined : t('home.nextSteps.openLabel', { title })}
                data-testid={`next-step-${id}`}
                data-done={done ? 'true' : 'false'}
                sx={{
                  ...listRow,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  bgcolor: 'transparent',
                  font: 'inherit',
                  cursor: done ? 'default' : 'pointer',
                  // A finished row is a record, not an invitation (FR-070): it
                  // keeps its place so progress stays visible, and gives up the
                  // hover ground that would read as "press me".
                  '&:hover': done ? { bgcolor: 'transparent' } : { bgcolor: 'background.surface' }
                }}
              >
                {done ? (
                  <CheckCircleRounded aria-hidden sx={{ fontSize: 'xl', color: 'success.plainColor', flexShrink: 0 }} />
                ) : Icon ? (
                  <Icon aria-hidden sx={{ fontSize: 'xl', color: 'primary.plainColor', flexShrink: 0 }} />
                ) : null}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='body-sm' sx={{ color: done ? 'text.tertiary' : 'text.primary', fontWeight: done ? 'md' : 'lg' }}>
                    {title}
                    {done && (
                      <Box component='span' sx={visuallyHidden}>
                        {' '}
                        {t('home.nextSteps.doneLabel')}
                      </Box>
                    )}
                  </Typography>
                  {!done && (
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {description}
                    </Typography>
                  )}
                </Box>

                {!done && <ChevronRightRounded aria-hidden sx={{ fontSize: 'lg', color: 'text.tertiary', flexShrink: 0 }} />}
              </Box>
            </Box>
          )
        })}
      </Stack>

      <Typography role='status' aria-live='polite' level='body-xs' sx={visuallyHidden}>
        {announcement}
      </Typography>
    </Box>
  )
}

export default NextSteps
