import React, { useState, useEffect } from 'react'
import {
  Box,
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Button,
  Card,
  CardContent,
  CardOverflow,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Chip,
  Alert,
  Skeleton,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  IconButton,
  Checkbox
} from '@mui/joy'
import { BookOpen, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cardsService } from '../../api/services'
import { useSaveToDeck } from '../../hooks/useSaveToDeck'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import SaveToDeckStep from './SaveToDeck/SaveToDeckStep'
// UpgradePrompt is rendered centrally in SubscriptionProvider — no local import needed

// Mirror of the backend wire-contract sampleText cap (used only for user-facing copy)
const MAX_INPUT_CHARS = 20000

// Fixed count options offered in the regenerate menu (besides 'auto')
const REGENERATE_COUNT_OPTIONS = [3, 5, 10, 20]

export default function GeneratedCards({
  cards = [],
  book,
  onCancel,
  onGenerateAgain,
  onGenerateMore,
  isStreaming = false,
  streamError = null,
  expectedTotal = 0,
  onRetry,
  generationMeta = null,
  inputWasTruncated = false
}) {
  const { t } = useTranslation()
  const { tier, flashcardLimit, flashcardCount } = useSubscription()
  const { upgradeDismissed, dismissUpgrade, isUpgradeModalOpen, openUpgradeModal, closeUpgradeModal } = useSubscriptionContext()

  const [step, setStep] = useState('select_cards') // 'select_cards' | 'select_deck'
  const [selectedCards, setSelectedCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // WR-03: error state for save failures
  const [saveError, setSaveError] = useState(null)
  // Partial save at plan limit: { saved, total } | null — modal stays open
  const [partialSave, setPartialSave] = useState(null)
  // Dismissal for the input-clip disclosure; reset when a new stream starts
  const [inputClipDismissed, setInputClipDismissed] = useState(false)

  const saveToDeck = useSaveToDeck('flashcard')

  useEffect(() => {
    if (isStreaming) setInputClipDismissed(false)
  }, [isStreaming])

  const toggleCardSelection = (index) => {
    setSelectedCards((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleToggleSelectAll = () => {
    setSelectedCards(selectedCards.length === cards.length ? [] : cards.map((_, i) => i))
  }

  // Map terminal SSE error codes to i18n messages — raw backend messages are never shown
  const streamErrorMessage = (code) => {
    switch (code) {
      case 'AI_QUOTA_EXHAUSTED':
        return t('aiMagic.errors.quota')
      case 'AI_MALFORMED_OUTPUT':
        return t('aiMagic.errors.malformed')
      case 'AI_PIPELINE_FAILED':
        return t('aiMagic.errors.pipeline')
      case 'STREAM_TIMEOUT':
        return t('aiMagic.errors.timeout')
      case 'STREAM_STALLED':
        return t('aiMagic.errors.stalled')
      default:
        // Any HTTP_* code or unknown code falls back to the generic message
        return t('aiMagic.errors.generic')
    }
  }

  // Empty terminal state: stream finished without errors and produced zero cards
  const isStreamEmpty = !isStreaming && !streamError && cards.length === 0

  // countMode: 'auto' or a fixed integer picked from the regenerate menu
  const handleGenerateAgain = async (countMode) => {
    try {
      setLoading(true)
      await onGenerateAgain?.(countMode)
      setStep('select_cards')
      setSelectedCards([])
      setPartialSave(null)
    } finally {
      setLoading(false)
    }
  }

  // "Generate more": parent re-runs the stream excluding current card titles
  const handleGenerateMore = () => {
    setStep('select_cards')
    setSelectedCards([])
    setPartialSave(null)
    onGenerateMore?.()
  }

  const handleProceedToDeck = () => {
    setStep('select_deck')
  }

  // WR-03: surface save errors to the user via saveError state.
  // Sequential inserts (not Promise.all) so a mid-sequence plan-limit 403
  // stops cleanly with an accurate saved count — modal stays open,
  // selections preserved, backend remains the authority on the limit.
  const handleSaveCards = async () => {
    const { selectedDeckId, allTags } = saveToDeck
    if (!selectedDeckId) return
    setSaveError(null)
    setPartialSave(null)
    setSaving(true)
    const cardsToSave = selectedCards.map((index) => cards[index])
    let saved = 0
    try {
      for (const card of cardsToSave) {
        try {
          await cardsService.create({
            title: card.title,
            content: card.content,
            deck_id: selectedDeckId,
            tags: allTags
          })
          saved += 1
        } catch (error) {
          if (error?.response?.status === 403) {
            setPartialSave({ saved, total: cardsToSave.length })
            return
          }
          throw error
        }
      }
      onCancel() // Close modal on full success
    } catch (error) {
      console.error('Error saving cards:', error)
      setSaveError(t('cards.generatedCards.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // Plan-limit disclosure: only when the limit is known client-side.
  // Non-finite limit → no chip; the backend 403 remains the authority.
  const remainingPlanCards = Number.isFinite(flashcardLimit) ? Math.max(flashcardLimit - flashcardCount, 0) : null
  const showPlanRemaining = remainingPlanCards !== null && selectedCards.length > remainingPlanCards

  return (
    <Modal open onClose={onCancel}>
      <ModalDialog
        size='lg'
        layout='center'
        sx={{
          borderRadius: 'xl',
          boxShadow: 'lg',
          maxHeight: '85vh',
          minWidth: 600,
          p: 0, // Remove default padding to control layout manually
          overflow: 'hidden', // Prevent dialog itself from scrolling
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ModalClose sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} />

        {/* Fixed Header */}
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ pr: 6 }}>
            {/* WR-04: replace hardcoded strings with t() keys */}
            <Typography level='h4' sx={{ fontWeight: 'bold' }}>
              {step === 'select_cards' ? t('cards.generatedCards.titleSelectCards') : t('cards.generatedCards.titleAddToDeck')}
            </Typography>
            <Typography level='body-sm'>
              {step === 'select_cards' ? t('cards.generatedCards.subtitleSelectCards') : t('cards.generatedCards.subtitleAddToDeck')}
            </Typography>
          </Box>
        </Box>

        {/* Scrollable Content Area */}
        <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
          {step === 'select_cards' && (
            <>
              {/* Regenerate menu — Auto (adaptive) or a fixed count */}
              <Dropdown>
                <Tooltip title={t('cards.generatedCards.generateAgainTooltip')} variant='soft' size='sm'>
                  <MenuButton
                    size='sm'
                    variant='outlined'
                    color='neutral'
                    disabled={loading}
                    aria-label={t('cards.generatedCards.regenerate.menuAria')}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 48,
                      minWidth: 36,
                      p: 0.8,
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 }
                    }}
                  >
                    {loading ? <CircularProgress size='sm' /> : <RefreshCw size={18} />}
                  </MenuButton>
                </Tooltip>
                <Menu size='sm' placement='bottom-end'>
                  <MenuItem onClick={() => handleGenerateAgain('auto')}>{t('cards.generatedCards.regenerate.auto')}</MenuItem>
                  {REGENERATE_COUNT_OPTIONS.map((count) => (
                    <MenuItem key={count} onClick={() => handleGenerateAgain(count)}>
                      {t('cards.generatedCards.regenerate.fixed', { count })}
                    </MenuItem>
                  ))}
                </Menu>
              </Dropdown>

              {/* Select All control — never disabled during streaming; user can select what's arrived so far */}
              <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 2 }}>
                <Checkbox
                  size='sm'
                  checked={selectedCards.length === cards.length && cards.length > 0}
                  indeterminate={selectedCards.length > 0 && selectedCards.length < cards.length}
                  onChange={handleToggleSelectAll}
                  disabled={cards.length === 0}
                  label={t('cards.generatedCards.selectAll')}
                  slotProps={{ input: { 'aria-label': t('cards.generatedCards.selectAllAria') } }}
                />
                {selectedCards.length > 0 && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('cards.generatedCards.selectedCount', { count: selectedCards.length, total: cards.length })}
                  </Typography>
                )}
              </Stack>

              {/* Streaming progress row — indeterminate copy until the total is known (auto mode) */}
              {isStreaming && (
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                  <CircularProgress size='sm' />
                  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                    {cards.length === 0
                      ? t('aiMagic.streaming.generating')
                      : expectedTotal == null
                        ? t('aiMagic.streaming.progressAuto', { count: cards.length })
                        : t('aiMagic.streaming.progress', { count: cards.length, total: expectedTotal })}
                  </Typography>
                </Stack>
              )}

              {/* Input-clip disclosure — selection exceeded the wire limit and was clipped */}
              {inputWasTruncated && !inputClipDismissed && (
                <Alert
                  color='warning'
                  variant='soft'
                  size='sm'
                  sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
                  endDecorator={
                    <IconButton
                      size='sm'
                      variant='soft'
                      color='warning'
                      onClick={() => setInputClipDismissed(true)}
                      aria-label={t('common.close')}
                      sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 } }}
                    >
                      <X size={14} />
                    </IconButton>
                  }
                >
                  {t('aiMagic.streaming.inputTruncated', { max: MAX_INPUT_CHARS })}
                </Alert>
              )}

              {/* Truncation disclosure — the adaptive cap held back additional cards */}
              {!isStreaming && !streamError && generationMeta?.truncated && cards.length > 0 && (
                <Alert
                  color='neutral'
                  variant='soft'
                  size='sm'
                  sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
                  endDecorator={
                    <Button
                      size='sm'
                      variant='soft'
                      color='neutral'
                      onClick={handleGenerateMore}
                      aria-label={t('aiMagic.streaming.generateMoreAria')}
                      sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 } }}
                    >
                      {t('aiMagic.streaming.generateMore')}
                    </Button>
                  }
                >
                  {t('aiMagic.streaming.cappedNotice', { count: cards.length })}
                </Alert>
              )}

              {/* Empty terminal state: done with zero cards */}
              {isStreamEmpty ? (
                <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
                  <Typography level='title-md'>{t('aiMagic.streaming.emptyTitle')}</Typography>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('aiMagic.streaming.emptyBody')}
                  </Typography>
                  {onRetry && (
                    <Button
                      variant='soft'
                      color='neutral'
                      size='sm'
                      onClick={onRetry}
                      aria-label={t('aiMagic.streaming.retryAria')}
                      sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 } }}
                    >
                      {t('aiMagic.streaming.retry')}
                    </Button>
                  )}
                </Stack>
              ) : (
                <Stack direction='row' flexWrap='wrap' gap={2} justifyContent='center' sx={{ minHeight: 200 }}>
                  {cards.map((card, index) => {
                    const isSelected = selectedCards.includes(index)
                    return (
                      <Card
                        key={index}
                        onClick={() => toggleCardSelection(index)}
                        variant='outlined'
                        sx={{
                          width: 260,
                          minHeight: 180,
                          display: 'flex',
                          bgcolor: isSelected ? 'primary.softBg' : 'background.body',
                          borderColor: isSelected ? 'primary.solidBg' : 'neutral.outlinedBorder',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' },
                          // Fade-in for incrementally streamed cards
                          '@keyframes gcCardIn': {
                            from: { opacity: 0, transform: 'translateY(4px)' },
                            to: { opacity: 1, transform: 'translateY(0)' }
                          },
                          '@keyframes gcCardInFade': {
                            from: { opacity: 0 },
                            to: { opacity: 1 }
                          },
                          animation: 'gcCardIn 200ms ease-out',
                          '@media (prefers-reduced-motion: reduce)': {
                            // No transform for reduced-motion users — opacity only
                            animation: 'gcCardInFade 200ms ease-out'
                          }
                        }}
                      >
                        <CardOverflow sx={{ px: 2, pt: 2 }}>
                          <Typography level='title-md' startDecorator={<BookOpen size={16} />}>
                            {card.title}
                          </Typography>
                        </CardOverflow>
                        <Divider />
                        <CardContent>
                          <Typography level='body-sm' color='neutral'>
                            {card.content}
                          </Typography>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* ONE skeleton card for the next incoming card while streaming */}
                  {isStreaming && (
                    <Card variant='outlined' sx={{ width: 260, minHeight: 180, display: 'flex' }} aria-hidden='true'>
                      <CardOverflow sx={{ px: 2, pt: 2 }}>
                        <Skeleton variant='text' level='title-md' width='60%' />
                      </CardOverflow>
                      <Divider />
                      <CardContent>
                        <Skeleton variant='text' level='body-md' width='100%' />
                        <Skeleton variant='text' level='body-md' width='80%' />
                      </CardContent>
                    </Card>
                  )}

                  {/* Terminal error — replaces the skeleton; received cards stay selectable */}
                  {!isStreaming && streamError && (
                    <Alert
                      color='danger'
                      variant='soft'
                      size='sm'
                      sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
                      endDecorator={
                        onRetry && (
                          <Button
                            size='sm'
                            variant='soft'
                            color='danger'
                            onClick={onRetry}
                            aria-label={t('aiMagic.streaming.retryAria')}
                            sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 } }}
                          >
                            {t('aiMagic.streaming.retry')}
                          </Button>
                        )
                      }
                    >
                      {streamErrorMessage(streamError.code)}
                    </Alert>
                  )}
                </Stack>
              )}

              {/* ── Free tier: model badge ─────────────────────────────────── */}
              {tier === 'free' && (
                <Chip size='sm' color='neutral' variant='soft' sx={{ mt: 1.5 }} aria-label={t('upgrade.modelBadge')}>
                  {t('upgrade.modelBadge')}
                </Chip>
              )}

              {/* ── Free tier: dismissible inline upgrade CTA ─────────────── */}
              {!upgradeDismissed && tier === 'free' && (
                <Box
                  sx={{
                    p: 2,
                    mt: 2,
                    borderRadius: 'md',
                    bgcolor: 'background.level1',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack direction='row' spacing={1} justifyContent='space-between' alignItems='center'>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {t('upgrade.inlineCtaText')}
                    </Typography>
                    <Stack direction='row' spacing={1} sx={{ flexShrink: 0 }}>
                      <Button size='sm' variant='plain' onClick={dismissUpgrade} aria-label={t('upgrade.inlineCtaDismiss')}>
                        {t('upgrade.inlineCtaDismiss')}
                      </Button>
                      <Button size='sm' variant='solid' color='primary' onClick={openUpgradeModal} aria-label={t('upgrade.modal.cta')}>
                        {t('upgrade.modal.cta')}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              )}

              {/* UpgradePrompt is rendered centrally in SubscriptionProvider */}
            </>
          )}

          {step === 'select_deck' && (
            <SaveToDeckStep deckType='flashcard' saveToDeck={saveToDeck} createDeckDescriptionDefault={book?.title} />
          )}
        </Box>

        {/* Fixed Footer */}
        <Box sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.surface' }}>
          {/* WR-03: render save error alert above footer actions */}
          {saveError && (
            <Alert color='danger' variant='soft' sx={{ mb: 1.5 }}>
              {saveError}
            </Alert>
          )}
          {/* Partial save at plan limit — modal stays open, selections preserved */}
          {partialSave && (
            <Alert
              color='warning'
              variant='soft'
              sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}
              endDecorator={
                <Button
                  size='sm'
                  variant='solid'
                  color='primary'
                  onClick={openUpgradeModal}
                  aria-label={t('upgrade.modal.cta')}
                  sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: 2 } }}
                >
                  {t('upgrade.modal.cta')}
                </Button>
              }
            >
              {t('cards.generatedCards.partialSave', { saved: partialSave.saved, total: partialSave.total })}
            </Alert>
          )}
          <Stack direction='row' justifyContent='flex-end' alignItems='center' spacing={1}>
            {/* Plan-limit heads-up — informational only; Proceed stays enabled (backend 403 is authority) */}
            {step === 'select_cards' && showPlanRemaining && (
              <Chip color='warning' variant='soft' size='sm' sx={{ mr: 'auto' }}>
                {t('cards.generatedCards.planRemaining', { count: remainingPlanCards })}
              </Chip>
            )}
            <Button variant='soft' color='neutral' onClick={onCancel}>
              {t('cards.generatedCards.cancelButton')}
            </Button>
            {step === 'select_cards' ? (
              <Button variant='solid' color='primary' onClick={handleProceedToDeck} disabled={selectedCards.length === 0 || isStreaming}>
                {t('cards.generatedCards.proceedCount', { count: selectedCards.length })}
              </Button>
            ) : (
              <Button variant='solid' color='success' onClick={handleSaveCards} loading={saving} disabled={!saveToDeck.selectedDeckId}>
                {t('cards.generatedCards.confirmSave')}
              </Button>
            )}
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
