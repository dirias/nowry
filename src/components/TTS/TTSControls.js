import React, { useState, useEffect, useMemo } from 'react'
import { Box, IconButton, Select, Option, Stack, Tooltip, Slider, Typography, Switch } from '@mui/joy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import ttsService from '../../utils/tts.service'
import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given the raw voices list from the Web Speech API, build a deduplicated
 * list of languages sorted alphabetically. Each entry has:
 *   { langCode, label, bestVoice }
 *
 * bestVoice is the highest-quality voice available for that language on
 * this device (preferring Google > Enhanced > Premium > first available).
 */
function buildLanguageOptions(voices) {
  const seen = new Map() // langBase → entry

  for (const voice of voices) {
    // Normalize lang code: some Android voices use underscore ("ja_JP")
    const lang = voice.lang.replace(/_/g, '-')
    const langBase = lang.split('-')[0].toLowerCase() // "ja", "en", "de"

    if (!seen.has(langBase)) {
      // Get a human-readable language name via Intl.DisplayNames
      let label = langBase
      try {
        label = new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(langBase) || langBase
      } catch (_) {
        label = langBase
      }

      seen.set(langBase, { langCode: lang, langBase, label, bestVoice: voice })
    } else {
      // Prefer higher-quality voice for the same language
      const entry = seen.get(langBase)
      const isCurrentBetter = voice.name.includes('Google') || voice.name.includes('Enhanced') || voice.name.includes('Premium')
      const currentIsBetter =
        entry.bestVoice.name.includes('Google') || entry.bestVoice.name.includes('Enhanced') || entry.bestVoice.name.includes('Premium')
      if (isCurrentBetter && !currentIsBetter) {
        seen.get(langBase).bestVoice = voice
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Find the best available voice for a given target language or voice name.
 * Priority:
 *   1. Exact language code match (e.g. "ja-JP" or "ja")
 *   2. Any voice whose lang starts with the target base
 *   3. Look up the target name in ALL system voices to derive its language
 */
function resolveVoice(voices, { targetLang, targetName }) {
  // 1. Language code match (primary — works cross-device)
  if (targetLang) {
    const base = targetLang.split('-')[0].toLowerCase()
    // Prefer best quality for that language
    const candidates = voices.filter((v) => v.lang.replace(/_/g, '-').split('-')[0].toLowerCase() === base)
    if (candidates.length > 0) {
      return candidates.find((v) => v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium')) || candidates[0]
    }
  }

  // 2. Exact name match (same device, backward compat)
  if (targetName) {
    const exact = voices.find((v) => v.name === targetName)
    if (exact) return exact
  }

  // 3. Derive language from the saved name via system voices
  if (targetName) {
    const allSystem = ttsService.getVoices()
    const original = allSystem.find((v) => v.name === targetName)
    if (original) {
      const base = original.lang.split('-')[0].toLowerCase()
      return voices.find((v) => v.lang.replace(/_/g, '-').split('-')[0].toLowerCase() === base) || null
    }
  }

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TTSControls({
  text,
  compact = false,
  settingsOnly = false,
  settingsOpen,
  onSettingsChange,
  voiceSettings,
  onVoiceSettingsChange
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [allVoices, setAllVoices] = useState([]) // raw list from Web Speech API
  const [selectedLang, setSelectedLang] = useState(null) // e.g. "ja"
  const [selectedVoice, setSelectedVoice] = useState(null) // actual SpeechSynthesisVoice
  const [rate, setRate] = useState(1.0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [internalShowSettings, setInternalShowSettings] = useState(false)
  // Tracks whether the user has ever initiated playback – required for auto‑play on mobile browsers
  const [userInitiated, setUserInitiated] = useState(false)

  const isSettingsOpen = settingsOpen !== undefined ? settingsOpen : internalShowSettings
  const setSettingsOpen = onSettingsChange || setInternalShowSettings

  // ── Language options derived from available voices ─────────────────────────
  // Each device contributes whatever TTS voices are installed; we normalize them
  // into a clean language list that is identical in structure across all devices.
  const languageOptions = useMemo(() => buildLanguageOptions(allVoices), [allVoices])

  // ── Load voices ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleVoices = (voices) => setAllVoices(voices)
    const cleanup = ttsService.onVoicesReady(handleVoices)
    return cleanup
  }, [])

  // ── Apply saved settings whenever voices or settings change ───────────────
  // Uses language code as the canonical key, so the correct voice is found
  // regardless of which TTS engine or device is in use.
  useEffect(() => {
    if (!allVoices.length) return

    if (voiceSettings) {
      const targetLang = voiceSettings.voiceLang || voiceSettings.voice_lang || null
      const targetName = voiceSettings.voiceName || voiceSettings.voice_name || null

      const matched = resolveVoice(allVoices, { targetLang, targetName })
      if (matched) {
        const langBase = matched.lang.replace(/_/g, '-').split('-')[0].toLowerCase()
        setSelectedLang(langBase)
        setSelectedVoice(matched)
        ttsService.setVoice(matched)
      }

      if (voiceSettings.rate !== undefined) setRate(voiceSettings.rate)
      if (voiceSettings.autoPlay !== undefined) setAutoPlay(voiceSettings.autoPlay)
      else if (voiceSettings.auto_play !== undefined) setAutoPlay(voiceSettings.auto_play)
    } else if (!selectedVoice) {
      // No settings saved — default to first English voice
      const def = resolveVoice(allVoices, { targetLang: 'en', targetName: null })
      if (def) {
        setSelectedLang('en')
        setSelectedVoice(def)
        ttsService.setVoice(def)
      }
    }
  }, [voiceSettings, allVoices, selectedVoice, onVoiceSettingsChange])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePlay = React.useCallback(() => {
    if (!text) return
    // Mark that the user has initiated playback – this satisfies the user‑gesture requirement on mobile
    setUserInitiated(true)
    ttsService.speak(text, {
      rate,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    })
  }, [text, rate])

  const handlePause = () => {
    ttsService.pause()
    setIsPlaying(false)
  }

  // ── Auto-play effect ───────────────────────────────────────────────────────
  useEffect(() => {
    // Auto‑play is only allowed after a user interaction (required on iOS/Android)
    if (autoPlay && text && !isPlaying && allVoices.length > 0 && userInitiated) {
      handlePlay()
    }
  }, [text, autoPlay, allVoices.length, userInitiated, handlePlay, isPlaying])

  const handleLanguageChange = (event, langBase) => {
    if (!langBase) return
    const entry = languageOptions.find((o) => o.langBase === langBase)
    if (!entry) return

    const voice = entry.bestVoice
    setSelectedLang(langBase)
    setSelectedVoice(voice)
    ttsService.setVoice(voice)

    // Save lang code + name so both can be used for matching on any future device
    if (onVoiceSettingsChange) {
      onVoiceSettingsChange({ voiceName: voice.name, voiceLang: voice.lang, rate, pitch: 1.0, autoPlay })
    }
  }

  const handleRateChange = (e, val) => {
    setRate(val)
    if (onVoiceSettingsChange) {
      onVoiceSettingsChange({ voiceName: selectedVoice?.name, voiceLang: selectedVoice?.lang, rate: val, pitch: 1.0, autoPlay })
    }
  }

  const handleAutoPlayChange = (e) => {
    const newVal = e.target.checked
    setAutoPlay(newVal)
    // Enabling auto‑play is a user gesture, so mark interaction
    if (newVal) setUserInitiated(true)
    if (onVoiceSettingsChange) {
      onVoiceSettingsChange({ voiceName: selectedVoice?.name, voiceLang: selectedVoice?.lang, rate, pitch: 1.0, autoPlay: newVal })
    }
  }

  // ── Click outside ──────────────────────────────────────────────────────────
  const settingsRef = React.useRef(null)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isPortalClick =
        event.target.closest('[role="presentation"]') ||
        event.target.closest('[role="listbox"]') ||
        event.target.closest('.MuiPopover-root') ||
        event.target.closest('[data-mui-portal]')
      if (isPortalClick) return
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false)
      }
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen, setSettingsOpen])

  // ── Settings-only render (used by CardPreviewModal to show panel without floating buttons) ──
  if (settingsOnly) {
    return (
      <Stack spacing={2}>
        {/* Language selector */}
        <Box>
          <Typography level='body-xs' sx={{ mb: 0.5, fontWeight: 600 }}>
            Language
          </Typography>
          <Select
            size='sm'
            value={selectedLang ?? null}
            onChange={handleLanguageChange}
            placeholder={languageOptions.length === 0 ? 'Loading\u2026' : 'Select Language'}
          >
            {languageOptions.map((opt) => (
              <Option key={opt.langBase} value={opt.langBase}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Box>

        {/* Speed slider */}
        <Box>
          <Typography level='body-xs' sx={{ mb: 0.5, fontWeight: 600 }}>
            Speed: {rate}x
          </Typography>
          <Slider value={rate} onChange={handleRateChange} min={0.5} max={2.0} step={0.1} size='sm' />
        </Box>

        {/* Auto-play toggle */}
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography level='body-xs' sx={{ fontWeight: 600 }}>
            Auto-Play
          </Typography>
          <Switch size='sm' checked={autoPlay} onChange={handleAutoPlayChange} />
        </Stack>
      </Stack>
    )
  }

  // ── Compact render (floating over a card) ─────────────────────────────────
  if (compact) {
    return (
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 1 }}>
        <Tooltip title={isPlaying ? 'Pause' : 'Listen'}>
          <IconButton
            size='sm'
            variant='solid'
            color='primary'
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!text}
            sx={{ borderRadius: '50%', boxShadow: 'sm' }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title='Voice Settings'>
          <IconButton
            size='sm'
            onMouseDown={(e) => e.stopPropagation()}
            variant='soft'
            color='neutral'
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            sx={{ borderRadius: '50%' }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {isSettingsOpen && (
          <Box
            ref={settingsRef}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 40,
              right: 0,
              width: 280,
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 'md',
              boxShadow: 'lg',
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              zIndex: 20
            }}
          >
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
              <Typography level='title-sm'>Voice Settings</Typography>
              <IconButton size='sm' variant='plain' color='neutral' onClick={() => setSettingsOpen(false)}>
                <CloseIcon fontSize='small' />
              </IconButton>
            </Stack>

            <Stack spacing={2}>
              <Box>
                <Typography level='body-xs' sx={{ mb: 0.5, fontWeight: 600 }}>
                  Language
                </Typography>
                <Select
                  size='sm'
                  value={selectedLang ?? null}
                  onChange={handleLanguageChange}
                  placeholder={languageOptions.length === 0 ? 'Loading\u2026' : 'Select Language'}
                >
                  {languageOptions.map((opt) => (
                    <Option key={opt.langBase} value={opt.langBase}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Typography level='body-xs' sx={{ mb: 0.5, fontWeight: 600 }}>
                  Speed: {rate}x
                </Typography>
                <Slider value={rate} onChange={handleRateChange} min={0.5} max={2.0} step={0.1} size='sm' />
              </Box>

              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Typography level='body-xs' sx={{ fontWeight: 600 }}>
                  Auto-Play
                </Typography>
                <Switch size='sm' checked={autoPlay} onChange={handleAutoPlayChange} />
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>
    )
  }

  return null
}
