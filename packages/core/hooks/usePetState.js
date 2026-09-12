import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { agentService } from '../api/services/agent.service'
import petService from '../api/services/petService'
import { useAuth } from '../context/AuthContext'
import { canSend, messageBudget } from '../domain/agentChat'
import { interventionSettings } from '../domain/interventionPolicy'
import { stageConfig } from '../domain/petStages'

/**
 * The companion, as a readout (MOB-050).
 *
 * `AgentProvider` is the web's answer and it is the wrong one for a phone: it
 * carries the chat, the quiz, avatar generation and a proactive-nudge fetch,
 * and mounting it would run all of that to draw an orb and a level. This reads
 * the same endpoint through React Query instead, so the companion is cached,
 * persisted to disk on mobile, and costs one request.
 *
 * **The field names are the server's and they are named once, here.** The whole
 * payload is snake_case and the reducer in `AgentContext` is the only other
 * place that knows it; a screen reading `current_stage` for itself is how a
 * client ends up drawing stage one forever.
 */
export function usePetState() {
  const client = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error } = useQuery({
    queryKey: ['pet', userId],
    queryFn: () => agentService.getState(),
    enabled: !!userId,
    // A companion changes when you study, which is not while you are looking
    // at it.
    staleTime: 5 * 60 * 1000
  })

  const preferences = useQuery({
    queryKey: ['petPreferences', userId],
    queryFn: () => petService.getPetPreferences(),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000
  })

  /**
   * Re-read the companion. A chat reply spends a message and can cross a
   * level, so the budget and the stage this hook reports are both stale the
   * moment one lands (MOB-085).
   */
  const reload = useCallback(async () => {
    if (!userId) return
    await client.invalidateQueries({ queryKey: ['pet', userId] })
  }, [client, userId])

  /** Rename or re-species the companion; both are optional and partial. */
  const save = useCallback(
    async (payload) => {
      const saved = await petService.updatePetPreferences(payload)
      client.setQueryData(['petPreferences', userId], saved)
      // The name rides on the agent payload too, so that entry is now stale.
      client.invalidateQueries({ queryKey: ['pet', userId] })
      return saved
    },
    [client, userId]
  )

  const stage = data?.current_stage ?? 1

  return {
    /** What the user called it, if anything; the caller supplies the fallback. */
    name: preferences.data?.pet_name ?? data?.pet_name ?? null,
    species: preferences.data?.pet_species ?? data?.pet_species ?? null,
    level: data?.level ?? 1,
    xp: data?.current_xp ?? 0,
    stage,
    config: stageConfig(stage),
    xpForNextLevel: data?.xp_for_next_level ?? null,
    /** 0–1 toward the next level, computed server-side. Null until known. */
    levelProgress: data?.level_progress ?? null,
    /*
     * A companion that has never been revealed is not drawn at all — and the
     * default when the field is ABSENT is revealed, which is what the web's own
     * reducer has always done (`pet_revealed ?? true`). Defaulting to false
     * here was an invention, and it hid the companion on a phone whose account
     * the web shows one for: the panel simply never rendered (MOB-052).
     */
    revealed: data?.pet_revealed ?? true,
    active: data?.pet_active ?? true,
    /*
     * The month's message budget rides on this same payload, so the chat costs
     * no request of its own to know whether it may send (MOB-085). `null` means
     * the account has no limit; `canSend` is true while the budget is unknown,
     * because the server is the authority and answers 429 if it disagrees.
     */
    budget: messageBudget(data),
    canSend: canSend(data),
    /*
     * And so do the four settings governing proactive messages, so a session
     * knows whether the companion may interrupt it without a request of its
     * own (MOB-088). Absent, every default applies — which is every switch on.
     */
    interventions: interventionSettings(data),
    loading: isLoading,
    error: data ? null : (error ?? null),
    reload,
    save
  }
}

export default usePetState
