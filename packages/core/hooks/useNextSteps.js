import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { annualPlanningService, booksService } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useStatistics } from './useStatistics'

/**
 * useNextSteps — what an activated user has and has not done yet (ONB-023).
 *
 * WHY EACH ROW OWNS A DESTINATION
 *
 * `docs/prd-onboarding.md` FR-069 admits an item only if it names one place in
 * the product that exists and that the row can open. That rule is what retired
 * the carousel this panel replaces (ADR-024): two of its six slides advertised
 * quizzes and diagrams, which are *card types inside a deck*, not anywhere a
 * user can go. A row here is therefore a route first and a description second.
 *
 * WHY AN UNRESOLVED SIGNAL IS "AVAILABLE" AND NEVER "DONE"
 *
 * FR-071. Every row's `done` is derived from live data, and three independent
 * reads means three independent ways to have no answer yet: still loading,
 * failed, or a shape the server did not send. All three collapse to
 * `done: false`, so the worst case is suggesting something the user has
 * already done — mildly redundant. The opposite default would tick a box on no
 * evidence, which is the one thing a panel like this must never do, and it
 * would also make `allDone` fire and retire the panel for a user who never saw
 * a working row.
 *
 * WHY THESE READS ARE CHEAP
 *
 * `useStatistics` is the shared React Query entry (ADR-008) that WeeklyProgress
 * and StudyCalendar already subscribe to on this very page, so the study signal
 * costs no request at all. The other two are bounded list reads behind their
 * own keys with a long stale time: the answer this hook needs from them is
 * "any at all", which does not change minute to minute.
 */

/** These answer a yes/no question about the past, so they age slowly. */
const NEXT_STEPS_STALE_TIME = 300000 // 5 minutes

/** Treat any list-shaped payload as a count, and anything else as no answer. */
const countOf = (value) => {
  if (Array.isArray(value)) return value.length
  if (Array.isArray(value?.items)) return value.items.length
  return null
}

/**
 * The rows, in the order a new user should meet them: study the deck they just
 * forked, bring their own material, then commit to something bigger. Config
 * driven so adding or retiring a row is a change to this array alone — but the
 * FR-069 rule binds every addition: no route, no row.
 *
 * @typedef {Object} NextStepDefinition
 * @property {string} id - Stable identifier and React key
 * @property {string} i18nKey - Segment under `home.nextSteps.items.<i18nKey>.*`
 * @property {string} to - The route this row opens
 * @property {string} iconKey  named, not rendered — the client resolves it (MOB-003B)
 */
export const NEXT_STEP_DEFINITIONS = [
  { id: 'study', i18nKey: 'study', to: '/study', iconKey: 'study' },
  { id: 'book', i18nKey: 'book', to: '/books', iconKey: 'book' },
  { id: 'plan', i18nKey: 'plan', to: '/annual-planning', iconKey: 'plan' }
]

/**
 * Resolve each row's completion.
 *
 * @returns {{steps: Array<NextStepDefinition & {done: boolean}>, resolved: boolean, allDone: boolean}}
 *   `resolved` is true once every signal has produced an answer; `allDone` is
 *   true only when it has *and* every row is done, so a panel is never retired
 *   on a half-loaded read.
 */
export const useNextSteps = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const enabled = !!userId

  const { statistics, loading: statisticsLoading } = useStatistics()

  const books = useQuery({
    queryKey: ['nextSteps', 'books', userId],
    queryFn: () => booksService.getAll(),
    enabled,
    staleTime: NEXT_STEPS_STALE_TIME
  })

  const goals = useQuery({
    queryKey: ['nextSteps', 'goals', userId],
    queryFn: () => annualPlanningService.getGoals(),
    enabled,
    staleTime: NEXT_STEPS_STALE_TIME
  })

  return useMemo(() => {
    // `reviewed_cards` counts cards with a review behind them, so it is the one
    // number that answers "has this user actually studied", rather than "does
    // this user own cards" — a forked deck alone would satisfy the latter.
    const reviewed = statisticsLoading ? null : (statistics?.summary?.reviewed_cards ?? null)
    const bookCount = books.isPending || books.isError ? null : countOf(books.data)
    const goalCount = goals.isPending || goals.isError ? null : countOf(goals.data)

    const answers = { study: reviewed, book: bookCount, plan: goalCount }
    const steps = NEXT_STEP_DEFINITIONS.map((definition) => ({
      ...definition,
      done: typeof answers[definition.id] === 'number' && answers[definition.id] > 0
    }))

    const resolved = Object.values(answers).every((value) => typeof value === 'number')

    return { steps, resolved, allDone: resolved && steps.every((step) => step.done) }
  }, [statistics, statisticsLoading, books.data, books.isPending, books.isError, goals.data, goals.isPending, goals.isError])
}

export default useNextSteps
