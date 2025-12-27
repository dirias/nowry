import React, { useState, useEffect } from 'react'
import { Modal, ModalDialog, ModalClose, Typography, FormControl, FormLabel, Input, Textarea, Button, Stack } from '@mui/joy'
import { decksService } from '../../api/services'

const CreateDeckModal = ({ open, onClose, onSaved, initialData = null }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setImageUrl(initialData.image_url || '')
      setTags(initialData.tags ? initialData.tags.join(', ') : '')
    } else {
      setName('')
      setDescription('')
      setImageUrl('')
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
      let savedDeck
      const deckPayload = {
        name,
        description,
        image_url: imageUrl || null,
        tags: tagsArray
      }

      if (isEdit) {
        savedDeck = await decksService.update(initialData._id || initialData.id, deckPayload)
      } else {
        savedDeck = await decksService.create(deckPayload)
      }
      onSaved(savedDeck)
      onClose()
    } catch (error) {
      console.error('Error saving deck:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
        <ModalClose />
        <Typography level='h4' mb={2}>
          {isEdit ? 'Editar Mazo' : 'Crear Nuevo Mazo'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Nombre del Mazo</FormLabel>
              <Input autoFocus placeholder='Ej. Vocabulario Japonés' value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Descripción</FormLabel>
              <Textarea
                placeholder='¿Sobre qué es este mazo?'
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>URL de la Imagen</FormLabel>
              <Input placeholder='https://ejemplo.com/imagen.png' value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Etiquetas (separadas por coma)</FormLabel>
              <Input placeholder='idiomas, japonés, básico' value={tags} onChange={(e) => setTags(e.target.value)} />
            </FormControl>
            <Button type='submit' loading={loading} fullWidth sx={{ mt: 1 }}>
              {isEdit ? 'Guardar Cambios' : 'Crear Mazo'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}

export default CreateDeckModal
