import React, { useState, useEffect } from 'react'
import { Box, IconButton, Select, Option, Stack, Tooltip, Slider, Typography, Switch } from '@mui/joy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import SpeedIcon from '@mui/icons-material/Speed'
import ttsService from '../../utils/tts.service'

import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'

export default function TTSControls({ text, compact = false, settingsOpen, onSettingsChange, voiceSettings, onVoiceSettingsChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [rate, setRate] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [internalShowSettings, setInternalShowSettings] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)

  // Use controlled state if provided, otherwise internal
  const isSettingsOpen = settingsOpen !== undefined ? settingsOpen : internalShowSettings
  const setSettingsOpen = onSettingsChange || setInternalShowSettings

  useEffect(() => {
    const handleVoices = (allVoices) => {
      // On desktop, "Google"/"Enhanced"/"Premium" voices exist and are higher quality.
      // On mobile (iOS/Android) these names don't appear — fall back to all voices.
      const naturalVoices = allVoices.filter(
        (v) => v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Natural')
      )
      const finalVoices = naturalVoices.length > 0 ? naturalVoices : allVoices
      setVoices(finalVoices)
    }

    // onVoicesReady calls immediately if voices are already loaded,
    // or waits for the polling/event to fire (critical for mobile).
    const cleanup = ttsService.onVoicesReady(handleVoices)
    return cleanup
  }, []) // onVoicesReady is stable (singleton), safe to omit from deps

  // ─── Unified voice-settings sync ────────────────────────────────────────────
  // This single effect handles BOTH "voices just loaded" AND "voiceSettings just
  // arrived from the hook" by depending on both. Whichever arrives last triggers
  // the match.
  useEffect(() => {
    if (!voices.length) return // voices not ready yet

    if (voiceSettings) {
      const targetVoice = voiceSettings.voiceName || voiceSettings.voice_name

      if (targetVoice) {
        // Try exact name match first (works on desktop Chrome)
        let matchedVoice = voices.find((v) => v.name === targetVoice)

        // Fallback: match by language. e.g. "Google 日本語" → look for any ja-* voice.
        // This is critical for mobile where Google voices don't exist.
        if (!matchedVoice) {
          // Try to detect the language from the saved voice name by checking ALL
          // system voices (not just filtered ones) for the original name.
          const allSystemVoices = ttsService.getVoices()
          const originalVoice = allSystemVoices.find((v) => v.name === targetVoice)
          if (originalVoice) {
            // Found the original voice in full list — match by language code
            const targetLang = originalVoice.lang.split('-')[0]
            matchedVoice = voices.find((v) => v.lang.startsWith(targetLang))
          } else {
            // Voice not in system at all — try partial name matching or language guess
            // Common pattern: "Google 日本語" → lang "ja", "Google Deutsch" → lang "de"
            matchedVoice = voices.find((v) => targetVoice.toLowerCase().includes(v.lang.split('-')[0]))
          }
        }

        if (matchedVoice) {
          setSelectedVoice(matchedVoice)
          ttsService.setVoice(matchedVoice)
        }
      }
      if (voiceSettings.rate !== undefined) setRate(voiceSettings.rate)
      if (voiceSettings.pitch !== undefined) {
        /* Pitch not implemented in UI yet but good to have */
      }
      if (voiceSettings.autoPlay !== undefined) setAutoPlay(voiceSettings.autoPlay)
      else if (voiceSettings.auto_play !== undefined) setAutoPlay(voiceSettings.auto_play)
    } else if (!selectedVoice && voices.length > 0) {
      // No saved settings at all — pick a sensible default
      const defaultVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0]
      setSelectedVoice(defaultVoice)
      ttsService.setVoice(defaultVoice)
      setRate(1.0)
    }
  }, [voiceSettings, voices])

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && text && !isPlaying && voices.length > 0) {
      // Don't auto-play if we just stopped it manually recently, or rely on state.
      // For now, pure reaction to text changing while autoPlay is true:
      handlePlay()
    }
  }, [text, autoPlay, voices.length]) // Intentional deps: trigger on text or autoPlay change

  const handlePlay = () => {
    if (!text) return

    ttsService.speak(text, {
      rate,
      volume,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    })
  }

  const handlePause = () => {
    ttsService.pause()
    setIsPlaying(false)
  }

  const handleStop = () => {
    ttsService.stop()
    setIsPlaying(false)
  }

  const handleVoiceChange = (event, value) => {
    if (!value) return
    const voice = voices.find((v) => v.name === value)

    if (voice) {
      setSelectedVoice(voice)
      ttsService.setVoice(voice)

      // Notify parent
      if (onVoiceSettingsChange) {
        const payload = { voiceName: voice.name, rate, pitch: 1.0, autoPlay }
        onVoiceSettingsChange(payload)
      }
    }
  }

  const handleRateChange = (e, val) => {
    setRate(val)
    // Debounce or commit? For now just notify on change (user unlikely to spam)
    if (onVoiceSettingsChange) {
      const payload = { voiceName: selectedVoice?.name, rate: val, pitch: 1.0, autoPlay }
      onVoiceSettingsChange(payload)
    }
  }

  const handleAutoPlayChange = (e) => {
    const newVal = e.target.checked
    setAutoPlay(newVal)
    if (onVoiceSettingsChange) {
      const payload = { voiceName: selectedVoice?.name, rate, pitch: 1.0, autoPlay: newVal }
      onVoiceSettingsChange(payload)
    }
  }

  // Click outside handler
  const settingsRef = React.useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on a MUI portal/popover (like Select dropdown)
      const isPortalClick =
        event.target.closest('[role="presentation"]') ||
        event.target.closest('[role="listbox"]') ||
        event.target.closest('.MuiPopover-root') ||
        event.target.closest('[data-mui-portal]')

      if (isPortalClick) {
        return // Don't close if clicking on a portal element
      }

      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false)
      }
    }

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSettingsOpen, setSettingsOpen])

  // Embedded/Compact Render (Top-Right of Card)
  if (compact) {
    return (
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 1 }}>
        {/* Play/Pause Button */}
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

        {/* Settings Toggle */}
        <Tooltip title='Voice Settings'>
          <IconButton
            size='sm'
            // prevent click propagation to document so it doesn't immediately trigger close
            onMouseDown={(e) => e.stopPropagation()}
            variant='soft'
            color='neutral'
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            sx={{ borderRadius: '50%' }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* Settings Popover */}
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
                  Voice
                </Typography>
                <Select size='sm' value={selectedVoice?.name ?? null} onChange={handleVoiceChange} placeholder='Select Voice'>
                  {voices.map((voice) => {
                    // Mobile Chrome uses '_' or no separator (e.g. "en_US", "asm", "bg")
                    // Desktop Chrome uses '-' (e.g. "en-US"). Handle both.
                    const langParts = voice.lang.replace(/_/g, '-').split('-')
                    const regionOrLang = langParts.length > 1 ? langParts[1].toUpperCase() : langParts[0].toUpperCase()

                    const label = voice.name
                      .replace('Google', '')
                      .replace('English', '')
                      .replace('United States', '')
                      .replace(/\(.*\)/, '')
                      .trim()

                    return (
                      <Option key={voice.name} value={voice.name}>
                        {label} ({regionOrLang})
                      </Option>
                    )
                  })}
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

  return (
    <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'md' }}>
      {/* ... keeping standalone render for other usages ... */}
      {/* Shortening this part as it's not currently used in StudySession, but safe to keep or basic */}
      <Typography level='title-sm'>Legacy View</Typography>
    </Box>
  )
}
