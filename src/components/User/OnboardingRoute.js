import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Stack, Typography } from '@mui/joy'

import useOnboardingJourney, { JOURNEY_PHASE } from '../../hooks/useOnboardingJourney'
import useProgressivePreferences from '../../hooks/useProgressivePreferences'
import { focusRing } from '../Common/Form/formStyles'
import FirstDeckScreen from './FirstDeckScreen'
import OnboardingPageShell from './OnboardingPageShell'
import PersonalizationScreen from './PersonalizationScreen'
import WelcomeScreen from './WelcomeScreen'
import {
  ONBOARDING_SCREEN,
  TOTAL_ONBOARDING_SCREENS,
  nextScreen,
  normalizeResumeScreen,
  previousScreen,
  screenStep
} from './onboardingScreens'

/**
 * OnboardingRoute — the three-screen journey controller (ONB-008).
 *
 * WHERE THE CURRENT SCREEN COMES FROM
 *
 * From the server, once. `GET /users/onboarding` returns a normalized
 * `resume_screen`, and that value — never `postponed_at`, never a local clock,
 * never "which screen did we last render" — decides where an incomplete user
 * lands (FR-038, ADR-006). The resolution is guarded by a ref so it happens
 * exactly once per mount, because the journey snapshot is rewritten by every
 * later PATCH: without the guard, recording the `first_deck` point would push a
 * fresh `resume_screen` into state and yank a user who had deliberately
 * navigated back. Server state is authoritative for *entering* the journey;
 * moving within it afterwards is the user's business.
 *
 * The same guard is why the activated redirect is inside it. An already
 * activated user who opens `/onboarding` has nothing to do here and goes Home.
 * A user who activates *while on First Deck* must stay, because FR-028 owes
 * them a confirmation and an action that opens the deck they just forked —
 * and that is precisely the case the guard distinguishes.
 *
 * WHY BOTH HOOKS LIVE HERE AND NOT IN THE SCREENS
 *
 * `useProgressivePreferences` is instantiated once, at the route, and passed
 * down. Back navigation is then local state and nothing else: no request, no
 * remount of the preference controller, so the confirmed interests and goal a
 * user saved on Personalization are still confirmed when they come back to it
 * (FR-005). Had each screen owned its own instance, "Back" would have silently
 * discarded every unsaved draft and re-fetched what was left. For the same
 * reason nothing on this path writes activation — activation has exactly one
 * source, the fork response, and it is not reachable from a navigation.
 *
 * The screens themselves (ONB-009/010/011) each render `OnboardingPageShell`
 * with the `shell` props handed to them, so they own their own title, footer
 * and banner while the chrome stays identical across all three.
 */

/**
 * The `first_deck` point is recorded by Personalization once its preferences
 * are confirmed (ONB-010); this controller records `personalization` on entry,
 * as the architecture's PATCH rules describe. Recording is skipped when the
 * server already holds this point or a later one, so walking backwards through
 * the journey can never regress the resume point the user would return to.
 */
const shouldRecordPersonalization = (lastMeaningfulPoint) =>
  lastMeaningfulPoint !== ONBOARDING_SCREEN.PERSONALIZATION && lastMeaningfulPoint !== ONBOARDING_SCREEN.FIRST_DECK

/**
 * The three screens, in order (ONB-014 wiring). Each one receives the identical
 * `screenProps` contract built below and renders `OnboardingPageShell` itself,
 * so the chrome is the same on all three while the title, footer and banner
 * belong to whichever screen is showing.
 *
 * There is no fourth entry, and First Deck has no `onNext`: exiting there is the
 * finish-for-now path (FR-035), which claims no completion. Activation arrives
 * from the fork response alone (ADR-006), never from reaching the end.
 */
const SCREEN_COMPONENTS = {
  [ONBOARDING_SCREEN.WELCOME]: WelcomeScreen,
  [ONBOARDING_SCREEN.PERSONALIZATION]: PersonalizationScreen,
  [ONBOARDING_SCREEN.FIRST_DECK]: FirstDeckScreen
}

const OnboardingRoute = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const journey = useOnboardingJourney()
  const preferences = useProgressivePreferences()

  const [screen, setScreen] = useState(null)
  const resolvedRef = useRef(false)
  const recordedPersonalizationRef = useRef(false)

  const { journeyPhase, isActivated, resumeScreen, lastMeaningfulPoint, recordPoint, reload } = journey

  // Server-authoritative entry, resolved exactly once. See the module note.
  useEffect(() => {
    if (resolvedRef.current || journeyPhase !== JOURNEY_PHASE.READY) return
    resolvedRef.current = true

    if (isActivated) {
      navigate('/', { replace: true })
      return
    }
    setScreen(normalizeResumeScreen(resumeScreen))
  }, [journeyPhase, isActivated, resumeScreen, navigate])

  // FR-037: Personalization is a meaningful point, recorded after entry. A
  // failure is not fatal here — the hook keeps the intended point as an unsaved
  // draft and leaves the confirmed snapshot alone, so a reload still resumes
  // from the last point the server actually accepted.
  useEffect(() => {
    if (screen !== ONBOARDING_SCREEN.PERSONALIZATION) return
    if (recordedPersonalizationRef.current) return
    if (!shouldRecordPersonalization(lastMeaningfulPoint)) return

    recordedPersonalizationRef.current = true
    recordPoint(ONBOARDING_SCREEN.PERSONALIZATION)
  }, [screen, lastMeaningfulPoint, recordPoint])

  const goNext = useCallback(() => {
    setScreen((current) => nextScreen(current) ?? current)
  }, [])

  const goBack = useCallback(() => {
    setScreen((current) => previousScreen(current) ?? current)
  }, [])

  const exitToHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  const isLoading = journeyPhase === JOURNEY_PHASE.IDLE || journeyPhase === JOURNEY_PHASE.LOADING

  if (isLoading || (journeyPhase === JOURNEY_PHASE.READY && screen === null)) {
    // Skeleton chrome, never a full-page gate: the shell that is about to hold
    // the screen is the shell the user is already looking at.
    return <OnboardingPageShell screenKey='loading' loading stepNumber={null} />
  }

  if (journeyPhase === JOURNEY_PHASE.ERROR) {
    return (
      <OnboardingPageShell screenKey='journey-error' stepNumber={null} title={t('onboarding.shell.error.title')}>
        <Stack spacing={2} alignItems='flex-start'>
          <Typography level='body-sm' role='alert' sx={{ color: 'text.secondary' }}>
            {t('onboarding.shell.error.body')}
          </Typography>
          <Button onClick={() => reload()} variant='solid' color='primary' sx={{ minHeight: 44, ...focusRing }}>
            {t('onboarding.shell.retry')}
          </Button>
        </Stack>
      </OnboardingPageShell>
    )
  }

  const shell = {
    screenKey: screen,
    stepNumber: screenStep(screen),
    totalSteps: TOTAL_ONBOARDING_SCREENS,
    onBack: previousScreen(screen) ? goBack : null
  }

  const Screen = SCREEN_COMPONENTS[screen]
  if (!Screen) return null

  // The contract ONB-009/010/011 receive. `journey` and `preferences` are the
  // single instances described above; `onNext`/`onBack` move within the journey
  // and touch nothing else; `onExit` leaves it without claiming completion.
  const screenProps = { shell, journey, preferences, onNext: goNext, onBack: goBack, onExit: exitToHome }

  return <Screen {...screenProps} />
}

export default OnboardingRoute
