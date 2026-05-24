import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  CircularProgress,
  Select,
  Option,
  Snackbar
} from '@mui/joy'
import { Clock, BookOpen } from 'lucide-react'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import { useTranslation } from 'react-i18next'
import { ttsService } from '../../api/services/tts.ai.service'
import { $getRoot } from 'lexical'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

/**
 * ContentNavigator - Minimalistic left sidebar TOC
 *
 * Design: Futuristic, clean, no noise
 * Following DESIGN_GUIDELINES.md
 */

export default function ContentNavigator({
  toc = [],
  readingTime = 0,
  editorInstanceRef,
  bookId,
  tier
}) {
  const { t } = useTranslation()
  const { openUpgradeModal } = useSubscriptionContext()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState(null)

  // TTS state
  const [playingId, setPlayingId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [ttsLanguage, setTtsLanguage] = useState('en-US')
  const [ttsError, setTtsError] = useState(null)
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // Track scroll progress
  useEffect(() => {
    const scrollContainer = document.querySelector('.editor-scroll-container')
    if (!scrollContainer) {
      console.warn('Scroll container not found')
      return
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight
      const maxScroll = scrollHeight - clientHeight
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))

      // Detect current section based on scroll position
      if (toc.length > 0) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const visibleHeadings = toc.filter((heading) => {
          const headings = document.querySelectorAll('.editor-content h1, .editor-content h2, .editor-content h3')
          for (const h of headings) {
            if (h.textContent.trim() === heading.text.trim()) {
              const rect = h.getBoundingClientRect()
              return rect.top >= containerRect.top && rect.top <= containerRect.top + 300
            }
          }
          return false
        })

        if (visibleHeadings.length > 0) {
          setCurrentSection(visibleHeadings[0].id)
        }
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [toc])

  const scrollToHeading = (headingId) => {
    const scrollContainer = document.querySelector('.editor-scroll-container')
    if (!scrollContainer) {
      console.warn('Scroll container not found')
      return
    }

    const heading = toc.find((h) => h.id === headingId)
    if (!heading) {
      console.warn('Heading not found in TOC:', headingId)
      return
    }

    const allHeadings = document.querySelectorAll('.editor-content h1, .editor-content h2, .editor-content h3')
    let targetElement = null

    for (const h of allHeadings) {
      if (h.textContent.trim() === heading.text.trim()) {
        targetElement = h
        break
      }
    }

    if (targetElement) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const elementRect = targetElement.getBoundingClientRect()
      const scrollTop = scrollContainer.scrollTop
      const offset = 100

      const targetScrollTop = scrollTop + (elementRect.top - containerRect.top) - offset

      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    } else {
      console.warn('Could not find heading element:', heading.text)
    }
  }

  // Extract title + all body content under a heading (until the next heading)
  const extractSectionContent = useCallback((headingId) => {
    const editor = editorInstanceRef?.current
    if (!editor) return ''
    let content = ''
    let capturing = false
    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      for (const node of children) {
        const key = node.getKey()
        const isHeading = node.getType() === 'heading'
        if (key === headingId) {
          capturing = true
          content += node.getTextContent() + '\n'
          continue
        }
        if (capturing) {
          if (isHeading) break
          content += node.getTextContent() + '\n'
        }
      }
    })
    return content.trim()
  }, [editorInstanceRef])

  const handleAudioEnded = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPlayingId(null)
  }

  const handlePlaySection = useCallback(async (headingId) => {
    // Clicking currently playing section stops it
    if (playingId === headingId) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setPlayingId(null)
      return
    }

    // Stop any prior playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPlayingId(null)

    // Tier gate — Plus+ required
    if (!tier || tier === 'free') {
      openUpgradeModal(t('upgrade.headlines.tts'))
      return
    }

    const text = extractSectionContent(headingId)
    if (!text) return

    setLoadingId(headingId)
    try {
      const blobUrl = await ttsService.generate(bookId, text, ttsLanguage)
      blobUrlRef.current = blobUrl
      audioRef.current.src = blobUrl
      await audioRef.current.play()
      setPlayingId(headingId)
    } catch {
      setTtsError(t('aiMagic.tts.error'))
    } finally {
      setLoadingId(null)
    }
  }, [playingId, tier, bookId, ttsLanguage, extractSectionContent, openUpgradeModal, t])

  const hasTts = !!(editorInstanceRef && bookId)

  return (
    <Stack
      spacing={3}
      sx={{
        width: '100%',
        height: '100%',
        p: 3,
        overflowY: 'auto',
        overflowX: 'hidden',
        bgcolor: 'background.surface',
        '&::-webkit-scrollbar': {
          width: '4px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'divider',
          borderRadius: '8px'
        }
      }}
    >
      {/* Header - Minimal */}
      <Stack spacing={1.5}>
        <Typography level='body-xs' textTransform='uppercase' letterSpacing='0.1em' fontWeight={600} sx={{ color: 'text.tertiary' }}>
          {t('books.tableOfContents')}
        </Typography>

        {/* Reading Stats - Compact */}
        <Stack direction='row' spacing={1} alignItems='center'>
          <Chip
            size='sm'
            variant='soft'
            startDecorator={<Clock size={14} />}
            sx={{
              fontSize: 'xs',
              fontWeight: 500,
              bgcolor: 'background.level1',
              color: 'text.secondary'
            }}
          >
            {readingTime} min
          </Chip>
          <Chip
            size='sm'
            variant='soft'
            startDecorator={<BookOpen size={14} />}
            sx={{
              fontSize: 'xs',
              fontWeight: 500,
              bgcolor: 'background.level1',
              color: 'text.secondary'
            }}
          >
            {toc.length} sections
          </Chip>
        </Stack>

        {/* Progress Bar - Sleek */}
        <Box>
          <LinearProgress
            determinate
            value={scrollProgress}
            size='sm'
            sx={{
              height: 2,
              bgcolor: 'background.level2',
              '& .MuiLinearProgress-indicator': {
                bgcolor: 'primary.solidBg'
              }
            }}
          />
          <Typography
            level='body-xs'
            sx={{
              color: 'text.tertiary',
              mt: 0.5,
              fontSize: '0.7rem'
            }}
          >
            {Math.round(scrollProgress)}% read
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1 }} />

      {/* Language selector — Pro only, shown when TTS is available */}
      {hasTts && tier === 'pro' && (
        <Select
          size='sm'
          value={ttsLanguage}
          onChange={(_, v) => setTtsLanguage(v)}
          aria-label={t('aiMagic.tts.languageAriaLabel')}
          sx={{ mb: 1 }}
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

      {/* TOC List - Clean */}
      {toc.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: 'xs' }}>
            {t('books.noHeadings')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1, fontSize: '0.7rem' }}>
            {t('books.useHeadings')}
          </Typography>
        </Box>
      ) : (
        <List size='sm' sx={{ p: 0, '--List-gap': '0px' }}>
          {toc.map((heading) => {
            const isActive = currentSection === heading.id
            const isH1 = heading.level === 'h1'
            const isH3 = heading.level === 'h3'
            const isPlaying = playingId === heading.id
            const isLoading = loadingId === heading.id

            return (
              <ListItem key={heading.id} sx={{ p: 0 }}>
                <ListItemButton
                  onClick={() => scrollToHeading(heading.id)}
                  sx={{
                    pl: isH3 ? 3 : isH1 ? 1 : 2,
                    pr: hasTts ? 0.5 : undefined,
                    py: 0.75,
                    borderLeft: isActive ? '2px solid' : '2px solid transparent',
                    borderColor: isActive ? 'primary.outlinedBorder' : 'transparent',
                    bgcolor: isActive ? 'background.level1' : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'background.level1',
                      borderLeftColor: 'primary.outlinedBorder'
                    },
                    '&:hover .tts-mic-btn': { opacity: 1 }
                  }}
                >
                  <Typography
                    level={isH1 ? 'body-sm' : 'body-xs'}
                    fontWeight={isH1 ? 600 : isActive ? 500 : 400}
                    sx={{
                      color: isActive ? 'text.primary' : 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: isH1 ? '0.875rem' : isH3 ? '0.75rem' : '0.8125rem',
                      flexGrow: 1
                    }}
                  >
                    {heading.text}
                  </Typography>

                  {/* TTS mic button — only when TTS props are present */}
                  {hasTts && (
                    <IconButton
                      className='tts-mic-btn'
                      size='sm'
                      variant='plain'
                      color={isPlaying ? 'primary' : 'neutral'}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlaySection(heading.id)
                      }}
                      aria-label={t('aiMagic.tts.playSection', { title: heading.text })}
                      sx={{
                        opacity: (isLoading || isPlaying) ? 1 : 0,
                        transition: 'opacity 0.15s',
                        minWidth: 28,
                        minHeight: 28,
                        flexShrink: 0,
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.outlinedBorder',
                          outlineOffset: '2px'
                        }
                      }}
                    >
                      {isLoading
                        ? <CircularProgress size='sm' sx={{ '--CircularProgress-size': '14px' }} />
                        : isPlaying
                          ? <PauseRoundedIcon sx={{ fontSize: 14 }} />
                          : <MicRoundedIcon sx={{ fontSize: 14 }} />
                      }
                    </IconButton>
                  )}
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} onEnded={handleAudioEnded} />

      {/* Error feedback */}
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
