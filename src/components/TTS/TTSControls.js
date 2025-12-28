import React, { useState, useEffect } from 'react'
import { Box, IconButton, Select, Option, Stack, Tooltip, Slider, Typography } from '@mui/joy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import SpeedIcon from '@mui/icons-material/Speed'
import ttsService from '../../utils/tts.service'

export default function TTSControls({ text, compact = false }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [rate, setRate] = useState(1.0)
  const [volume, setVolume] = useState(1.0)

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const availableVoices = ttsService.getVoices()
      setVoices(availableVoices)
      if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0])
      }
    }

    // Initial load
    loadVoices()

    // Chrome loads voices async
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

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
    const voice = voices.find((v) => v.name === value)
    if (voice) {
      setSelectedVoice(voice)
      ttsService.setVoice(voice)
    }
  }

  if (compact) {
    return (
      <Tooltip title='Read Aloud'>
        <IconButton size='sm' variant='soft' onClick={isPlaying ? handlePause : handlePlay} disabled={!text}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'md' }}>
      <Typography level='title-sm' sx={{ mb: 2, fontWeight: 600 }}>
        🔊 Text-to-Speech
      </Typography>

      <Stack spacing={2}>
        {/* Playback Controls */}
        <Stack direction='row' spacing={1} alignItems='center'>
          <IconButton
            color={isPlaying ? 'warning' : 'primary'}
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!text}
            size='lg'
            variant='soft'
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton onClick={handleStop} disabled={!isPlaying} size='lg' variant='soft' color='neutral'>
            <StopIcon />
          </IconButton>
        </Stack>

        {/* Voice Selection */}
        <Box>
          <Typography
            level='body-xs'
            sx={{ mb: 0.5, color: 'neutral.600', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            Voice
          </Typography>
          <Select size='sm' value={selectedVoice?.name || ''} onChange={handleVoiceChange} placeholder='Select Voice'>
            {voices.map((voice) => (
              <Option key={voice.name} value={voice.name}>
                {voice.name.split(' ')[0]} ({voice.lang.split('-')[0].toUpperCase()})
              </Option>
            ))}
          </Select>
        </Box>

        {/* Speed Control */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
            <Typography level='body-xs' sx={{ color: 'neutral.600', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Speed
            </Typography>
            <Typography level='body-xs' sx={{ color: 'primary.600', fontWeight: 700 }}>
              {rate.toFixed(1)}x
            </Typography>
          </Stack>
          <Slider
            value={rate}
            onChange={(e, val) => setRate(val)}
            min={0.5}
            max={2.0}
            step={0.1}
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1.0, label: '1x' },
              { value: 2.0, label: '2x' }
            ]}
          />
        </Box>

        {/* Volume Control */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
            <Typography level='body-xs' sx={{ color: 'neutral.600', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Volume
            </Typography>
            <Typography level='body-xs' sx={{ color: 'primary.600', fontWeight: 700 }}>
              {Math.round(volume * 100)}%
            </Typography>
          </Stack>
          <Slider
            value={volume}
            onChange={(e, val) => setVolume(val)}
            min={0}
            max={1}
            step={0.1}
            marks={[
              { value: 0, label: '0%' },
              { value: 0.5, label: '50%' },
              { value: 1, label: '100%' }
            ]}
          />
        </Box>
      </Stack>
    </Box>
  )
}
