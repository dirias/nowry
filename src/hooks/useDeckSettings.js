import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { decksService } from '../api/services'
import { describeApiError } from '../components/Common/Form/formUtils'
import useDebouncedChannels from './useDebouncedChannels'

/**
 * Deck settings — Variant E's state core (UX-CONTRACT §3, DECKS.md §3).
 *
 * The disclosure half of the form system does not apply here: nothing is
 * required, every setting already holds a value, and a chip reading "Add a pace
 * mode" would be offering something that already has one. What does apply is
 * S5 — roughly ninety lines of fetch, debounce, reset and per-section save
 * state used to live inside a JSX component — and the rule that a save failure
 * is never silent.
 *
 * Two service methods write from this one surface, so they take two debounce
 * channels; `useDebouncedChannels` holds the one-timer-per-channel invariant
 * and the reasoning behind it.
 */
const CHANNELS_FOR = (deckId) => ({
  settings: (payload) => decksService.updateSettings(deckId, payload),
  identity: (payload) => decksService.update(deckId, payload)
})

export const PACE_DEFAULTS = {
  relaxed: { new_per_day: 10, max_reviews_per_day: 50 },
  balanced: { new_per_day: 20, max_reviews_per_day: 100 },
  intensive: { new_per_day: 40, max_reviews_per_day: 200 }
}

const DEFAULT_CONFIG = { pace_mode: 'balanced', new_per_day: 20, max_reviews_per_day: 100 }
const DEFAULT_VOICE_SIDE = { voice_name: null, voice_lang: null, rate: 1.0, pitch: 1.0, auto_play: false }
const defaultVoiceSettings = () => ({ front: { ...DEFAULT_VOICE_SIDE }, back: { ...DEFAULT_VOICE_SIDE } })

const emptyIdentity = () => ({ name: '', description: '', imageUrl: '', tags: [] })

const toIdentity = (deck) => ({
  name: deck?.name || '',
  description: deck?.description || '',
  imageUrl: deck?.image_url || '',
  tags: Array.isArray(deck?.tags) ? deck.tags : []
})

const identityPayload = (identity) => ({
  name: identity.name.trim(),
  description: identity.description,
  image_url: identity.imageUrl || null,
  tags: identity.tags
})

const useDeckSettings = ({ open, deckId, initialSection = 'study', onSaved, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [deck, setDeck] = useState(null)
  const [identity, setIdentity] = useState(emptyIdentity)
  const [identityError, setIdentityError] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [voiceSettings, setVoiceSettings] = useState(defaultVoiceSettings)
  const [availableVoices, setAvailableVoices] = useState([])
  const [activeSection, setActiveSection] = useState(initialSection)
  const [audioSide, setAudioSide] = useState('front')

  const channels = useMemo(() => CHANNELS_FOR(deckId), [deckId])
  const saves = useDebouncedChannels({ channels })

  // Read by effects and callbacks that must not re-run because a value changed.
  const openSection = useRef(initialSection)
  openSection.current = initialSection
  const identityRef = useRef(identity)
  identityRef.current = identity

  useEffect(() => {
    const loadVoices = () => setAvailableVoices(window.speechSynthesis?.getVoices() || [])
    loadVoices()
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  // The one surface in the form system that legitimately fetches on open, and
  // therefore the one that legitimately shows skeletons. `cancelled` guards a
  // response that lands after the modal closed.
  const { reset: resetSaves, setError } = saves
  useEffect(() => {
    if (!open || !deckId) return undefined
    let cancelled = false
    setLoading(true)
    setActiveSection(openSection.current)
    setIdentityError(null)
    resetSaves()
    decksService
      .getById(deckId)
      .then((data) => {
        if (cancelled) return
        setDeck(data)
        setIdentity(toIdentity(data))
        setConfig(data.config || { ...DEFAULT_CONFIG })
        setVoiceSettings(data.voice_settings || defaultVoiceSettings())
      })
      .catch((error) => {
        if (!cancelled) setError(describeApiError(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, deckId, resetSaves, setError])

  const { queue, cancel } = saves

  const saveConfig = useCallback(
    (next) => {
      setConfig(next)
      queue('settings', { config: next }, 'study')
    },
    [queue]
  )

  const saveVoice = useCallback(
    (next) => {
      setVoiceSettings(next)
      queue('settings', { voice_settings: next }, 'audio')
    },
    [queue]
  )

  /**
   * An empty name is the one change that must not autosave. There is no Save
   * button to reject, so S4 adapts: the field explains itself, the request
   * never fires, and the last good name stays on the server.
   */
  const setIdentityField = useCallback(
    (field, value) => {
      // Computed outside the state updater on purpose: an updater that queues a
      // request is a side effect React is free to run twice.
      const next = { ...identityRef.current, [field]: value }
      setIdentity(next)
      if (!next.name.trim()) {
        setIdentityError('cards.create.nameRequired')
        cancel('identity')
        return
      }
      setIdentityError(null)
      const payload = identityPayload(next)
      // The header states what the deck is called, so a rename that lands is a
      // rename the header shows.
      queue('identity', payload, 'identity', () => setDeck((previous) => ({ ...previous, name: payload.name })))
    },
    [queue, cancel]
  )

  const { flush, consumeSaved } = saves
  const close = useCallback(() => {
    flush()
    if (consumeSaved()) onSaved?.()
    onClose?.()
  }, [flush, consumeSaved, onSaved, onClose])

  /** Publishing happens in its own sheet; only the status line here changes. */
  const refreshPublishState = useCallback(() => {
    if (!deckId) return
    decksService
      .getSettings(deckId)
      .then((data) => {
        if (data) setDeck((previous) => ({ ...previous, is_public: data.is_public, published_at: data.published_at }))
      })
      .catch(() => {})
  }, [deckId])

  return {
    loading,
    deck,
    identity,
    identityError,
    setIdentityField,
    config,
    voiceSettings,
    availableVoices,
    activeSection,
    setActiveSection,
    audioSide,
    setAudioSide,
    savingSection: saves.savingKey,
    savedSection: saves.savedKey,
    saveError: saves.error,
    saveConfig,
    saveVoice,
    retry: saves.retry,
    close,
    refreshPublishState,
    markSaved: saves.markSaved
  }
}

export default useDeckSettings
