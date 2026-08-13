import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemDecorator,
  Menu,
  MenuItem,
  Select,
  Option,
  Snackbar,
  Stack,
  Switch,
  Tooltip,
  Typography
} from '@mui/joy'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import LockIcon from '@mui/icons-material/Lock'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import TitleRoundedIcon from '@mui/icons-material/TitleRounded'
import { $getRoot } from 'lexical'
import { ttsService } from '../../api/services/tts.ai.service'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

// Extract full book text from Lexical editor state
const getFullBookText = (editorInstanceRef) => {
  const editor = editorInstanceRef.current
  if (!editor) return ''
  let text = ''
  editor.getEditorState().read(() => {
    text = $getRoot().getTextContent()
  })
  return text
}

export default function TTSToolbar({ tier, editorInstanceRef, bookId }) {
  const { t } = useTranslation()
  const { openUpgradeModal } = useSubscriptionContext()

  const [ttsState, setTtsState] = useState('idle') // 'idle' | 'loading' | 'playing' | 'paused'
  const [ttsLanguage, setTtsLanguage] = useState('en-US')
  const [autoDetect, setAutoDetect] = useState(true) // Pro-only (ADR-002) — default ON; never rendered/sent for Plus/Free
  const [ttsPickerOpen, setTtsPickerOpen] = useState(false)
  const [ttsSections, setTtsSections] = useState([])
  const [ttsError, setTtsError] = useState(null)

  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)
  const playButtonRef = useRef(null)

  // Cleanup Blob URL on unmount (T-6-13 Information Disclosure mitigation)
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  // Extract H1/H2 headings from Lexical editor state
  const extractSections = useCallback(() => {
    const editor = editorInstanceRef.current
    if (!editor) return []
    const sections = []
    editor.getEditorState().read(() => {
      const root = $getRoot()
      const children = root.getChildren()
      children.forEach((node, idx) => {
        if (node.getType() === 'heading' && ['h1', 'h2'].includes(node.getTag())) {
          const title = node.getTextContent()
          const next = children[idx + 1]
          const preview = next ? next.getTextContent().slice(0, 60) : ''
          sections.push({ title, preview })
        }
      })
    })
    return sections
  }, [editorInstanceRef])

  const generateAndPlay = useCallback(
    async (sectionTitle) => {
      setTtsState('loading')
      setTtsSections([])
      setTtsPickerOpen(false)
      try {
        const text = sectionTitle || getFullBookText(editorInstanceRef)
        // autoDetect state only ever flips true via the Pro-only toggle
        // below, but gate on tier here too so a stale toggle value could
        // never reach the backend for a non-Pro caller.
        const blobUrl = await ttsService.generate(bookId, text, ttsLanguage, {
          autoDetect: tier === 'pro' && autoDetect
        })
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = blobUrl
        audioRef.current.src = blobUrl
        await audioRef.current.play()
        setTtsState('playing')
      } catch (e) {
        setTtsState('idle')
        // ADR-001: a segmentation-specific backend failure is distinguished
        // by a `segmentation_failed:`-prefixed `detail` string; anything
        // else (including non-auto-detect failures) keeps the generic message.
        const isSegmentationFailure = typeof e?.ttsDetail === 'string' && e.ttsDetail.startsWith('segmentation_failed:')
        setTtsError(isSegmentationFailure ? t('aiMagic.tts.segmentError') : t('aiMagic.tts.error'))
      }
    },
    [bookId, ttsLanguage, autoDetect, tier, editorInstanceRef, t]
  )

  const handleTTSPlayClick = () => {
    const sections = extractSections()
    if (sections.length === 0) {
      // No headings — go directly to full-book TTS
      generateAndPlay('')
    } else {
      setTtsSections(sections)
      setTtsPickerOpen(true)
    }
  }

  const handleTTSSelectSection = (sectionTitle) => {
    generateAndPlay(sectionTitle)
  }

  const handleTTSPause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setTtsState('paused')
  }

  const handleTTSResume = () => {
    if (audioRef.current) {
      audioRef.current.play()
    }
    setTtsState('playing')
  }

  const handleTTSStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setTtsState('idle')
  }

  const handleTTSEnded = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setTtsState('idle')
  }

  // Free tier — locked button with Plus badge
  if (tier === 'free') {
    return (
      <Stack direction='row' alignItems='center' sx={{ display: { xs: 'none', md: 'flex' } }}>
        <Tooltip title={t('aiMagic.tts.lockedTooltip')} variant='soft' size='sm'>
          <span>
            <Button
              size='sm'
              variant='outlined'
              color='neutral'
              startDecorator={<LockIcon sx={{ fontSize: 16 }} />}
              onClick={() => openUpgradeModal(t('upgrade.headlines.tts'))}
              aria-label={t('aiMagic.tts.lockedAriaLabel')}
            >
              {t('aiMagic.tts.label')}
              <Chip size='sm' color='warning' variant='soft' sx={{ ml: 1 }}>
                {t('plans.plus')}
              </Chip>
            </Button>
          </span>
        </Tooltip>
      </Stack>
    )
  }

  // Plus/Pro tier — full TTS controls
  return (
    <Stack direction='row' alignItems='center' spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
      {/* Pro language selector + auto-detect toggle (ADR-001, Pro-only) */}
      {tier === 'pro' && (
        <Stack direction='row' alignItems='center' spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Tooltip title={t('aiMagic.tts.autoDetectLabel')} variant='soft' size='sm'>
            <Stack direction='row' alignItems='center' spacing={0.5}>
              <Typography level='body-xs' sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {t('aiMagic.tts.autoDetectLabel')}
              </Typography>
              <Switch
                size='sm'
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                aria-label={t('aiMagic.tts.autoDetectAriaLabel')}
              />
            </Stack>
          </Tooltip>
          {/* Manual language Select is irrelevant once auto-detect segments
              per-language itself — hide it rather than let it contradict
              the toggle (matches the Auto/Manual relationship in TTSControls.js). */}
          {!autoDetect && (
            <Select
              size='sm'
              value={ttsLanguage}
              onChange={(_, val) => setTtsLanguage(val)}
              aria-label={t('aiMagic.tts.languageAriaLabel')}
              sx={{ minWidth: 100 }}
            >
              <Option value='en-US'>{t('aiMagic.tts.languages.en')}</Option>
              <Option value='es-ES'>{t('aiMagic.tts.languages.es')}</Option>
              <Option value='fr-FR'>{t('aiMagic.tts.languages.fr')}</Option>
              <Option value='de-DE'>{t('aiMagic.tts.languages.de')}</Option>
              <Option value='ja-JP'>{t('aiMagic.tts.languages.ja')}</Option>
              <Option value='pt-BR'>{t('aiMagic.tts.languages.pt')}</Option>
              <Option value='zh-CN'>{t('aiMagic.tts.languages.zh')}</Option>
            </Select>
          )}
          <Divider orientation='vertical' sx={{ height: 20 }} />
        </Stack>
      )}

      {/* Play button — state-driven rendering */}
      {ttsState === 'idle' && (
        <Tooltip title={t('aiMagic.tts.playTooltip')} variant='soft' size='sm'>
          <IconButton
            ref={playButtonRef}
            size='sm'
            variant='outlined'
            color='neutral'
            onClick={handleTTSPlayClick}
            aria-label={t('aiMagic.tts.playAriaLabel')}
          >
            <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {ttsState === 'loading' && (
        <IconButton size='sm' variant='soft' color='primary' disabled aria-label={t('aiMagic.tts.loadingAriaLabel')}>
          <CircularProgress size='sm' sx={{ '--CircularProgress-size': '18px' }} />
        </IconButton>
      )}

      {ttsState === 'playing' && (
        <Tooltip title={t('aiMagic.tts.pauseTooltip')} variant='soft' size='sm'>
          <IconButton
            size='sm'
            variant='soft'
            color='primary'
            onClick={handleTTSPause}
            aria-label={t('aiMagic.tts.pauseAriaLabel')}
            sx={{ bgcolor: 'primary.softBg' }}
          >
            <PauseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {ttsState === 'paused' && (
        <Tooltip title={t('aiMagic.tts.resumeTooltip')} variant='soft' size='sm'>
          <IconButton size='sm' variant='outlined' color='primary' onClick={handleTTSResume} aria-label={t('aiMagic.tts.resumeAriaLabel')}>
            <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Stop button — shown while playing or paused */}
      {(ttsState === 'playing' || ttsState === 'paused') && (
        <Tooltip title={t('aiMagic.tts.stopTooltip')} variant='soft' size='sm'>
          <IconButton size='sm' variant='plain' color='neutral' onClick={handleTTSStop} aria-label={t('aiMagic.tts.stopAriaLabel')}>
            <StopRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Section picker popover */}
      <Menu
        open={ttsPickerOpen}
        onClose={() => setTtsPickerOpen(false)}
        anchorEl={playButtonRef.current}
        placement='bottom-start'
        sx={{ minWidth: 220, maxWidth: 320, maxHeight: 320, overflowY: 'auto' }}
      >
        {/* Full book option — always first */}
        <MenuItem onClick={() => handleTTSSelectSection('')}>
          <ListItemDecorator>
            <MenuBookRoundedIcon sx={{ fontSize: 16 }} />
          </ListItemDecorator>
          <Box>
            <Typography level='title-sm'>{t('aiMagic.tts.fullBook')}</Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {t('aiMagic.tts.fullBookHint')}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        {ttsSections.map((section, idx) => (
          <MenuItem key={idx} onClick={() => handleTTSSelectSection(section.title)}>
            <ListItemDecorator>
              <TitleRoundedIcon sx={{ fontSize: 16 }} />
            </ListItemDecorator>
            <Box sx={{ minWidth: 0 }}>
              <Typography level='title-sm' noWrap>
                {section.title}
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }} noWrap>
                {section.preview}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Hidden audio element — style exception for native HTML element */}
      <audio ref={audioRef} style={{ display: 'none' }} onEnded={handleTTSEnded} />

      {/* Error Snackbar */}
      <Snackbar
        open={!!ttsError}
        autoHideDuration={4000}
        onClose={() => setTtsError(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {ttsError}
      </Snackbar>
    </Stack>
  )
}
