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
  Option
} from '@mui/joy'
import { cardsService } from '../../api/services'

const CreateCardModal = ({ open, onClose, onSaved, decks = [], initialData = null }) => {
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
      setDeckId(initialData.deck_id || '')
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

    // Process tags: split by comma and trim
    const tagsArray = tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : []

    try {
      let savedCard
      const cardPayload = {
        title,
        content,
        deck_id: deckId || undefined,
        tags: tagsArray
      }

      if (isEdit) {
        savedCard = await cardsService.update(initialData._id || initialData.id, cardPayload)
      } else {
        savedCard = await cardsService.create(cardPayload)
      }
      onSaved(savedCard)
      onClose()
    } catch (error) {
      console.error('Error saving card:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
        <ModalClose />
        <Typography level='h4' mb={2}>
          {isEdit ? 'Editar Tarjeta' : 'Añadir Nueva Tarjeta'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Título / Frente</FormLabel>
              <Input autoFocus placeholder='Ej. おはよう (Ohayou)' value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormControl>
            <FormControl required>
              <FormLabel>Contenido / Reverso</FormLabel>
              <Textarea placeholder='Ej. Buenos días' minRows={3} value={content} onChange={(e) => setContent(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Etiquetas (separadas por coma)</FormLabel>
              <Input placeholder='gramática, vocabulario, urgente' value={tags} onChange={(e) => setTags(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Asignar a Mazo</FormLabel>
              <Select placeholder='Selecciona un mazo (opcional)' value={deckId} onChange={(_, newValue) => setDeckId(newValue)}>
                {decks.map((deck) => (
                  <Option key={deck.id || deck._id} value={deck.id || deck._id}>
                    {deck.name}
                  </Option>
                ))}
              </Select>
            </FormControl>
            <Button type='submit' loading={loading} fullWidth sx={{ mt: 1 }}>
              {isEdit ? 'Guardar Cambios' : 'Añadir Tarjeta'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}

export default CreateCardModal
