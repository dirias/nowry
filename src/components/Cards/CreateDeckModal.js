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
        <Typography level='h4' fontWeight={600} mb={3}>
          {isEdit ? 'Edit Deck' : 'New Deck'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Deck Name */}
            <Stack spacing={1.5}>
              <Typography
                level='body-xs'
                textTransform='uppercase'
                fontWeight={600}
                sx={{ color: 'text.tertiary', letterSpacing: '0.5px' }}
              >
                Deck Name
              </Typography>
              <Input
                autoFocus
                placeholder='E.g., Japanese Vocabulary'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                size='lg'
                variant='soft'
                sx={{
                  '--Input-focusedThickness': '2px',
                  fontSize: 'md'
                }}
              />
            </Stack>

            {/* Description */}
            <Stack spacing={1.5}>
              <Typography
                level='body-xs'
                textTransform='uppercase'
                fontWeight={600}
                sx={{ color: 'text.tertiary', letterSpacing: '0.5px' }}
              >
                Description
              </Typography>
              <Textarea
                placeholder='What is this deck about?'
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                placeholder='🖼️  Image URL (optional)'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                variant='plain'
                sx={{
                  '--Input-focusedThickness': '1px',
                  fontSize: 'sm'
                }}
              />

              <Input
                placeholder='🏷️  Add tags (e.g., languages, japanese, basic)'
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                variant='plain'
                sx={{
                  '--Input-focusedThickness': '1px',
                  fontSize: 'sm'
                }}
              />
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

export default CreateDeckModal
