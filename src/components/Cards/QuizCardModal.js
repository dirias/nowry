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
  IconButton,
  Box,
  Radio,
  RadioGroup,
  Alert
} from '@mui/joy'
import { Add, Delete } from '@mui/icons-material'
import { cardsService } from '../../api/services'

export default function QuizCardModal({ open, onClose, onSaved, decks = [], initialData = null }) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [deckId, setDeckId] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLimitError, setIsLimitError] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      setError('')
      setIsLimitError(false)
    }
    if (initialData) {
      setTitle(initialData.title || '')
      setOptions(initialData.options || ['', '', '', ''])
      setCorrectAnswer(initialData.correct_answer || '')
      setExplanation(initialData.explanation || '')

      // Extract deck ID - handle both object and string formats
      let extractedDeckId = ''
      if (initialData.deck_id) {
        if (typeof initialData.deck_id === 'object') {
          extractedDeckId = initialData.deck_id._id || initialData.deck_id.id || ''
        } else {
          extractedDeckId = initialData.deck_id
        }
      }

      console.log('🔍 Quiz Card Modal - Deck ID Debug:')
      console.log('  Raw deck_id:', initialData.deck_id)
      console.log('  Extracted deck_id:', extractedDeckId)
      console.log(
        '  Available decks:',
        decks.map((d) => ({ name: d.name, _id: d._id, id: d.id }))
      )

      setDeckId(extractedDeckId)

      setTags(initialData.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags) : '')
    } else {
      setTitle('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setExplanation('')
      setDeckId('')
      setTags('')
    }
  }, [initialData, open, decks])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const tagsArray = tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : []

    // Filter out empty options
    const validOptions = options.filter((opt) => opt.trim() !== '')

    try {
      const cardPayload = {
        title,
        options: validOptions,
        correct_answer: correctAnswer,
        explanation,
        deck_id: deckId || undefined,
        tags: tagsArray,
        card_type: 'quiz'
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
      console.error('Error saving quiz card:', error)
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

  const addOption = () => {
    setOptions([...options, ''])
  }

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      // If the removed option was the correct answer, clear it
      if (correctAnswer === options[index]) {
        setCorrectAnswer('')
      }
    }
  }

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <ModalClose />
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
          <Typography level='h4'>{isEdit ? 'Edit Quiz Question' : 'Create Quiz Question'}</Typography>
          <Chip size='sm' color='warning' variant='soft'>
            Quiz
          </Chip>
        </Stack>

        {error && (
          <Alert
            color='danger'
            sx={{ mb: 2 }}
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
            <FormControl required>
              <FormLabel>Question</FormLabel>
              <Textarea
                autoFocus
                placeholder='What is the capital of France?'
                minRows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size='lg'
              />
            </FormControl>

            <FormControl required>
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
                <FormLabel>Answer Options (select correct one)</FormLabel>
                <Button size='sm' variant='soft' startDecorator={<Add />} onClick={addOption}>
                  Add Option
                </Button>
              </Stack>

              <RadioGroup value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
                <Stack spacing={1.5}>
                  {options.map((option, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Radio value={option} disabled={!option.trim()} />
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      {options.length > 2 && (
                        <IconButton size='sm' color='danger' variant='soft' onClick={() => removeOption(index)}>
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Explanation (optional)</FormLabel>
              <Textarea
                placeholder='Explain why this is the correct answer...'
                minRows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
              />
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

            <Button type='submit' loading={loading} fullWidth size='lg' disabled={!correctAnswer} sx={{ mt: 1 }}>
              {isEdit ? 'Save Changes' : 'Create Quiz Question'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}
