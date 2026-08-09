/**
 * TASK-006 — useVoiceSettings mode default tests (ADR-002).
 *
 * ADR-002 reverses ADR-001's backward-compat clause: auto-detect is now the
 * default for ALL decks, including ones that already have a saved
 * `voice_lang` from before this feature existed. A stored `voice_lang` no
 * longer implies `mode: 'manual'` — only an EXPLICIT, previously-persisted
 * `mode: 'manual'` (the user already interacted with the toggle and chose
 * manual) keeps a deck on manual. The old `voice_lang`/`voice_name` values
 * are never lost — they stay in the normalized object as the values used if
 * the user switches back to manual mode.
 *
 * normalizeSide()/serializeSide() are pure functions exported directly from
 * the hook module so these regression tests exercise the real implementation
 * (not a mirrored copy) — the exact behavior that would silently break
 * existing users if it regressed.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { normalizeSide, serializeSide, useVoiceSettings } from './useVoiceSettings'

// ─── normalizeSide() — pure-function regression tests ──────────────────────

describe('normalizeSide: mode default derivation (ADR-002)', () => {
  it('auto-detect is the default even for decks with a legacy manually-saved voice_lang (snake_case, no mode)', () => {
    const result = normalizeSide({ voice_lang: 'ja-JP', voice_name: 'Google 日本語', rate: 1.2, pitch: 1.0, auto_play: true })
    expect(result.mode).toBe('auto')
    // The prior manual pick is demoted to an override, not deleted — it must
    // still be present so switching to Manual mode restores it exactly.
    expect(result.voiceLang).toBe('ja-JP')
    expect(result.voiceName).toBe('Google 日本語')
  })

  it('auto-detect is the default even for decks with a legacy manually-saved voiceLang (camelCase, no mode)', () => {
    const result = normalizeSide({ voiceLang: 'es-ES' })
    expect(result.mode).toBe('auto')
    expect(result.voiceLang).toBe('es-ES')
  })

  it('a deck with no saved voice settings at all (raw is falsy) normalizes to mode: "auto"', () => {
    expect(normalizeSide(null).mode).toBe('auto')
    expect(normalizeSide(undefined).mode).toBe('auto')
  })

  it('a deck with a settings object but no voiceLang/voice_lang and no mode normalizes to mode: "auto"', () => {
    const result = normalizeSide({ rate: 1.0, pitch: 1.0, autoPlay: false })
    expect(result.mode).toBe('auto')
  })

  it('an explicit, already-persisted mode: "manual" still normalizes to "manual", with voiceLang preserved as the override value', () => {
    // This is the one case that must NOT flip: a user who already
    // interacted with the toggle post-launch and explicitly chose manual.
    const result = normalizeSide({ voice_lang: 'ja-JP', voice_name: 'Google 日本語', mode: 'manual' })
    expect(result.mode).toBe('manual')
    expect(result.voiceLang).toBe('ja-JP')
    expect(result.voiceName).toBe('Google 日本語')
  })

  it('an explicit saved mode always wins over derivation, even if it disagrees with voiceLang presence', () => {
    // Explicit mode is authoritative once a user has toggled it post-launch.
    expect(normalizeSide({ voice_lang: 'ja-JP', mode: 'auto' }).mode).toBe('auto')
    expect(normalizeSide({ mode: 'manual' }).mode).toBe('manual')
  })
})

describe('serializeSide: persists mode', () => {
  it('includes mode in the canonical snake_case payload, defaulting to "auto" when absent', () => {
    expect(serializeSide({ voiceName: 'x', voiceLang: 'en-US', rate: 1.0, pitch: 1.0, autoPlay: false }).mode).toBe('auto')
  })

  it('round-trips an explicit manual mode', () => {
    expect(serializeSide({ mode: 'manual', voiceLang: 'ja-JP' }).mode).toBe('manual')
  })
})

// ─── useVoiceSettings() — fixture-deck regression test through the real hook ─

const mockUseDeckData = jest.fn()
jest.mock('./useDeckData', () => ({
  useDeckData: (...args) => mockUseDeckData(...args)
}))

const mockUpdate = jest.fn().mockResolvedValue({})
jest.mock('../api/services', () => ({
  decksService: { update: (...args) => mockUpdate(...args) }
}))

describe('useVoiceSettings: fixture-deck regression (loads through the real hook)', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('a fixture deck with a pre-existing voice_lang and no explicit mode now loads as mode: "auto", not "manual" (ADR-002)', async () => {
    const fixtureDeck = {
      _id: 'deck-1',
      voice_settings: {
        front: { voice_lang: 'ja-JP', voice_name: 'Google 日本語', rate: 1.0, pitch: 1.0, auto_play: false },
        back: { voice_lang: 'ja-JP', voice_name: 'Google 日本語', rate: 1.0, pitch: 1.0, auto_play: false }
      }
    }
    mockUseDeckData.mockReturnValue({ decks: [fixtureDeck], loading: false, reload: jest.fn() })

    const { result } = renderHook(() => useVoiceSettings('deck-1'))

    await waitFor(() => {
      expect(result.current.voiceSettings.front.mode).toBe('auto')
    })
    expect(result.current.voiceSettings.back.mode).toBe('auto')
    // The legacy voice pick is preserved as the override, ready for use the
    // moment the user manually switches this deck back to Manual mode.
    expect(result.current.voiceSettings.front.voiceLang).toBe('ja-JP')
    expect(result.current.voiceSettings.front.voiceName).toBe('Google 日本語')
  })

  it('a fixture deck with an explicit, already-persisted mode: "manual" still loads as mode: "manual"', async () => {
    const fixtureDeck = {
      _id: 'deck-3',
      voice_settings: {
        front: { mode: 'manual', voice_lang: 'ja-JP', voice_name: 'Google 日本語', rate: 1.0, pitch: 1.0, auto_play: false },
        back: { mode: 'manual', voice_lang: 'ja-JP', voice_name: 'Google 日本語', rate: 1.0, pitch: 1.0, auto_play: false }
      }
    }
    mockUseDeckData.mockReturnValue({ decks: [fixtureDeck], loading: false, reload: jest.fn() })

    const { result } = renderHook(() => useVoiceSettings('deck-3'))

    await waitFor(() => {
      expect(result.current.voiceSettings.front.mode).toBe('manual')
    })
    expect(result.current.voiceSettings.back.mode).toBe('manual')
    expect(result.current.voiceSettings.front.voiceLang).toBe('ja-JP')
  })

  it('a fixture deck with no saved voice_settings loads as mode: "auto"', async () => {
    const fixtureDeck = { _id: 'deck-2' } // no voice_settings at all
    mockUseDeckData.mockReturnValue({ decks: [fixtureDeck], loading: false, reload: jest.fn() })

    const { result } = renderHook(() => useVoiceSettings('deck-2'))

    // No voice_settings on the deck means the hook never overwrites DEFAULT_SETTINGS.
    await waitFor(() => {
      expect(result.current.voiceSettings.front.mode).toBe('auto')
    })
    expect(result.current.voiceSettings.back.mode).toBe('auto')
  })
})
