/**
 * useUserProfile — React Query-backed user profile read (ADR-008 / CACHE-007).
 *
 * Backs PomodoroContext.js's preference read, which previously read the shared
 * `apiCache` 'annual:profile' entry directly.
 *
 * Keys off the Firebase uid (`auth.currentUser()?.uid`, through the platform
 * port) rather than the backend `user.id` the other migrated hooks use for
 * their query keys: the uid is a synchronous read available outside React,
 * so anything that invalidates the profile can name the same key without an
 * AuthContext. (The annual-plan service's cached profile wrapper that first
 * chose this key retired with Home's priority picker, PLAN-013.)
 */
import { useQuery } from '@tanstack/react-query'
import { userService } from '../api/services'
import { auth } from '../platform'
import { useAuth } from '../context/AuthContext'

// Matches the old apiCache PROFILE_TTL (CACHE-005).
const PROFILE_STALE_TIME = 60000 // 60s

export function useUserProfile() {
  const { user } = useAuth()
  const userId = auth.currentUser()?.uid ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => userService.getProfile().catch(() => null),
    enabled: !!user,
    staleTime: PROFILE_STALE_TIME
  })

  return { profile: data ?? null, loading: isLoading, error: error ?? null }
}

export default useUserProfile
