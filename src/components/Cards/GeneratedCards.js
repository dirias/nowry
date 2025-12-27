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
  FormLabel
} from '@mui/joy'
import { BookOpen, RefreshCw, Layers, Plus } from 'lucide-react'
import { decksService, cardsService } from '../../api/services'

export default function GeneratedCards({ cards = [], onCancel, onGenerateAgain }) {
  const [step, setStep] = useState('select_cards') // 'select_cards' | 'select_deck'
  const [selectedCards, setSelectedCards] = useState([])
  const [loading, setLoading] = useState(false)

  // Deck selection state
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (step === 'select_deck') {
      loadDecks()
    }
  }, [step])

  const loadDecks = async () => {
    try {
      const data = await decksService.getAll()
      setDecks(data)
      if (data.length > 0) {
        setSelectedDeckId(data[0]._id)
      }
    } catch (error) {
      console.error('Error loading decks:', error)
    }
  }

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

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    try {
      setLoading(true)
      const newDeck = await decksService.create({ name: newDeckName, description: 'Created from generated cards' })
      setDecks([...decks, newDeck])
      setSelectedDeckId(newDeck._id) // Auto-select new deck
      setNewDeckName('')
      setIsCreatingDeck(false)
    } catch (error) {
      console.error('Error creating deck:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCards = async () => {
    if (!selectedDeckId) return
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
          overflow: 'auto',
          p: 3,
          minWidth: 600
        }}
      >
        <ModalClose sx={{ position: 'absolute', top: 8, right: 8 }} />

        {/* Header */}
        <Box sx={{ pr: 6, mb: 2 }}>
          <Typography level='h4' sx={{ fontWeight: 'bold' }}>
            {step === 'select_cards' ? 'New Study Cards' : 'Add to Deck'}
          </Typography>
          <Typography level='body-sm'>
            {step === 'select_cards' ? 'Select the cards you want to add to your study deck.' : 'Choose a deck to save your cards to.'}
          </Typography>
        </Box>

        {step === 'select_cards' && (
          <>
            {/* Regenerate Button */}
            <Tooltip title='Generate again'>
              <Button
                size='sm'
                variant='outlined'
                onClick={handleGenerateAgain}
                disabled={loading}
                sx={{ position: 'absolute', top: 16, right: 48, minWidth: 36, p: 0.8 }}
              >
                {loading ? <CircularProgress size='sm' /> : <RefreshCw size={18} />}
              </Button>
            </Tooltip>

            <Stack direction='row' flexWrap='wrap' gap={2} justifyContent='center' sx={{ mt: 2, minHeight: 200 }}>
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
          </>
        )}

        {step === 'select_deck' && (
          <Stack spacing={3} sx={{ mt: 2, minHeight: 200, px: 2 }}>
            <FormControl>
              <FormLabel>Select Deck</FormLabel>
              <Select value={selectedDeckId} onChange={(_, val) => setSelectedDeckId(val)} placeholder='Choose a deck...'>
                {decks.map((deck) => (
                  <Option key={deck._id} value={deck._id}>
                    {deck.name}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Divider>OR</Divider>

            <Box
              sx={{ p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'md', bgcolor: 'background.level1' }}
            >
              {!isCreatingDeck ? (
                <Button variant='plain' startDecorator={<Plus />} onClick={() => setIsCreatingDeck(true)} fullWidth>
                  Create New Deck
                </Button>
              ) : (
                <Stack spacing={2} direction='row'>
                  <Input placeholder='New Deck Name' value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} fullWidth />
                  <Button onClick={handleCreateDeck} loading={loading}>
                    Create
                  </Button>
                  <Button variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                    Cancel
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction='row' justifyContent='flex-end' spacing={1}>
          <Button variant='soft' color='neutral' onClick={onCancel}>
            Cancel
          </Button>
          {step === 'select_cards' ? (
            <Button variant='solid' color='primary' onClick={handleProceedToDeck} disabled={selectedCards.length === 0}>
              Proceed ({selectedCards.length})
            </Button>
          ) : (
            <Button variant='solid' color='success' onClick={handleSaveCards} loading={saving} disabled={!selectedDeckId}>
              Confirm & Save
            </Button>
          )}
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
