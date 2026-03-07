import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ModalDialog, ModalClose, Typography, Box, Button, Stack, Card, CardContent, Chip, IconButton, Tooltip } from '@mui/joy'
import { ArrowBack, ArrowForward, Flip, PlayArrow, Settings } from '@mui/icons-material'
import mermaid from 'mermaid'
import ttsService from '../../utils/tts.service'
import TTSControls from '../TTS/TTSControls'
import { useVoiceSettings } from '../../hooks/useVoiceSettings'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
})

export default function CardPreviewModal({ open, onClose, title, cards = [], initialIndex = 0, decks = [] }) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isFlipped, setIsFlipped] = useState(false)
  const [svgContent, setSvgContent] = useState('')
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setIsFlipped(false)
      setSvgContent('')
    }
  }, [open, initialIndex])

  const currentCard = cards[currentIndex]
  const currentDeckId = currentCard?.deck_id?._id || currentCard?.deck_id || null

  const { voiceSettings, handleVoiceSettingsChange: _handleVoiceSettingsChange } = useVoiceSettings(currentDeckId)
  const handleVoiceSettingsChange = (newSettings) => _handleVoiceSettingsChange(newSettings, { isFlipped, currentDeckId })

  const cardText = currentCard
    ? isFlipped
      ? currentCard.answer || currentCard.content || ''
      : currentCard.question || currentCard.title || ''
    : ''

  const currentAutoPlay = voiceSettings?.front?.autoPlay ?? voiceSettings?.front?.auto_play ?? false

  const handlePlayTTS = () => {
    if (!cardText) return
    ttsService.speak(cardText, {
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    })
  }

  // Auto-play: trigger when card text changes (card flip or navigation) if setting is on
  useEffect(() => {
    if (!open || !cardText || !currentAutoPlay) return
    const timer = setTimeout(() => handlePlayTTS(), 300)
    return () => clearTimeout(timer)
  }, [cardText, open, currentAutoPlay]) // handlePlayTTS intentionally omitted — stable ref not needed

  // Render Mermaid diagram for visual cards
  useEffect(() => {
    const renderDiagram = async () => {
      if (currentCard?.card_type === 'visual' && currentCard.diagram_code) {
        try {
          const id = `mermaid-preview-${Date.now()}`
          const { svg } = await mermaid.render(id, currentCard.diagram_code)
          setSvgContent(svg)
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          setSvgContent('<div style="color:red">Failed to render diagram</div>')
        }
      } else {
        setSvgContent('')
      }
    }
    if (open && currentCard) renderDiagram()
  }, [currentIndex, currentCard, open])

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsFlipped(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsFlipped(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault()
      setIsFlipped((prev) => !prev)
    }
  }

  if (!currentCard && cards.length > 0) return null

  const isMobileHint = 'ontouchstart' in window

  return (
    <Modal open={open} onClose={onClose} onKeyDown={handleKeyDown}>
      <ModalDialog
        layout='center'
        sx={{
          // Full-screen on mobile, centered overlay on desktop
          width: { xs: '100vw', sm: 640, md: 760 },
          maxWidth: '100vw',
          height: { xs: '100dvh', sm: 'auto' },
          maxHeight: { xs: '100dvh', sm: '92dvh' },
          p: 0,
          borderRadius: { xs: 0, sm: 'lg' },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none'
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        {/* ModalClose auto-positions in the top-right at the correct z-index */}
        <ModalClose sx={{ top: 12, right: 12, '--IconButton-size': '36px' }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: { xs: 2, sm: 2.5 },
            pr: { xs: 7, sm: 7 }, // right padding reserves space for ModalClose X
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            gap: 1
          }}
        >
          {/* Title + position */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level='title-sm' fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || t('cards.deck.preview')}
            </Typography>
            <Stack direction='row' alignItems='center' spacing={0.75}>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('cards.preview.cardOf', {
                  current: currentIndex + 1,
                  total: cards.length,
                  defaultValue: `${currentIndex + 1} / ${cards.length}`
                })}
              </Typography>
              {currentCard?.card_type && currentCard.card_type !== 'flashcard' && (
                <Chip size='sm' variant='soft' color='neutral' sx={{ fontSize: '0.6rem', height: 16, px: 0.5 }}>
                  {currentCard.card_type}
                </Chip>
              )}
            </Stack>
          </Box>

          {/* ▶ Play — modal-level audio control, belongs in the header chrome */}
          {currentCard && (
            <Tooltip title='Listen' size='sm'>
              <IconButton
                size='sm'
                variant='solid'
                color='primary'
                onClick={handlePlayTTS}
                disabled={!cardText}
                sx={{ borderRadius: '50%', flexShrink: 0, '--IconButton-size': '32px' }}
              >
                <PlayArrow sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* ⚙ Voice settings toggle */}
          {currentCard && (
            <Tooltip title='Voice Settings' size='sm'>
              <IconButton
                size='sm'
                variant={showVoiceSettings ? 'soft' : 'plain'}
                color={showVoiceSettings ? 'primary' : 'neutral'}
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                sx={{ borderRadius: '50%', flexShrink: 0, '--IconButton-size': '32px' }}
              >
                <Settings sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* ── Card Area ────────────────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 },
            pb: 1,
            minHeight: 0
          }}
        >
          {cards.length === 0 ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('cards.manage_content.empty.cards.start')}
              </Typography>
            </Box>
          ) : (
            <>
              <Card
                variant='outlined'
                onClick={() => setIsFlipped(!isFlipped)}
                sx={{
                  height: { xs: '52dvh', sm: 300 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  bgcolor: 'background.surface',
                  transition: 'border-color 0.2s',
                  borderColor: isFlipped ? 'primary.outlinedBorder' : 'divider',
                  '&:hover': { borderColor: 'primary.outlinedBorder' },
                  overflow: 'hidden'
                }}
              >
                {/* Card content only — no UI controls inside the card boundary */}
                <CardContent sx={{ textAlign: 'center', width: '100%', p: { xs: 2.5, sm: 3 } }}>
                  {currentCard.card_type === 'visual' ? (
                    isFlipped ? (
                      <Box>
                        <Typography level='title-sm' sx={{ mb: 1.5, color: 'text.secondary' }}>
                          {t('cards.preview.description', { defaultValue: 'Description' })}
                        </Typography>
                        <Typography level='body-md'>{currentCard.content || t('cards.manage_content.noContent')}</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography level='title-md' sx={{ mb: 2 }}>
                          {currentCard.title}
                        </Typography>
                        {svgContent ? (
                          <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ maxWidth: '100%', overflow: 'auto' }} />
                        ) : (
                          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                            {t('common.loading')}
                          </Typography>
                        )}
                      </Box>
                    )
                  ) : (
                    <Typography
                      level='h4'
                      sx={{
                        color: isFlipped ? 'primary.plainColor' : 'text.primary',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}
                    >
                      {isFlipped
                        ? currentCard.answer || currentCard.content || t('cards.manage_content.noContent')
                        : currentCard.question || currentCard.title || t('cards.manage_content.untitled')}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Subtle flip hint — text only, no buttons, below card */}
              <Stack direction='row' alignItems='center' justifyContent='center' spacing={0.5} sx={{ pt: 1.5, opacity: 0.4 }}>
                <Flip sx={{ fontSize: 13 }} />
                <Typography level='body-xs'>
                  {isFlipped ? t('common.back') : 'Front'} · {isMobileHint ? t('cards.session.hints.tapFlip') : 'Click to flip'}
                </Typography>
              </Stack>

              {/* Voice settings panel — uses settingsOnly mode (no floating play button) */}
              {showVoiceSettings && (
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 'md',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.level1'
                  }}
                >
                  <TTSControls
                    settingsOnly
                    voiceSettings={isFlipped ? voiceSettings.back : voiceSettings.front}
                    onVoiceSettingsChange={handleVoiceSettingsChange}
                    text={cardText}
                  />
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0
          }}
        >
          <Button
            variant='plain'
            color='neutral'
            startDecorator={<ArrowBack sx={{ fontSize: 18 }} />}
            onClick={handlePrev}
            disabled={currentIndex === 0}
            sx={{ minWidth: { xs: 88, sm: 100 }, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
          >
            {t('common.back')}
          </Button>

          {/* Progress dots — max 7 visible, then fraction */}
          {cards.length <= 7 ? (
            <Stack direction='row' spacing='4px' alignItems='center'>
              {cards.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => {
                    setCurrentIndex(i)
                    setIsFlipped(false)
                  }}
                  sx={{
                    width: i === currentIndex ? 16 : 6,
                    height: 6,
                    borderRadius: '3px',
                    bgcolor: i === currentIndex ? 'primary.solidBg' : 'background.level3',
                    transition: 'width 0.2s, background-color 0.2s',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
              ))}
            </Stack>
          ) : (
            <Typography level='body-sm' fontWeight={600} sx={{ color: 'text.secondary' }}>
              {currentIndex + 1} / {cards.length}
            </Typography>
          )}

          <Button
            variant='plain'
            color='primary'
            endDecorator={<ArrowForward sx={{ fontSize: 18 }} />}
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            sx={{ minWidth: { xs: 88, sm: 100 }, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
          >
            {t('cards.setup.next', { defaultValue: 'Next' })}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
