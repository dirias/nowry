import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Stack,
  FormControl,
  FormLabel,
  Select,
  Option,
  Input,
  Chip,
  Checkbox,
  Button,
  Box,
  Divider
} from '@mui/joy'
import { Add as AddIcon } from '@mui/icons-material'
import {
  CONTENT_LANGUAGES,
  DIFFICULTY_LEVELS,
  LICENSES,
  PUBLISH_CATEGORIES,
  emptyListing,
  listingErrors,
  listingPayload
} from '@nowry/core/domain/publishListing'

const PublishModal = ({ open, onClose, onPublish, contentType = 'book' }) => {
  const { t, i18n } = useTranslation()

  // The listing's options, rules and request body are @nowry/core's, which the
  // phone publishes through too (MOB-103).
  const [formData, setFormData] = useState(() => emptyListing(i18n.language))

  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState({})

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
      setNewTag('')
      setErrors({ ...errors, tags: null })
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove)
    })
  }

  const handleSubmit = () => {
    const keys = listingErrors(formData)
    if (Object.keys(keys).length > 0) {
      setErrors(Object.fromEntries(Object.entries(keys).map(([field, key]) => [field, t(key)])))
      return
    }

    // An unchosen difficulty is sent as null: the API refuses an empty one.
    onPublish(listingPayload(formData))
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: { xs: '95vw', sm: '700px', md: '900px', lg: '1000px' },
          width: '100%',
          maxHeight: '95vh',
          minHeight: { sm: '600px' },
          overflow: 'auto',
          p: { xs: 3, md: 6 }
        }}
      >
        <ModalClose />

        <Typography level='h2' sx={{ mb: 2, fontWeight: 700 }}>
          {t('public.publishModal.title')}
        </Typography>

        <Typography level='body-md' sx={{ mb: 5, color: 'text.secondary', lineHeight: 1.6 }}>
          {t('public.publishModal.description')}
        </Typography>

        <Stack spacing={5}>
          {/* Category */}
          <FormControl error={!!errors.category}>
            <FormLabel required sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>
              {t('public.category')}
            </FormLabel>
            <Select
              value={formData.category}
              onChange={(e, value) => {
                setFormData({ ...formData, category: value })
                setErrors({ ...errors, category: null })
              }}
              placeholder={t('common.select')}
              size='lg'
              sx={{ minHeight: '56px' }}
            >
              {PUBLISH_CATEGORIES.map((cat) => (
                <Option key={cat} value={cat}>
                  {t(`public.categories.${cat}`)}
                </Option>
              ))}
            </Select>
            {errors.category && (
              <Typography level='body-xs' sx={{ color: 'danger.solidBg', mt: 2 }}>
                {errors.category}
              </Typography>
            )}
          </FormControl>

          {/* Tags */}
          <FormControl error={!!errors.tags}>
            <FormLabel required sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>
              {t('public.tags')}
            </FormLabel>
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder={t('public.publishModal.addTag')}
                sx={{ flex: 1, minHeight: '56px' }}
                size='lg'
              />
              <Button onClick={handleAddTag} size='lg' variant='outlined' startDecorator={<AddIcon />} sx={{ minHeight: '56px', px: 3 }}>
                {t('common.add')}
              </Button>
            </Box>

            {formData.tags.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  p: 3,
                  bgcolor: 'background.level1',
                  borderRadius: 'md',
                  minHeight: '80px'
                }}
              >
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    variant='soft'
                    size='lg'
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{ height: '36px', fontSize: '0.95rem' }}
                  >
                    {tag}
                  </Chip>
                ))}
              </Box>
            )}

            {errors.tags && (
              <Typography level='body-xs' sx={{ color: 'danger.solidBg', mt: 2 }}>
                {errors.tags}
              </Typography>
            )}
          </FormControl>

          {/* Language */}
          <FormControl>
            <FormLabel sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>{t('public.language')}</FormLabel>
            <Select
              value={formData.language}
              onChange={(e, value) => setFormData({ ...formData, language: value })}
              size='lg'
              sx={{ minHeight: '56px' }}
            >
              {CONTENT_LANGUAGES.map((lang) => (
                <Option key={lang.code} value={lang.code}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </FormControl>

          {/* Difficulty */}
          <FormControl>
            <FormLabel sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>{t('public.difficulty')}</FormLabel>
            <Select
              value={formData.difficulty}
              onChange={(e, value) => setFormData({ ...formData, difficulty: value })}
              placeholder={t('common.optional')}
              size='lg'
              sx={{ minHeight: '56px' }}
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <Option key={level} value={level}>
                  {t(`public.difficultyLevels.${level}`)}
                </Option>
              ))}
            </Select>
          </FormControl>

          {/* License */}
          <FormControl>
            <FormLabel sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>{t('public.license')}</FormLabel>
            <Select
              value={formData.license}
              onChange={(e, value) => setFormData({ ...formData, license: value })}
              size='lg'
              sx={{ minHeight: '56px' }}
            >
              {LICENSES.map((license) => (
                <Option key={license} value={license}>
                  {t(`public.licenses.${license}`)}
                </Option>
              ))}
            </Select>
          </FormControl>

          {/* Original Content Checkbox */}
          <FormControl sx={{ mt: 3 }}>
            <Checkbox
              checked={formData.original}
              onChange={(e) => setFormData({ ...formData, original: e.target.checked })}
              label={t('public.originalContent')}
              size='lg'
              sx={{ py: 1.5 }}
            />
          </FormControl>

          <Divider sx={{ my: 4 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'flex-end', pt: 2 }}>
            <Button variant='plain' onClick={onClose} size='lg' sx={{ px: 5, minHeight: '48px' }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} size='lg' variant='solid' color='primary' sx={{ px: 5, minHeight: '48px' }}>
              {t('public.publishModal.submit')}
            </Button>
          </Box>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

export default PublishModal
