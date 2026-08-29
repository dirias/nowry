import React, { useCallback, useState, useEffect } from 'react'
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
  IconButton
} from '@mui/joy'
import { RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cardsService } from '../../api/services'
import { focusRing } from '../Common/Form/formStyles'
import useCardCuration from '../../hooks/useCardCuration'
import { useSaveToDeck } from '../../hooks/useSaveToDeck'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import GeneratedCard from './GeneratedCard'
import SaveToDeckStep from './SaveToDeck/SaveToDeckStep'
// UpgradePrompt is rendered centrally in SubscriptionProvider — no local import needed

// Mirror of the backend wire-contract sampleText cap (used only for user-facing copy)
const MAX_INPUT_CHARS = 20000

// Fixed count options offered in the regenerate menu (besides 'auto')
const REGENERATE_COUNT_OPTIONS = [3, 5, 10, 20]

/**
 * @param {object}   props
 * @param {Array}    props.cards               Generated cards, `{title, content}`.
 * @param {object}   [props.book]              Source book, when the cards came from one.
 * @param {string}   [props.newDeckNameDefault] Pre-fill for the inline create-deck name.
 *   Defaults to the book's title, which is where every pre-existing caller got it.
 * @param {Function} [props.onSaved]           Called with the number of cards actually
 *   written, once a save attempt has persisted at least one. Distinct from `onCancel`,
 *   which fires for a dismissal *and* after a full save — a caller that needs to know
 *   whether anything reached the library cannot tell those two apart otherwise.
 */
