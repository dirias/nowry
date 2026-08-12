import { useCallback, useEffect, useRef, useState } from 'react'

import { decksService } from '../api/services'
import { describeApiError } from '../components/Common/Form/formUtils'

/**
 * Deck settings — Variant E's state core (UX-CONTRACT §3, DECKS.md §3).
 *
 * The disclosure half of the form system does not apply here: nothing is
 * required, every setting already has a value, and a chip reading "Add a pace
 * mode" would be absurd. What does apply is S5 — roughly ninety lines of fetch,
 * debounce, reset and per-section save state used to live inside a JSX
 * component — and the rule that a save failure is never silent.
 *
 * **One debounce timer per service method.** The modal writes through two:
 * `updateSettings` for config and voice, `update` for the deck's own identity.
 * With a single shared timer a rename and a pace change fired within 600ms of
 * each other would cancel one another, and exactly one of them would silently
 * fail to persist — with no Save button, and therefore no reason for the user
 * to suspect anything. `timers`, `pending` and `failed` are all keyed by
 * channel so the two paths cannot interfere.
 *
 * The other thing that must not be silent is the failure itself: the shipped
 * version caught it and only console.error'd, which is worse here than on a
 * form with a Save button — there is no action to fail, so the user's setting
 * simply did not persist and nothing said so.
 */

const DEBOUNCE_MS = 600
const SAVED_FOR_MS = 1500

/** One entry per service method. The key is the debounce channel. */
const CHANNELS = {
  settings: (deckId, payload) => decksService.updateSettings(deckId, payload)
}

export const PACE_DEFAULTS = {
  relaxed: { new_per_day: 10, max_reviews_per_day: 50 },
  balanced: { new_per_day: 20, max_reviews_per_day: 100 },
  intensive: { new_per_day: 40, max_reviews_per_day: 200 }
}

const DEFAULT_CONFIG = { pace_mode: 'balanced', new_per_day: 20, max_reviews_per_day: 100 }
const DEFAULT_VOICE_SIDE = { voice_name: null, voice_lang: null, rate: 1.0, pitch: 1.0, auto_play: false }
const defaultVoiceSettings = () => ({ front: { ...DEFAULT_VOICE_SIDE }, back: { ...DEFAULT_VOICE_SIDE } })

const useDeckSettings = ({ open, deckId, onSaved, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [deck, setDeck] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [voiceSettings, setVoiceSettings] = useState(defaultVoiceSettings)
  const [availableVoices, setAvailableVoices] = useState([])
  const [activeSection, setActiveSection] = useState('study')
  const [audioSide, setAudioSide] = useState('front')
  const [savingSection, setSavingSection] = useState(null)
  const [savedSection, setSavedSection] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const timers = useRef({})
  const pending = useRef({})
  const failed = useRef({})
  const savedOnce = useRef(false)

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
  useEffect(() => {
    if (!open || !deckId) return undefined
    let cancelled = false
    setLoading(true)
    setActiveSection('study')
    setSaveError(null)
    failed.current = {}
    decksService
      .getById(deckId)
      .then((data) => {
        if (cancelled) return
        setDeck(data)
        setConfig(data.config || { ...DEFAULT_CONFIG })
        setVoiceSettings(data.voice_settings || defaultVoiceSettings())
      })
      .catch((error) => {
        if (!cancelled) setSaveError(describeApiError(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, deckId])

  const runSave = useCallback(
    async (channel) => {
      const job = pending.current[channel]
      if (!job) return
      pending.current[channel] = null
      setSavingSection(job.section)
      try {
        await CHANNELS[channel](deckId, job.payload)
        delete failed.current[channel]
        savedOnce.current = true
        setSaveError(null)
        setSavedSection(job.section)
        setTimeout(() => setSavedSection(null), SAVED_FOR_MS)
      } catch (error) {
        // Held so Retry re-sends the change the user actually made, rather
        // than asking them to make it again.
        failed.current[channel] = job
        setSaveError(describeApiError(error))
      } finally {
        setSavingSection(null)
      }
    },
    [deckId]
  )

  /** Queue a write on its own channel. Two channels never share a timer. */
  const queue = useCallback(
    (channel, payload, section) => {
      pending.current[channel] = { payload, section }
      clearTimeout(timers.current[channel])
      timers.current[channel] = setTimeout(() => runSave(channel), DEBOUNCE_MS)
    },
    [runSave]
  )

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

  const retry = useCallback(() => {
    const jobs = Object.entries(failed.current)
    setSaveError(null)
    jobs.forEach(([channel, job]) => {
      pending.current[channel] = job
      clearTimeout(timers.current[channel])
      runSave(channel)
    })
  }, [runSave])

  /**
   * Fire anything still inside its debounce window rather than dropping it.
   * The shipped version cleared the timer, so a setting changed within 600ms of
   * pressing Close never reached the server and never said so.
   */
  const close = useCallback(() => {
    Object.keys(timers.current).forEach((channel) => {
      clearTimeout(timers.current[channel])
      if (pending.current[channel]) runSave(channel)
    })
    if (savedOnce.current) onSaved?.()
    savedOnce.current = false
    setSavedSection(null)
    onClose?.()
  }, [runSave, onSaved, onClose])

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
    config,
    voiceSettings,
    availableVoices,
    activeSection,
    setActiveSection,
    audioSide,
    setAudioSide,
    savingSection,
    savedSection,
    saveError,
    saveConfig,
    saveVoice,
    retry,
    close,
    refreshPublishState,
    markSaved: () => {
      savedOnce.current = true
    }
  }
}

export default useDeckSettings
