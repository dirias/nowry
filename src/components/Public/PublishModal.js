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

const CATEGORIES = ['science', 'math', 'languages', 'history', 'literature', 'technology', 'art', 'music', 'business', 'health']

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']

const LICENSES = ['all_rights', 'cc_by', 'cc_by_sa', 'cc0']

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' }
]

const PublishModal = ({ open, onClose, onPublish, contentType = 'book' }) => {
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    category: '',
    tags: [],
    language: 'en',
    difficulty_level: '',
    license_type: 'all_rights',
    is_original_content: true
  })

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
    // Validation
    const newErrors = {}
    if (!formData.category) {
      newErrors.category = t('public.publishModal.categoryRequired')
    }
    if (formData.tags.length === 0) {
      newErrors.tags = t('public.publishModal.tagsRequired')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit
    onPublish(formData)
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
              {CATEGORIES.map((cat) => (
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
              {LANGUAGES.map((lang) => (
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
              value={formData.difficulty_level}
              onChange={(e, value) => setFormData({ ...formData, difficulty_level: value })}
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
              value={formData.license_type}
              onChange={(e, value) => setFormData({ ...formData, license_type: value })}
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
              checked={formData.is_original_content}
              onChange={(e) => setFormData({ ...formData, is_original_content: e.target.checked })}
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
