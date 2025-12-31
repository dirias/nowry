import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  Chip,
  Alert
} from '@mui/joy'
import { cardsService } from '../../api/services'

export default function FlashcardModal({ open, onClose, onSaved, decks = [], initialData = null }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deckId, setDeckId] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLimitError, setIsLimitError] = useState(false)
  const { t } = useTranslation()

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      setError('') // Reset error when opened
      setIsLimitError(false)
    }
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
    setError('')
    setIsLimitError(false)

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
      const status = error.response?.status
      const msg = error.response?.data?.detail || t('subscription.errors.genericCreate')

      if (status === 403) {
        setIsLimitError(true)
        setError(t('subscription.errors.limitReached'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 600, width: '100%' }}>
        <ModalClose />
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 3 }}>
          <Typography level='h4' fontWeight={600}>
            {isEdit ? 'Edit Flashcard' : 'New Flashcard'}
          </Typography>
          <Chip size='sm' color='primary' variant='soft'>
            📇 Flashcard
          </Chip>
        </Stack>

        {error && (
          <Alert
            color='danger'
            variant='soft'
            sx={{ mb: 3 }}
            endDecorator={
              isLimitError && (
                <Button size='sm' variant='soft' color='danger' onClick={() => navigate('/profile')}>
                  {t('subscription.upgrade')}
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Question Section */}
            <Stack spacing={1.5}>
              <Typography
                level='body-xs'
                textTransform='uppercase'
                fontWeight={600}
                sx={{ color: 'text.tertiary', letterSpacing: '0.5px' }}
              >
                Question
              </Typography>
              <Input
                autoFocus
                placeholder='What is the capital of France?'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                size='lg'
                variant='soft'
                sx={{
                  '--Input-focusedThickness': '2px',
                  fontSize: 'md'
                }}
              />
            </Stack>

            {/* Answer Section */}
            <Stack spacing={1.5}>
              <Typography
                level='body-xs'
                textTransform='uppercase'
                fontWeight={600}
                sx={{ color: 'text.tertiary', letterSpacing: '0.5px' }}
              >
                Answer
              </Typography>
              <Textarea
                placeholder='Paris'
                minRows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                size='lg'
                variant='soft'
                sx={{
                  '--Textarea-focusedThickness': '2px',
                  fontSize: 'md'
                }}
              />
            </Stack>

            {/* Meta Information - More Subtle */}
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Input
                placeholder='🏷️  Add tags (e.g., geography, capitals, france)'
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                variant='plain'
                sx={{
                  '--Input-focusedThickness': '1px',
                  fontSize: 'sm'
                }}
              />

              <Select
                placeholder='📚  Assign to deck (optional)'
                value={deckId}
                onChange={(_, newValue) => setDeckId(newValue)}
                variant='plain'
                sx={{ fontSize: 'sm' }}
              >
                {decks.map((deck) => {
                  const deckValue = deck._id || deck.id
                  return (
                    <Option key={deckValue} value={deckValue}>
                      {deck.name}
                    </Option>
                  )
                })}
              </Select>
            </Stack>

            <Button type='submit' loading={loading} fullWidth size='lg' sx={{ mt: 2 }}>
              {isEdit ? '💾  Save' : '✨  Create'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}
