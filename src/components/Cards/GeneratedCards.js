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
  Select,
  Option,
  Input,
  FormControl,
  FormLabel,
  Chip,
  Alert
} from '@mui/joy'
import { BookOpen, RefreshCw, Layers, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { decksService, cardsService } from '../../api/services'
import { useDeckData } from '../../hooks/useDeckData'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
// UpgradePrompt is rendered centrally in SubscriptionProvider — no local import needed

export default function GeneratedCards({ cards = [], book, onCancel, onGenerateAgain }) {
  const { t } = useTranslation()
  const { tier } = useSubscription()
  const { upgradeDismissed, dismissUpgrade, isUpgradeModalOpen, openUpgradeModal, closeUpgradeModal } = useSubscriptionContext()

  const [step, setStep] = useState('select_cards') // 'select_cards' | 'select_deck'
  const [selectedCards, setSelectedCards] = useState([])
  const [loading, setLoading] = useState(false)
  // WR-02: separate loading state for deck creation, distinct from regenerate loading
  const [createLoading, setCreateLoading] = useState(false)

  // Deck selection state
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [saving, setSaving] = useState(false)
  // WR-03: error state for save failures
  const [saveError, setSaveError] = useState(null)

  const { decks: cacheDecks, loading: hookDecksLoading, reload: reloadDecks } = useDeckData()

  const loadDecks = React.useCallback(async () => {
    try {
      if (hookDecksLoading) return
      const data = cacheDecks || []
      // Filter Flashcard decks (explicit 'flashcard' or missing type for legacy)
      const flashcardDecks = data.filter((d) => d.deck_type === 'flashcard' || !d.deck_type)
      setDecks(flashcardDecks)
      if (flashcardDecks.length > 0) {
        setSelectedDeckId(flashcardDecks[0]._id)
      }
    } catch (error) {
      console.error('Error loading decks:', error)
    }
  }, [hookDecksLoading, cacheDecks])

  useEffect(() => {
    if (step === 'select_deck') {
      loadDecks()
    }
  }, [step, loadDecks])

  const toggleCardSelection = (index) => {
    setSelectedCards((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleGenerateAgain = async () => {
    try {
      setLoading(true)
      await onGenerateAgain?.()
      setStep('select_cards')
      setSelectedCards([])
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToDeck = () => {
    setStep('select_deck')
  }

  // WR-02: uses createLoading (not shared loading) so create and regenerate spinners are independent
  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    setCreateLoading(true)
    try {
      const newDeck = await decksService.create({
        name: newDeckName,
        description: 'Created from generated cards',
        deck_type: 'flashcard',
        image_url: book?.cover_image || null
      })
      setDecks([...decks, newDeck])
      setSelectedDeckId(newDeck._id) // Auto-select new deck
      setNewDeckName('')
      setIsCreatingDeck(false)
      reloadDecks()
    } catch (error) {
      console.error('Error creating deck:', error)
    } finally {
      setCreateLoading(false)
    }
  }

  // WR-03: surface save errors to the user via saveError state
  const handleSaveCards = async () => {
    if (!selectedDeckId) return
    setSaveError(null)
    try {
      setSaving(true)
      const cardsToSave = selectedCards.map((index) => cards[index])

      // Save each card to the selected deck
      // We process sequentially or parallel. Parallel is faster.
      await Promise.all(
        cardsToSave.map((card) =>
          cardsService.create({
            title: card.title,
            content: card.content,
            deck_id: selectedDeckId,
            tags: ['generated']
          })
        )
      )

      onCancel() // Close modal on success
    } catch (error) {
      console.error('Error saving cards:', error)
      setSaveError(t('cards.generatedCards.saveError'))
    } finally {
      setSaving(false)
    }
  }

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
              {/* Regenerate Button */}
              <Tooltip title={t('cards.generatedCards.generateAgainTooltip')}>
                <Button
                  size='sm'
                  variant='outlined'
                  onClick={handleGenerateAgain}
                  disabled={loading}
                  aria-label={t('cards.generatedCards.generateAgainTooltip')}
                  sx={{ position: 'absolute', top: 16, right: 48, minWidth: 36, p: 0.8 }}
                >
                  {loading ? <CircularProgress size='sm' /> : <RefreshCw size={18} />}
                </Button>
              </Tooltip>

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
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' }
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
              </Stack>

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
            <Stack spacing={3} sx={{ minHeight: 200, px: 2 }}>
              <FormControl>
                <FormLabel>{t('cards.generatedCards.selectDeckLabel')}</FormLabel>
                <Select
                  value={selectedDeckId}
                  onChange={(_, val) => setSelectedDeckId(val)}
                  placeholder={t('cards.generatedCards.chooseDeckPlaceholder')}
                >
                  {decks.map((deck) => (
                    <Option key={deck._id} value={deck._id}>
                      {deck.name}
                    </Option>
                  ))}
                </Select>
              </FormControl>

              <Divider>{t('cards.generatedCards.orDivider')}</Divider>

              <Box
                sx={{ p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'md', bgcolor: 'background.level1' }}
              >
                {!isCreatingDeck ? (
                  <Button variant='plain' startDecorator={<Plus />} onClick={() => setIsCreatingDeck(true)} fullWidth>
                    {t('cards.generatedCards.createNewDeck')}
                  </Button>
                ) : (
                  <Stack spacing={2} direction='row'>
                    <Input
                      placeholder={t('cards.generatedCards.newDeckNamePlaceholder')}
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      fullWidth
                    />
                    <Button onClick={handleCreateDeck} loading={createLoading}>
                      {t('cards.generatedCards.createButton')}
                    </Button>
                    <Button variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                      {t('cards.generatedCards.cancelButton')}
                    </Button>
                  </Stack>
                )}
              </Box>
            </Stack>
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
          <Stack direction='row' justifyContent='flex-end' spacing={1}>
            <Button variant='soft' color='neutral' onClick={onCancel}>
              {t('cards.generatedCards.cancelButton')}
            </Button>
            {step === 'select_cards' ? (
              <Button variant='solid' color='primary' onClick={handleProceedToDeck} disabled={selectedCards.length === 0}>
                {t('cards.generatedCards.proceedCount', { count: selectedCards.length })}
              </Button>
            ) : (
              <Button variant='solid' color='success' onClick={handleSaveCards} loading={saving} disabled={!selectedDeckId}>
                {t('cards.generatedCards.confirmSave')}
              </Button>
            )}
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
