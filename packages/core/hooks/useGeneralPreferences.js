import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userService } from '../api/services/user.service'
import { useAuth } from '../context/AuthContext'

/**
 * The account's general preferences, as a readout that can be written (MOB-091).
 *
 * `PUT /users/preferences/general` is a Pydantic partial update driven by
 * `model_fields_set`, so a write carries only the key it changes and everything
 * else on the document is left alone. That is what makes a settings screen of
 * twelve independent switches safe: each one sends itself, and two of them
 * saved a second apart cannot overwrite each other.
 *
 * **It writes through the cache, not around it.** The value on screen is the
 * cached one, so a switch that waited for the server before moving would feel
 * broken on a phone with real latency — and a switch that moved without the
 * cache knowing would snap back on the next read. The cache is updated first
 * and put back if the write fails, which is the only arrangement where the
 * control is both immediate and honest.
 *
 * The web reads the same endpoint directly in `AccountSettings` and
 * `AgentSettings`. It is not converted here: those screens hold a dozen pieces
 * of local state each and rewriting them is not this task. What matters is that
 * the KEY NAMES are the server's and are written down once — in `agentPrefs`
 * below and in `interventionPolicy` — rather than spelled out at each control.
 */
export function useGeneralPreferences() {
  const client = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const key = ['generalPreferences', userId]

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => userService.getGeneralPreferences(),
    enabled: !!userId,
    // Preferences change when the person changes them, which is not while
    // somebody else is looking at them.
    staleTime: 30 * 60 * 1000
  })

  /**
   * Write one preference, or several that belong together.
   *
   * @param {object} patch - server key to value
   * @returns {Promise<boolean>} whether it reached the server
   */
  const save = useCallback(
    async (patch) => {
      const before = client.getQueryData(key)
      client.setQueryData(key, { ...(before ?? {}), ...patch })
      try {
        await userService.updateGeneralPreferences(patch)
        return true
      } catch {
        // Back to what the server last said, rather than to a guess.
        client.setQueryData(key, before)
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, userId]
  )

  return { preferences: data ?? null, loading: isLoading, error: data ? null : (error ?? null), save }
}

export default useGeneralPreferences
