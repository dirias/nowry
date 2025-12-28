import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Stack,
  Select,
  Option,
  Chip
} from '@mui/joy'
import { cardsService } from '../../api/services'

export default function FlashcardModal({ open, onClose, onSaved, decks = [], initialData = null }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deckId, setDeckId] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setContent(initialData.content || '')

      // Extract deck ID - handle both object and string formats
      let extractedDeckId = ''
      if (initialData.deck_id) {
        if (typeof initialData.deck_id === 'object') {
          extractedDeckId = initialData.deck_id._id || initialData.deck_id.id || ''
        } else {
          extractedDeckId = initialData.deck_id
        }
      }
      setDeckId(extractedDeckId)

      setTags(initialData.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags) : '')
    } else {
      setTitle('')
      setContent('')
      setDeckId('')
      setTags('')
    }
  }, [initialData, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const tagsArray = tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : []

    try {
      const cardPayload = {
        title,
        content,
        deck_id: deckId || undefined,
        tags: tagsArray,
        card_type: 'flashcard'
      }

      let savedCard
      if (isEdit) {
        savedCard = await cardsService.update(initialData._id || initialData.id, cardPayload)
      } else {
        savedCard = await cardsService.create(cardPayload)
      }

      onSaved(savedCard)
      onClose()
    } catch (error) {
      console.error('Error saving flashcard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 600, width: '100%' }}>
        <ModalClose />
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
          <Typography level='h4'>{isEdit ? 'Edit Flashcard' : 'Create Flashcard'}</Typography>
          <Chip size='sm' color='primary' variant='soft'>
            Flashcard
          </Chip>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Question (Front)</FormLabel>
              <Input
                autoFocus
                placeholder='What is the capital of France?'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size='lg'
              />
            </FormControl>

            <FormControl required>
              <FormLabel>Answer (Back)</FormLabel>
              <Textarea placeholder='Paris' minRows={3} value={content} onChange={(e) => setContent(e.target.value)} size='lg' />
            </FormControl>

            <FormControl>
              <FormLabel>Tags (comma-separated)</FormLabel>
              <Input placeholder='geography, capitals, france' value={tags} onChange={(e) => setTags(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Assign to Deck</FormLabel>
              <Select placeholder='Select a deck (optional)' value={deckId} onChange={(_, newValue) => setDeckId(newValue)}>
                {decks.map((deck) => {
                  const deckValue = deck._id || deck.id
                  return (
                    <Option key={deckValue} value={deckValue}>
                      {deck.name}
                    </Option>
                  )
                })}
              </Select>
            </FormControl>

            <Button type='submit' loading={loading} fullWidth size='lg' sx={{ mt: 1 }}>
              {isEdit ? 'Save Changes' : 'Create Flashcard'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}
