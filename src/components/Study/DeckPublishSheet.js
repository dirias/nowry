import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Box,
  Stack,
  Typography,
  Divider,
  Sheet,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  Input,
  Select,
  Option,
  Button,
  Alert
} from '@mui/joy'
import { Style, Quiz as QuizIcon, AccountTree, Public, CallSplit } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { decksService } from '../../api/services'

export default function DeckPublishSheet({ open, onClose, deckId, deck, onPublished }) {
  const { t } = useTranslation()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [difficulty, setDifficulty] = useState(null)
  const [language, setLanguage] = useState('en')

  // Pre-fill or reset on open
  useEffect(() => {
    if (!open) return
    if (deck?.is_public && deck?.public_metadata) {
      setDescription(deck.public_metadata.description || '')
      setTags(deck.public_metadata.tags?.join(', ') || '')
      setDifficulty(deck.public_metadata.difficulty_level || null)
      setLanguage(deck.public_metadata.language || 'en')
    } else {
      setDescription('')
      setTags('')
      setDifficulty(null)
      setLanguage('en')
    }
    setError(null)
  }, [open, deck])

  let accentColor = 'primary'
  let IconComponent = Style
  if (deck?.deck_type === 'quiz') {
    accentColor = 'warning'
    IconComponent = QuizIcon
  }
  if (deck?.deck_type === 'visual') {
    accentColor = 'success'
    IconComponent = AccountTree
  }

  const handlePublish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        description: description.trim().slice(0, 280),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        language,
        difficulty_level: difficulty,
        license_type: 'all_rights_reserved',
        is_original_content: true
      }
      await decksService.publish(deckId, payload)
      onPublished()
      onClose()
    } catch (err) {
      if (err?.response?.status === 409) setError(t('publish.error.alreadyPublished'))
      else if (err?.response?.status === 403) setError(t('publish.error.notOwner'))
      else setError(t('publish.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnpublish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await decksService.unpublish(deckId)
      onPublished()
      onClose()
    } catch (err) {
      if (err?.response?.status === 403) setError(t('publish.error.notOwner'))
      else setError(t('publish.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout='center'
        sx={{
          width: { xs: '100%', sm: 480 },
          maxHeight: '80vh',
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ModalClose sx={{ top: 12, right: 12 }} />

        {/* Header */}
        <Box sx={{ px: 3, pt: 3, pb: 2, flexShrink: 0 }}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 'md',
                bgcolor: `${accentColor}.softBg`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconComponent sx={{ fontSize: 18, color: `${accentColor}.plainColor` }} />
            </Box>
            <Box>
              <Typography level='title-md' fontWeight={700}>
                {deck?.name}
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('publish.sheetSubtitle')}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        {/* Scrollable body */}
        <Box sx={{ overflowY: 'auto', px: 3, py: 2.5, flex: 1 }}>
          <Stack spacing={2.5}>
            {/* Published state banner */}
            {deck?.is_public && (
              <Sheet variant='soft' color='success' sx={{ borderRadius: 'md', p: 1.5 }}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Public sx={{ fontSize: 16 }} />
                  <Typography level='body-sm'>
                    {t('publish.alreadyPublished', {
                      date: deck.published_at ? new Date(deck.published_at).toLocaleDateString() : ''
                    })}
                  </Typography>
                </Stack>
              </Sheet>
            )}

            {/* First-time hint for unpublished decks */}
            {!deck?.is_public && (
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('publish.firstTimeHint')}
              </Typography>
            )}

            {/* Fork attribution — immutable, only shown when deck is a fork */}
            {deck?.forked_from && (
              <Box sx={{ bgcolor: 'background.level1', borderRadius: 'sm', p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <CallSplit sx={{ fontSize: 15, color: 'text.tertiary', mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {t('publish.forkedFrom.label')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('publish.forkedFrom.value', {
                      title: deck.forked_from.title,
                      author: deck.forked_from.author_name || t('public.unknownAuthor')
                    })}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5, fontStyle: 'italic' }}>
                    {t('publish.forkedFrom.immutableNote')}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Description */}
            <FormControl>
              <FormLabel>{t('publish.form.description')}</FormLabel>
              <Textarea
                size='sm'
                minRows={2}
                maxRows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                slotProps={{ textarea: { maxLength: 280 } }}
              />
              <FormHelperText>
                {description.length}/280 · {t('publish.form.descriptionHint')}
              </FormHelperText>
            </FormControl>

            {/* Tags */}
            <FormControl>
              <FormLabel>{t('publish.form.tags')}</FormLabel>
              <Input size='sm' value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('publish.form.tagsPlaceholder')} />
              <FormHelperText>{t('publish.form.tagsHint')}</FormHelperText>
            </FormControl>

            {/* Difficulty */}
            <FormControl>
              <FormLabel>{t('publish.form.difficulty')}</FormLabel>
              <Select size='sm' value={difficulty} onChange={(_, val) => setDifficulty(val)} placeholder={t('publish.form.difficulty')}>
                <Option value='beginner'>{t('publish.difficulty.beginner')}</Option>
                <Option value='intermediate'>{t('publish.difficulty.intermediate')}</Option>
                <Option value='advanced'>{t('publish.difficulty.advanced')}</Option>
              </Select>
            </FormControl>

            {/* Language */}
            <FormControl>
              <FormLabel>{t('publish.form.language')}</FormLabel>
              <Select size='sm' value={language} onChange={(_, val) => setLanguage(val)}>
                <Option value='en'>English</Option>
                <Option value='fr'>Français</Option>
                <Option value='es'>Español</Option>
                <Option value='de'>Deutsch</Option>
                <Option value='pt'>Português</Option>
                <Option value='ja'>日本語</Option>
                <Option value='zh'>中文</Option>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Error */}
        {error && (
          <Alert variant='soft' color='danger' size='sm' sx={{ mx: 3, mb: 1 }}>
            {error}
          </Alert>
        )}

        <Divider />

        {/* Footer */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 3, py: 2, flexShrink: 0 }}>
          {deck?.is_public ? (
            <Button
              variant='plain'
              color='danger'
              size='sm'
              loading={submitting}
              onClick={handleUnpublish}
              aria-label={t('publish.unpublish')}
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: '3px'
                }
              }}
            >
              {t('publish.unpublish')}
            </Button>
          ) : (
            <Box />
          )}

          <Stack direction='row' spacing={1}>
            <Button
              variant='outlined'
              color='neutral'
              size='sm'
              onClick={onClose}
              disabled={submitting}
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: '3px'
                }
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant='solid'
              color='primary'
              size='sm'
              loading={submitting}
              onClick={handlePublish}
              aria-label={t('publish.confirm')}
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: '3px'
                }
              }}
            >
              {t('publish.confirm')}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
