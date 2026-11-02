/**
 * The ledger behind one finished session (ADR-059), read when a row opens.
 *
 * `sessionBreakdown` wants the rows, the deck median and the gap to the
 * previous session together, which is what the endpoint answers. Disabled
 * until the row is open: History lists twenty sessions and must not fetch
 * twenty ledgers to show one.
 */
import { useQuery } from '@tanstack/react-query'
import { studySessionsService } from '../api/services/studySessions.service'
import { useAuth } from '../context/AuthContext'

export function useSessionAttempts(sessionId, { enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['study-sessions', userId, 'attempts', sessionId],
    queryFn: () => studySessionsService.attempts(sessionId),
    enabled: Boolean(enabled && sessionId && userId),
    staleTime: 5 * 60 * 1000
  })

  return {
    attempts: data?.attempts ?? null,
    medianThinkMs: data?.medianThinkMs ?? null,
    daysSincePrevious: data?.daysSincePrevious ?? null,
    loading: isLoading,
    error: error ?? null
  }
}

export default useSessionAttempts
