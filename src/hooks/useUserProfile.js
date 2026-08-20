/**
 * useUserProfile — React Query-backed user profile read (ADR-008 / CACHE-007).
 *
 * Backs PomodoroContext.js's preference read, which previously read the shared
 * `apiCache` 'annual:profile' entry directly (see
 * `api/services/annualPlanning.service.js`'s `getCachedProfile()`).
 *
 * Keys off the Firebase uid (`auth.currentUser?.uid`) rather than the backend
 * `user.id` the other 7 migrated hooks use for their query keys, to match
 * `getCachedProfile()` — see that function's docstring for why. FocusBar.js's
 * invalidation after a preference save also keys off the same Firebase uid, so
 * this hook, `getCachedProfile()`, and FocusBar.js's invalidation all stay in
 * sync under one query key.
 */
import { useQuery } from '@tanstack/react-query'
import { userService } from '../api/services'
import { auth } from '../config/firebase.config'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache PROFILE_TTL (see annualPlanning.service.js's getCachedProfile).
const PROFILE_STALE_TIME = 60000 // 60s

export function useUserProfile() {
  const { user } = useAuth()
  const userId = auth.currentUser?.uid ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => userService.getProfile().catch(() => null),
    enabled: !!user,
    staleTime: PROFILE_STALE_TIME
  })

  return { profile: data ?? null, loading: isLoading, error: error ?? null }
}

export default useUserProfile
