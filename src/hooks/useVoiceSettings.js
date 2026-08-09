/**
 * useVoiceSettings — Centralized hook for per-deck TTS voice settings.
 *
 * Both `StudySession` and `CardPreviewModal` (and any future TTS consumer)
 * should use this hook instead of managing voice_settings state independently.
 *
 * - Reads from the backend with a single normalized key format.
 * - Writes to the backend with one canonical snake_case format.
 * - Exposes camelCase keys to React components (voiceName, autoPlay).
 * - Supports `daily-review` mode (deckId per card).
 */

import { useState, useEffect } from 'react'
import { decksService } from '../api/services'
import { apiCache } from '../api/utils/cache'
import { useDeckData } from './useDeckData'

// ─── Normalization helpers ────────────────────────────────────────────────────

/**
 * Read a voice_settings side (front/back) from whatever format the backend returns.
 *
 * Default-mode derivation (ADR-002 — supersedes ADR-001's backward-compat clause):
 * auto-detect is the default for ALL decks, including ones that already have a
 * saved voice_lang/voice_name from before this feature existed. A stored
 * voice_lang/voice_name no longer implies `mode: 'manual'` — only an EXPLICIT,
 * previously-persisted `mode: 'manual'` (the user interacted with the toggle
 * post-launch and chose manual) keeps a deck on manual. The old voice_lang/
 * voice_name values are never cleared here — they stay available so switching
 * a deck to Manual mode still restores the exact prior voice.
 */
export function normalizeSide(raw) {
  if (!raw) return { mode: 'auto', voiceName: null, voiceLang: null, rate: 1.0, pitch: 1.0, autoPlay: false }
  const voiceLang = raw.voiceLang || raw.voice_lang || null
  return {
    mode: raw.mode || 'auto',
    voiceName: raw.voiceName || raw.voice_name || raw.voice || null,
    voiceLang, // BCP-47 code, e.g. "ja-JP"
    rate: raw.rate ?? 1.0,
    pitch: raw.pitch ?? 1.0,
    autoPlay: raw.autoPlay ?? raw.auto_play ?? false
  }
}

/** Convert camelCase side object to canonical snake_case for the backend. */
export function serializeSide(side) {
  return {
    mode: side.mode ?? 'auto',
    voice_name: side.voiceName || null,
    voice_lang: side.voiceLang || null, // persisted so any device can match by language
    rate: side.rate ?? 1.0,
    pitch: side.pitch ?? 1.0,
    auto_play: side.autoPlay ?? false
  }
}

const DEFAULT_SETTINGS = {
  front: { mode: 'auto', voiceName: null, voiceLang: null, rate: 1.0, pitch: 1.0, autoPlay: false },
  back: { mode: 'auto', voiceName: null, voiceLang: null, rate: 1.0, pitch: 1.0, autoPlay: false }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} deckId  - The deck ID, or 'daily-review' for multi-deck mode.
 * @returns {{
 *   voiceSettings: { front: object, back: object },
 *   decksSettingsMap: object,          // populated only in daily-review mode
 *   getSettingsForDeck: (id) => object, // looks up per-deck settings
 *   handleVoiceSettingsChange: (newSettings, { isFlipped, currentDeckId }) => Promise<void>
 * }}
 */
export function useVoiceSettings(deckId) {
  const [voiceSettings, setVoiceSettings] = useState(DEFAULT_SETTINGS)
  const [decksSettingsMap, setDecksSettingsMap] = useState({})

  const { decks: cacheDecks, loading: hookDecksLoading, reload: reloadDecks } = useDeckData()

  useEffect(() => {
    if (!deckId || hookDecksLoading) return

    let cancelled = false

    const loadSettings = async () => {
      try {
        if (deckId === 'daily-review') {
          // Multi-deck: filter from cache directly
          const allDecks = cacheDecks || []
          if (cancelled) return

          const map = {}
          allDecks.forEach((deck) => {
            if (deck.voice_settings) {
              map[deck._id || deck.id] = {
                front: normalizeSide(deck.voice_settings.front),
                back: normalizeSide(deck.voice_settings.back)
              }
            }
          })
          setDecksSettingsMap(map)
        } else {
          // Single deck: find from cache
          const deck = (cacheDecks || []).find((d) => (d._id || d.id) === deckId)
          if (cancelled) return

          if (deck?.voice_settings) {
            setVoiceSettings({
              front: normalizeSide(deck.voice_settings.front),
              back: normalizeSide(deck.voice_settings.back)
            })
          }
        }
      } catch (err) {
        if (!cancelled) console.error('[useVoiceSettings] Error loading settings:', err)
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [deckId, cacheDecks, hookDecksLoading])

  /**
   * Look up per-deck settings in daily-review mode.
   * Falls back to defaults if the deck has no stored settings.
   */
  const getSettingsForDeck = (id) => decksSettingsMap[id] || DEFAULT_SETTINGS

  /**
   * Update voice settings for one side and persist to the backend.
   *
   * @param {object} newSettings  - Partial settings from TTSControls.onVoiceSettingsChange
   * @param {{ isFlipped: boolean, currentDeckId?: string }} ctx
   */
  const handleVoiceSettingsChange = async (newSettings, { isFlipped, currentDeckId } = {}) => {
    const side = isFlipped ? 'back' : 'front'

    // Resolve which deckId to save to
    const targetId = currentDeckId || deckId
    if (!targetId || targetId === 'daily-review') {
      // daily-review without a currentDeckId — nothing to save
      if (!currentDeckId) {
        console.warn('[useVoiceSettings] daily-review mode but no currentDeckId provided. Settings not saved.')
        return
      }
    }

    // Build updated settings
    const base = deckId === 'daily-review' ? decksSettingsMap[targetId] || DEFAULT_SETTINGS : voiceSettings

    const updated = {
      ...base,
      [side]: { ...base[side], ...newSettings }
    }

    // Update local state
    if (deckId === 'daily-review') {
      setDecksSettingsMap((prev) => ({ ...prev, [targetId]: updated }))
      // Sync the active voiceSettings so TTSControls sees the change immediately
      setVoiceSettings(updated)
    } else {
      setVoiceSettings(updated)
    }

    // Persist to backend in canonical snake_case format
    const payload = {
      front: serializeSide(updated.front),
      back: serializeSide(updated.back)
    }

    try {
      await decksService.update(targetId, { voice_settings: payload })
      reloadDecks()
    } catch (err) {
      console.error('[useVoiceSettings] Error saving settings:', err)
    }
  }

  return {
    voiceSettings,
    decksSettingsMap,
    getSettingsForDeck,
    handleVoiceSettingsChange
  }
}
