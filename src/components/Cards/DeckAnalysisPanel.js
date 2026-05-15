import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/joy/Box'
import Stack from '@mui/joy/Stack'
import Typography from '@mui/joy/Typography'
import Button from '@mui/joy/Button'
import Card from '@mui/joy/Card'
import Alert from '@mui/joy/Alert'
import Divider from '@mui/joy/Divider'
import CircularProgress from '@mui/joy/CircularProgress'
import Snackbar from '@mui/joy/Snackbar'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { cardsService } from '../../api/services'
import { apiClient } from '../../api/client'
import { ENDPOINTS } from '../../api/utils/endpoints'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

export default function DeckAnalysisPanel({ deckId, onClose }) {
  const { t } = useTranslation()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [acceptError, setAcceptError] = useState(null)

  // Local copies of suggestion lists for optimistic UI updates
  const [duplicates, setDuplicates] = useState([])
  const [gaps, setGaps] = useState([])
  const [rewrites, setRewrites] = useState([])

  useEffect(() => {
    if (analysis) {
      setDuplicates(analysis.duplicates || [])
      setGaps(analysis.gaps || [])
      setRewrites(analysis.rewrite_suggestions || [])
    }
  }, [analysis])

  useEffect(() => {
    if (!deckId) return
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await cardsService.analyzeDeck(deckId)
        setAnalysis(result)
      } catch (err) {
        const status = err.response?.status
        if (status === 403) {
          openUpgradeModal(t('upgrade.headlines.analyzeDeck'))
          if (onClose) onClose()
        } else {
          setError(err.response?.data?.detail || t('aiMagic.analyzeDeck.error'))
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (suggestion) => {
    // Optimistic: remove from list immediately
    setRewrites((prev) => prev.filter((s) => s.card_id !== suggestion.card_id))
    try {
      await apiClient.patch(ENDPOINTS.studyCards.update(suggestion.card_id), {
        title: suggestion.suggested_front,
        content: suggestion.suggested_back,
      })
    } catch (err) {
      // Rollback on failure: add back to the list
      setRewrites((prev) => [...prev, suggestion])
      setAcceptError(err.response?.data?.detail || t('aiMagic.analyzeDeck.actions.acceptError'))
    }
  }

  const handleSkip = (cardId) => {
    setRewrites((prev) => prev.filter((s) => s.card_id !== cardId))
  }

  const handleSkipDuplicate = (cardAId) => {
    setDuplicates((prev) => prev.filter((d) => d.card_a_id !== cardAId))
  }

  const handleSkipGap = (topic) => {
    setGaps((prev) => prev.filter((g) => g.topic !== topic))
  }

  const isEmpty = analysis && !duplicates.length && !gaps.length && !rewrites.length

  // Loading state
  if (loading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }} spacing={2}>
        <CircularProgress size='md' />
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('aiMagic.analyzeDeck.loading')}
        </Typography>
      </Stack>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color='danger' variant='soft'>{error}</Alert>
      </Box>
    )
  }

  // Empty state
  if (isEmpty) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />
        <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
          {t('aiMagic.analyzeDeck.emptyResult')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          {t('aiMagic.analyzeDeck.emptyResultBody')}
        </Typography>
      </Box>
    )
  }

  // Success state — null check before render (initial state before API call resolves)
  if (!analysis) return null

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, bgcolor: 'background.surface' }}>
      <Stack spacing={3}>

        {/* Duplicates section */}
        {duplicates.length > 0 && (
          <Box>
            <Typography level='title-lg' fontWeight={600} sx={{ color: 'text.primary', mb: 1 }}>
              {t('aiMagic.analyzeDeck.sections.duplicates')} ({duplicates.length})
            </Typography>
            <Stack spacing={1}>
              {duplicates.map((dup) => (
                <Card
                  key={`${dup.card_a_id}-${dup.card_b_id}`}
                  variant='outlined'
                  sx={{
                    p: 2,
                    bgcolor: 'background.surface',
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'neutral.outlinedBorder' }
                  }}
                >
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Typography level='title-sm'>{dup.reason}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {t('aiMagic.analyzeDeck.sections.duplicates')}: {dup.card_a_id} &amp; {dup.card_b_id}
                      </Typography>
                    </Box>
                    <Button
                      size='sm'
                      variant='plain'
                      color='neutral'
                      onClick={() => handleSkipDuplicate(dup.card_a_id)}
                      aria-label={t('aiMagic.analyzeDeck.actions.skip')}
                    >
                      {t('aiMagic.analyzeDeck.actions.skip')}
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {duplicates.length > 0 && gaps.length > 0 && <Divider sx={{ my: 1 }} />}

        {/* Topic Gaps section */}
        {gaps.length > 0 && (
          <Box>
            <Typography level='title-lg' fontWeight={600} sx={{ color: 'text.primary', mb: 1 }}>
              {t('aiMagic.analyzeDeck.sections.gaps')} ({gaps.length})
            </Typography>
            <Stack spacing={1}>
              {gaps.map((gap) => (
                <Card
                  key={gap.topic}
                  variant='outlined'
                  sx={{
                    p: 2,
                    bgcolor: 'background.surface',
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'neutral.outlinedBorder' }
                  }}
                >
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Typography level='title-sm'>{gap.topic}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>{gap.description}</Typography>
                    </Box>
                    <Button
                      size='sm'
                      variant='plain'
                      color='neutral'
                      onClick={() => handleSkipGap(gap.topic)}
                      aria-label={t('aiMagic.analyzeDeck.actions.skip')}
                    >
                      {t('aiMagic.analyzeDeck.actions.skip')}
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {(duplicates.length > 0 || gaps.length > 0) && rewrites.length > 0 && <Divider sx={{ my: 1 }} />}

        {/* Rewrite Suggestions section */}
        {rewrites.length > 0 && (
          <Box>
            <Typography level='title-lg' fontWeight={600} sx={{ color: 'text.primary', mb: 1 }}>
              {t('aiMagic.analyzeDeck.sections.rewrites')} ({rewrites.length})
            </Typography>
            <Stack spacing={1}>
              {rewrites.map((sug) => (
                <Card
                  key={sug.card_id}
                  variant='outlined'
                  sx={{
                    p: 2,
                    bgcolor: 'background.surface',
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'neutral.outlinedBorder' }
                  }}
                >
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Typography level='title-sm'>{sug.suggested_front}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>{sug.suggested_back}</Typography>
                      <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5, fontStyle: 'italic' }}>{sug.reason}</Typography>
                    </Box>
                    <Stack direction='row' spacing={1} sx={{ flexShrink: 0 }}>
                      <Button
                        size='sm'
                        variant='soft'
                        color='primary'
                        onClick={() => handleAccept(sug)}
                        aria-label={t('aiMagic.analyzeDeck.actions.accept')}
                      >
                        {t('aiMagic.analyzeDeck.actions.accept')}
                      </Button>
                      <Button
                        size='sm'
                        variant='plain'
                        color='neutral'
                        onClick={() => handleSkip(sug.card_id)}
                        aria-label={t('aiMagic.analyzeDeck.actions.skip')}
                      >
                        {t('aiMagic.analyzeDeck.actions.skip')}
                      </Button>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

      </Stack>

      {/* Accept error snackbar */}
      <Snackbar
        open={!!acceptError}
        autoHideDuration={4000}
        onClose={() => setAcceptError(null)}
        color='danger'
        variant='soft'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert color='danger' variant='soft'>{acceptError}</Alert>
      </Snackbar>
    </Box>
  )
}
