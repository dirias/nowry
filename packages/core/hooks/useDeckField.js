import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decksService } from '../api/services/decks.service'

/**
 * A deck's field, for the companion's ready questions (CHAT-009, ADR-055 §6).
 *
 * Read once per deck and kept: the server guesses at most once and saves the
 * guess, and a field does not change while a chat is open. `null` until it is
 * known, so the chat offers its language-or-shape questions meanwhile rather
 * than waiting.
 *
 * @param {string|null} deckId — none, or the daily review, asks nothing.
 * @returns {{field: string|null, source: string|null, setField: (field: string|null) => Promise}}
 */
export function useDeckField(deckId) {
  const client = useQueryClient()
  const enabled = Boolean(deckId) && deckId !== 'daily-review'

  const { data } = useQuery({
    queryKey: ['deckField', deckId],
    queryFn: () => decksService.getField(deckId),
    enabled,
    staleTime: Infinity,
    retry: false
  })

  const mutation = useMutation({
    mutationFn: (field) => decksService.setField(deckId, field),
    onSuccess: (next) => client.setQueryData(['deckField', deckId], next)
  })

  const setField = useCallback((field) => mutation.mutateAsync(field), [mutation])

  return { field: enabled ? (data?.field ?? null) : null, source: enabled ? (data?.source ?? null) : null, setField }
}

export default useDeckField
