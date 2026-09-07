import React from 'react'

import useOnboardingJourney from '../../../hooks/useOnboardingJourney'
import NextSteps from './NextSteps'
import OnboardingReentry from './OnboardingReentry'

/**
 * OnboardingSurfaces — Home's two onboarding surfaces, and the single journey
 * read that decides between them (ONB-023, ADR-024).
 *
 * WHY THIS CONTAINER EXISTS AT ALL
 *
 * `GET /users/onboarding` answers both questions in one body: `show_reentry`
 * for an incomplete journey, `show_next_steps` for an activated one. When each
 * surface owned its own `useOnboardingJourney()`, Home issued that identical
 * request twice on every load — the exact duplicate-call problem ADR-008 was
 * written about, arriving from a new direction. One read, one snapshot, passed
 * to both.
 *
 * Neither child may fetch for itself, which is why `journey` is a required prop
 * rather than a hook call with a fallback: an optional prop would leave the
 * duplicate one forgotten argument away from returning.
 *
 * WHY BOTH ARE RENDERED UNCONDITIONALLY
 *
 * There is no `status` test here, deliberately. `show_reentry` requires
 * `incomplete` and `show_next_steps` requires `activated`, so the server has
 * already guaranteed at most one of them is true (FR-074). A second gate here
 * would be a client-side restatement of that rule, free to drift from it, and
 * it would hide which component is actually responsible for its own emptiness.
 * Each child answers for itself and renders nothing when it is not wanted.
 */
const OnboardingSurfaces = () => {
  const journey = useOnboardingJourney()

  return (
    <>
      <OnboardingReentry journey={journey} />
      <NextSteps journey={journey} />
    </>
  )
}

export default OnboardingSurfaces
