import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Card, CircularProgress, Divider, Modal, ModalDialog, ModalClose, Snackbar, Stack, Typography } from '@mui/joy'
import DeckSelector from '../Agent/DeckSelector'
import { blackboardService } from '../../api/services/blackboard.service'
import { cardsService } from '../../api/services/cards.service'
import { decksService } from '../../api/services/decks.service'

export default function ConvertToCardsModal({ open, onClose, boardId, selectedNodes }) {
  const { t } = useTranslation()

  // Card generation state
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState([])
  const [nodesTruncated, setNodesTruncated] = useState(false)
  const [error, setError] = useState(null)

  // Deck selection state
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [decks, setDecks] = useState([])
  const [decksLoading, setDecksLoading] = useState(false)
  const [decksError, setDecksError] = useState(null)

  // Add to deck state
  const [adding, setAdding] = useState(false)
  const [snackbar, setSnackbar] = useState(null)

  // Fetch decks once when modal opens
  useEffect(() => {
    if (!open) return
    setDecksLoading(true)
    setDecksError(null)
    decksService
      .getAll()
      .then((data) => setDecks(data || []))
      .catch(() => setDecksError(t('common.error')))
      .finally(() => setDecksLoading(false))
  }, [open, t])

  // Generate cards from selected nodes
  useEffect(() => {
    if (!open || !selectedNodes || selectedNodes.length === 0) return
    setLoading(true)
    setError(null)
    setCards([])
    setSelectedDeck(null)

    const nodeIds = selectedNodes.map((n) => n.id)
    const nodeTexts = selectedNodes.map((n) => {
      const data = n.data || {}
      return data.label || data.text || data.content || data.title || data.body || data.name || ''
    })

    blackboardService
      .generateCards(boardId, { nodeIds, nodeTexts })
      .then((result) => {
        setCards(result.cards || [])
        setNodesTruncated(result.nodes_truncated || false)
      })
      .catch((err) => {
        const status = err.response?.status
        if (status === 504) {
          setError(t('blackboard.convert.error.timeout'))
        } else if (status === 422) {
          setError(t('blackboard.convert.empty.title'))
        } else {
          setError(t('blackboard.convert.error.failed'))
        }
      })
      .finally(() => setLoading(false))
  }, [open, boardId, selectedNodes, t])

  const handleAddToDeck = async () => {
    if (!selectedDeck || cards.length === 0) return
    setAdding(true)
    try {
      for (const card of cards) {
        await cardsService.create({
          deck_id: selectedDeck.id ?? selectedDeck.deck_id,
          title: card.front,
          content: card.back
        })
      }
      setSnackbar({
        message: t('blackboard.convertToCardsModal.success', {
          count: cards.length,
          deckName: selectedDeck.name
        }),
        color: 'success'
      })
      onClose()
    } catch {
      setError(t('blackboard.convert.error.failed'))
    } finally {
      setAdding(false)
    }
  }

  const handleClose = () => {
    setCards([])
    setError(null)
    setSelectedDeck(null)
    onClose()
  }

  const isEmpty = !loading && !error && cards.length === 0 && selectedNodes && selectedNodes.length > 0

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <ModalDialog sx={{ width: { xs: '95%', sm: '90%', lg: '640px' }, p: 0 }}>
          {/* Header */}
          <Box sx={{ bgcolor: 'background.level1', px: 3, py: 2, borderRadius: 'lg lg 0 0' }}>
            <ModalClose />
            <Typography level='title-lg' sx={{ fontWeight: 600 }}>
              {t('blackboard.convertToCardsModal.title')}
            </Typography>
            {!loading && cards.length > 0 && (
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('blackboard.convertToCardsModal.selectedNodes', { count: selectedNodes?.length || 0 })}
              </Typography>
            )}
          </Box>

          {/* Content */}
          <Box sx={{ px: 3, py: 2, maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Loading state */}
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
                <CircularProgress size='md' aria-label={t('blackboard.toolbar.convertingCards')} />
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  {t('blackboard.toolbar.convertingCards')}
                </Typography>
              </Box>
            )}

            {/* Error state */}
            {!loading && error && (
              <Alert color='danger' variant='soft'>
                {error}
              </Alert>
            )}

            {/* Empty state — no text found in selected nodes */}
            {isEmpty && (
              <Alert color='warning' variant='soft'>
                {t('blackboard.convert.empty.body')}
              </Alert>
            )}

            {/* Success state — card preview list */}
            {!loading && !error && cards.length > 0 && (
              <>
                {nodesTruncated && (
                  <Alert color='warning' variant='soft' size='sm' sx={{ mb: 2 }}>
                    {t('blackboard.convert.truncated')}
                  </Alert>
                )}
                <Stack gap={1.5} sx={{ mb: 2 }}>
                  {cards.map((card, i) => (
                    <Card key={i} variant='outlined' sx={{ bgcolor: 'background.surface' }}>
                      <Typography level='title-sm'>{card.front}</Typography>
                      <Divider />
                      <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                        {card.back}
                      </Typography>
                    </Card>
                  ))}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Typography level='title-md' sx={{ mb: 1 }}>
                  {t('blackboard.convertToCardsModal.confirmDeck')}
                </Typography>
                <DeckSelector
                  decks={decks}
                  loading={decksLoading}
                  error={decksError}
                  onRetry={() => {
                    setDecksLoading(true)
                    setDecksError(null)
                    decksService
                      .getAll()
                      .then((data) => setDecks(data || []))
                      .catch(() => setDecksError(t('common.error')))
                      .finally(() => setDecksLoading(false))
                  }}
                  onSelect={(deck) => setSelectedDeck(deck)}
                />
              </>
            )}
          </Box>

          {/* Footer */}
          <Divider />
          <Stack direction='row' justifyContent='flex-end' gap={1} sx={{ px: 3, py: 2 }}>
            <Button variant='plain' color='neutral' onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant='solid'
              loading={adding}
              disabled={!selectedDeck || cards.length === 0 || loading}
              onClick={handleAddToDeck}
              aria-label={t('blackboard.convert.addToDeck')}
            >
              {t('blackboard.convert.addToDeck')}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      <Snackbar open={!!snackbar} autoHideDuration={4000} color={snackbar?.color} variant='soft' onClose={() => setSnackbar(null)}>
        {snackbar?.message}
      </Snackbar>
    </>
  )
}
