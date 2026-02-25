import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ModalDialog, ModalClose, Typography, FormControl, FormLabel, Input, Textarea, Button, Stack, Box, Divider } from '@mui/joy'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PublicIcon from '@mui/icons-material/Public'
import PublicOffIcon from '@mui/icons-material/PublicOff'
import { decksService, publicContentService } from '../../api/services'
import { SuccessWindow, Error as ErrorMsg } from '../Messages'

const CreateDeckModal = ({ open, onClose, onSaved, initialData = null }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

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

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handlePublish = async () => {
    try {
      // Auto-populate with smart defaults
      const metadata = {
        category: 'Other',
        tags: initialData.tags || [],
        language: 'en',
        difficulty_level: null,
        license_type: 'all_rights_reserved',
        is_original_content: true
      }

      await publicContentService.publishDeck(initialData._id, metadata)
      showMessage('success', t('public.publishSuccess', { defaultValue: '✅ Published successfully!' }))
      onSaved({ ...initialData, is_public: true })
    } catch (error) {
      console.error('Error publishing deck:', error)
      showMessage('error', error.response?.data?.detail || 'Failed to publish')
    }
  }

  const handleUnpublish = async () => {
    try {
      await publicContentService.unpublishDeck(initialData._id)
      showMessage('success', t('public.unpublishSuccess'))
      onSaved({ ...initialData, is_public: false })
    } catch (error) {
      console.error('Error unpublishing deck:', error)
      showMessage('error', error.response?.data?.detail || 'Failed to unpublish')
    }
  }

  return (
    <>
      {message && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 10000 }}>
          {message.type === 'success' ? <SuccessWindow message={message.text} /> : <ErrorMsg message={message.text} />}
        </Box>
      )}

      <Modal open={open} onClose={onClose}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <ModalClose />
          <Typography level='title-lg' fontWeight={600} mb={3}>
            {isEdit ? t('cards.create.editTitle') : t('cards.create.newTitle')}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Deck Name */}
              <Stack spacing={1}>
                <Typography level='body-sm' sx={{ color: 'text.tertiary', fontWeight: 500 }}>
                  {t('cards.create.fields.name')}
                </Typography>
                <Input
                  autoFocus
                  placeholder={t('cards.create.fields.namePlaceholder')}
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
              <Stack spacing={1}>
                <Typography level='body-sm' sx={{ color: 'text.tertiary', fontWeight: 500 }}>
                  {t('cards.create.fields.description')}
                </Typography>
                <Textarea
                  placeholder={t('cards.create.fields.descriptionPlaceholder')}
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
                  placeholder={t('cards.create.fields.imageUrl')}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  variant='plain'
                  sx={{
                    '--Input-focusedThickness': '1px',
                    fontSize: 'sm'
                  }}
                />

                <Input
                  placeholder={t('cards.create.fields.tags')}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  variant='plain'
                  sx={{
                    '--Input-focusedThickness': '1px',
                    fontSize: 'sm'
                  }}
                />
              </Stack>

              {/* Publish Section (only in edit mode) */}
              {isEdit && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initialData?.is_public ? (
                      <Button variant='soft' color='success' onClick={handleUnpublish} size='sm' startDecorator={<PublicOffIcon />}>
                        {t('public.published', { defaultValue: 'Published' })}
                      </Button>
                    ) : (
                      <Button variant='outlined' color='primary' onClick={handlePublish} size='sm' startDecorator={<PublicIcon />}>
                        {t('public.publish', { defaultValue: 'Publish' })}
                      </Button>
                    )}
                  </Box>
                </>
              )}

              <Button
                type='submit'
                loading={loading}
                fullWidth
                size='lg'
                startDecorator={isEdit ? <SaveRoundedIcon /> : <AddRoundedIcon />}
                sx={{ mt: 2 }}
              >
                {isEdit ? t('cards.create.save') : t('cards.create.create')}
              </Button>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default CreateDeckModal
