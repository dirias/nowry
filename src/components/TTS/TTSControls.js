import React, { useState, useEffect } from 'react'
import { Box, IconButton, Select, Option, Stack, Tooltip, Slider, Typography } from '@mui/joy'
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

  // Use controlled state if provided, otherwise internal
  const isSettingsOpen = settingsOpen !== undefined ? settingsOpen : internalShowSettings
  const setSettingsOpen = onSettingsChange || setInternalShowSettings

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const allVoices = ttsService.getVoices()

      // Filter for natural voices only as requested
      const naturalVoices = allVoices.filter(
        (v) => v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Natural')
      )

      // Fallback if no natural voices found (rare but possible) or use found list
      const finalVoices = naturalVoices.length > 0 ? naturalVoices : allVoices

      setVoices(finalVoices)

      // Initial selection logic (only if no voiceSettings provided)
      if (finalVoices.length > 0 && !selectedVoice && !voiceSettings) {
        const defaultVoice = finalVoices.find((v) => v.lang.startsWith('en')) || finalVoices[0]
        setSelectedVoice(defaultVoice)
        ttsService.setVoice(defaultVoice)
        setRate(1.0)
        setVolume(1.0)
      }
    }

    loadVoices()

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, []) // Keep empty dep array for initial load only

  // Sync with prop changes (Controlled Mode)
  useEffect(() => {
    if (voiceSettings && voices.length > 0) {
      const targetVoice = voiceSettings.voiceName || voiceSettings.voice_name

      if (targetVoice) {
        const matchedVoice = voices.find((v) => v.name === targetVoice)
        if (matchedVoice) {
          setSelectedVoice(matchedVoice)
          ttsService.setVoice(matchedVoice)
        }
      }
      if (voiceSettings.rate !== undefined) setRate(voiceSettings.rate)
      if (voiceSettings.pitch !== undefined) {
        /* Pitch not implemented in UI yet but good to have */
      }
      // Volume is usually global preference, but we can adhere if passed
    }
  }, [voiceSettings, voices])

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
        const payload = { voiceName: voice.name, rate, pitch: 1.0 }
        onVoiceSettingsChange(payload)
      }
    }
  }

  const handleRateChange = (e, val) => {
    setRate(val)
    // Debounce or commit? For now just notify on change (user unlikely to spam)
    if (onVoiceSettingsChange) {
      const payload = { voiceName: selectedVoice?.name, rate: val, pitch: 1.0 }
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
                  {voices.map((voice) => (
                    <Option key={voice.name} value={voice.name}>
                      {voice.name
                        .replace('Google', '')
                        .replace('English', '')
                        .replace('United States', '')
                        .replace(/\(.*\)/, '')
                        .trim()}{' '}
                      ({voice.lang.split('-')[1] || 'EN'})
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