export default function GeneratedCards({
  cards = [],
  book,
  newDeckNameDefault,
  onCancel,
  onSaved,
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
  // Which card is open in the in-place editor, and which half the caret landed
  // in. UI state, not curation state: the text itself lives in `curation`.
  const [editing, setEditing] = useState(null) // { id, field } | null
  // Where focus should land after a curation action unmounts the control that
  // triggered it: { id, control: 'edit' | 'undo' } | null.
  const [focusRequest, setFocusRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // WR-03: error state for save failures
  const [saveError, setSaveError] = useState(null)
  // Partial save at plan limit: { saved, total } | null — modal stays open
  const [partialSave, setPartialSave] = useState(null)
  // Dismissal for the input-clip disclosure; reset when a new stream starts
  const [inputClipDismissed, setInputClipDismissed] = useState(false)

  const saveToDeck = useSaveToDeck('flashcard')

  // CURATE-001: cards arrive kept, and curation is keyed by card rather than by
  // array position, so a card streaming in cannot move anybody else's state.
  const curation = useCardCuration(cards)

  useEffect(() => {
    if (isStreaming) setInputClipDismissed(false)
  }, [isStreaming])

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
      setEditing(null)
      // Curation resets itself: the replacement batch is not an append of the
      // old one, so `useCardCuration` rebuilds its entries from scratch.
      setPartialSave(null)
    } finally {
      setLoading(false)
    }
  }

  // "Generate more": parent re-runs the stream excluding current card titles and
  // appends the result, so curation of the cards already on screen is left alone.
  const handleGenerateMore = () => {
    setStep('select_cards')
    setPartialSave(null)
    onGenerateMore?.()
  }

  const handleProceedToDeck = () => {
    setStep('select_deck')
  }

  const clearFocusRequest = useCallback(() => setFocusRequest(null), [])

  const closeEditor = (id) => {
    setEditing(null)
    setFocusRequest({ id, control: 'edit' })
  }

  /**
   * Commit this card and open the next kept one, so a batch can be worked
   * through end to end without reaching for the pointer. The last card has
   * nowhere to go, so it simply closes.
   */
  const editNextAfter = (id) => {
    const kept = curation.keptEntries
    const next = kept[kept.findIndex((entry) => entry.id === id) + 1]
    if (!next) return closeEditor(id)
    setEditing({ id: next.id, field: 'title' })
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
    // The entry's working text, not the incoming prop — from CURATE-003 onward
    // these differ whenever the user has edited a card.
    const cardsToSave = curation.keptEntries
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
            // Some cards did reach the library. A caller told nothing happened
            // would then contradict what the user can see in their decks.
            if (saved > 0) onSaved?.(saved)
            return
          }
          throw error
        }
      }
      onSaved?.(saved)
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
  const showPlanRemaining = remainingPlanCards !== null && curation.keptCount > remainingPlanCards

  return (
    <Modal open onClose={onCancel}>
      <ModalDialog
        size='lg'
        layout='center'
        sx={{
          borderRadius: 'xl',
          boxShadow: 'lg',
          maxHeight: '85vh',
          // `minWidth` beats `maxWidth` in CSS, so a flat 600 forced a 375px
          // viewport to scroll sideways. Onboarding's AI fallback is the first
          // caller that is mobile-first, and every other caller gains from it.
          width: { xs: 'calc(100% - 2rem)', sm: 'auto' },
          minWidth: { xs: 0, sm: 600 },
          p: 0, // Remove default padding to control layout manually
          overflow: 'hidden', // Prevent dialog itself from scrolling
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Joy's ModalClose ships no accessible name of its own, so a screen
            reader announced this as bare "button". Pre-existing; fixed here
            because CURATE-005 owns the naming pass over this dialog. */}
        <ModalClose aria-label={t('common.close')} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} />

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

              {/* Kept count and the bulk control — never disabled during streaming, so
                  what has already arrived stays curatable while the rest lands. */}
              <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
                <Typography level='body-sm' sx={{ fontWeight: 'md' }}>
                  {t('cards.generatedCards.keptCount', { count: curation.keptCount })}
                </Typography>
                {curation.discardedCount > 0 && (
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('cards.generatedCards.discardedCount', { count: curation.discardedCount })}
                  </Typography>
                )}
                {/* One control in two directions: a separate "restore all" would sit
                    disabled almost permanently. */}
                <Button
                  size='sm'
                  variant='plain'
                  color='primary'
                  onClick={curation.toggleAllKept}
                  disabled={curation.entries.length === 0}
                  sx={{ ml: 'auto', ...focusRing }}
                >
                  {t(curation.keptCount === 0 ? 'cards.generatedCards.restoreAll' : 'cards.generatedCards.discardAll')}
                </Button>
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
                // A grid rather than a wrapping row: a discarded card collapses to a
                // short strip, and under `flexWrap` with stretched items that strip
                // would be forced to the full height of its row. `alignItems: start`
                // is what lets it actually be short while keeping its slot.
                <Box
                  role='group'
                  aria-label={t('cards.generatedCards.gridAria')}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(238px, 1fr))',
                    gap: 2,
                    alignItems: 'start',
                    minHeight: 200
                  }}
                >
                  {curation.entries.map((entry) => (
                    <GeneratedCard
                      key={entry.id}
                      entry={entry}
                      isEditing={editing?.id === entry.id}
                      editingField={editing?.field}
                      onEdit={(field) => setEditing({ id: entry.id, field })}
                      onChangeField={(field, value) => curation.setField(entry.id, field, value)}
                      onDoneEditing={() => closeEditor(entry.id)}
                      onDoneEditingNext={() => editNextAfter(entry.id)}
                      onCancelEditing={(openedWith) => {
                        curation.setFields(entry.id, openedWith)
                        closeEditor(entry.id)
                      }}
                      onDiscard={() => {
                        curation.setKept(entry.id, false)
                        setEditing(null)
                        setFocusRequest({ id: entry.id, control: 'undo' })
                      }}
                      onRestore={() => {
                        curation.setKept(entry.id, true)
                        setFocusRequest({ id: entry.id, control: 'edit' })
                      }}
                      onRevert={() => curation.revert(entry.id)}
                      focusRequest={focusRequest?.id === entry.id ? focusRequest.control : null}
                      onFocusApplied={clearFocusRequest}
                    />
                  ))}

                  {/* ONE skeleton card for the next incoming card while streaming */}
                  {isStreaming && (
                    <Card variant='outlined' sx={{ minHeight: 180, display: 'flex' }} aria-hidden='true'>
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
                      sx={{ gridColumn: '1 / -1', justifyContent: 'space-between', alignItems: 'center' }}
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
                </Box>
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
            <SaveToDeckStep deckType='flashcard' saveToDeck={saveToDeck} createDeckDescriptionDefault={newDeckNameDefault ?? book?.title} />
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
              <Button variant='solid' color='primary' onClick={handleProceedToDeck} disabled={curation.keptCount === 0 || isStreaming}>
                {t('cards.generatedCards.continueCount', { count: curation.keptCount })}
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
