/**
 * Whether Home's next-steps panel is offered, and how it is retired (ADR-024).
 *
 * Both facts live on the server: `GET /users/onboarding` returns
 * `show_next_steps` already decided — activated, and not dismissed — and the
 * dismissal is a PATCH. That is deliberate and predates this hook; the service
 * method's own comment says the flag is server-held so the dismissal follows the
 * account to every device, which is exactly what a second client needs.
 *
 * **Relationship to `useOnboardingJourney`.** The web reads the same two facts
 * from that hook, which also drives the whole onboarding flow — resume points,
 * fork retries, a `sessionStorage` handoff — none of which mobile has, since
 * onboarding is out of v1 (ADR-030). Rather than move that machine, this reads
 * the same server state directly. If onboarding ever reaches mobile, this hook
 * is what the journey hook should absorb, not the other way round.
 *
 * The dismissal is optimistic. A failed one costs the user a panel that comes
 * back on the next load; there is nothing here worth an error row on somebody's
 * Home.
 */
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { userService } from '../api/services'
import { useAuth } from '../context/AuthContext'

export const useNextStepsPanel = () => {
  const { isAuthenticated } = useAuth()
  const [dismissedLocally, setDismissedLocally] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding', 'nextStepsPanel'],
    queryFn: () => userService.getOnboardingState(),
    enabled: isAuthenticated,
    staleTime: 60000
  })

  const dismiss = useCallback(async () => {
    // Optimistic: the panel goes now, and stays gone if the request lands.
    setDismissedLocally(true)
    try {
      await userService.dismissOnboardingNextSteps()
      await refetch()
      return { ok: true }
    } catch (dismissError) {
      // Deliberately silent. It reappears on the next load, which is the whole cost.
      return { ok: false, error: dismissError }
    }
  }, [refetch])

  return {
    offered: data?.show_next_steps === true && !dismissedLocally,
    loading: isLoading,
    error: error ?? null,
    dismiss
  }
}

export default useNextStepsPanel
