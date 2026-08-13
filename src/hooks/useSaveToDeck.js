/* eslint-disable */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { decksService, cardsService } from '../api/services'
import { useDeckData } from './useDeckData'

/**
 * Shared "save generated content to a deck" state/logic for the three
 * AI-generation save modals (GeneratedCards, QuestionnaireModal, VisualizerModal).
 *
 * Built on top of useDeckData(deckType) for the deck list — the backend `?type=`
 * query param is additive, so if it isn't live yet the hook still works: it
 * defensively re-filters client-side using the same legacy-aware rule the
 * flashcard flow already relied on (untyped decks are treated as 'flashcard').
 *
 * Tags are NOT filtered by deck type — the tag pool is global across all decks,
 * matching cardsService.getTags() (`GET /study-cards/tags`).
 *
 * @param {'flashcard'|'quiz'|'visual'} deckType
 */
export function useSaveToDeck(deckType) {
  const { decks: rawDecks, loading: decksLoading, error: decksError, reload } = useDeckData(deckType)

  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const [availableTags, setAvailableTags] = useState([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagsError, setTagsError] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [customTags, setCustomTags] = useState([])

  // Defensive client-side filter — safe whether or not the backend `?type=`
  // param is live yet. Legacy/untyped decks fall back to 'flashcard'.
  const decks = useMemo(() => {
    const data = rawDecks || []
    if (deckType === 'flashcard') {
      return data.filter((d) => d.deck_type === 'flashcard' || !d.deck_type)
    }
    if (deckType) {
      return data.filter((d) => d.deck_type === deckType)
    }
    return data
  }, [rawDecks, deckType])

  // Auto-select the first available deck once the list resolves
  useEffect(() => {
    if (!decksLoading && decks.length > 0) {
      setSelectedDeckId((current) => current || decks[0]._id)
    }
  }, [decksLoading, decks])

  useEffect(() => {
    setTagsLoading(true)
    setTagsError(false)
    cardsService
      .getTags()
      .then((tags) => setAvailableTags(tags || []))
      .catch((error) => {
        console.error('[useSaveToDeck] Error loading tags:', error)
        setTagsError(true)
      })
      .finally(() => setTagsLoading(false))
  }, [])

  const createDeck = useCallback(async () => {
    if (!newDeckName.trim()) return
    setCreateLoading(true)
    try {
      const newDeck = await decksService.create({
        name: newDeckName,
        description: 'Created from generated content',
        deck_type: deckType
      })
      setSelectedDeckId(newDeck._id)
      setNewDeckName('')
      setIsCreatingDeck(false)
      reload()
      return newDeck
    } finally {
      setCreateLoading(false)
    }
  }, [newDeckName, deckType, reload])

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const addCustomTag = useCallback(
    (tag) => {
      const trimmed = (tag || '').trim()
      if (!trimmed) return
      const existingLower = new Set([...selectedTags, ...customTags, ...availableTags.map((t) => t.tag)].map((t) => t.toLowerCase()))
      if (!existingLower.has(trimmed.toLowerCase())) {
        setCustomTags((prev) => [...prev, trimmed])
      }
    },
    [selectedTags, customTags, availableTags]
  )

  const removeCustomTag = useCallback((tag) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const allTags = useMemo(() => [...new Set([...selectedTags, ...customTags])], [selectedTags, customTags])

  return {
    decks,
    decksLoading,
    decksError,
    selectedDeckId,
    setSelectedDeckId,
    isCreatingDeck,
    setIsCreatingDeck,
    newDeckName,
    setNewDeckName,
    createDeck,
    createLoading,
    availableTags,
    tagsLoading,
    tagsError,
    selectedTags,
    customTags,
    toggleTag,
    addCustomTag,
    removeCustomTag,
    allTags,
    reload
  }
}
