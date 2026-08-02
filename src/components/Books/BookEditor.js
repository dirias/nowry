import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SketchPicker } from 'react-color'
import { booksService, publicContentService } from '../../api/services'
import {
  Box,
  Typography,
  Button,
  Input,
  Textarea,
  Chip,
  ChipDelete,
  Stack,
  IconButton,
  Modal,
  ModalDialog,
  FormControl,
  FormLabel,
  Grid,
  Divider,
  Tooltip
} from '@mui/joy'
import CloseIcon from '@mui/icons-material/Close'
import PaletteIcon from '@mui/icons-material/Palette'
import CheckIcon from '@mui/icons-material/Check'
import PublicIcon from '@mui/icons-material/Public'
import PublicOffIcon from '@mui/icons-material/PublicOff'

const PRESET_COLORS = [
  '#0B6BCB', // Primary Blue
  '#C41C1C', // Danger Red
  '#1F7A1F', // Success Green
  '#9A5B13', // Warning Orange
  '#6523cf', // Purple
  '#c41c88', // Pink
  '#000000', // Black
  '#555555' // Grey
]

import Book from './Book'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import PublishModal from '../Public/PublishModal'
import { SuccessWindow, Error as ErrorMsg } from '../Messages'

const BookEditor = ({ book, refreshBooks, onCancel }) => {
  const { t } = useTranslation()
  const { themeColor } = useThemePreferences() // Get user's theme color
  const [title, setTitle] = useState(book.title)
  const [createdAt] = useState(new Date(book.created_at) || new Date())
  const [updatedAt] = useState(new Date(book.updated_at) || new Date())
  const [pageLimit] = useState(book.page_limit)
  const [coverImage, setCoverImage] = useState(book.cover_image)
  const [coverColor, setCoverColor] = useState(book.cover_color || themeColor)
  const [summary, setSummary] = useState(book.summary || '')
  const [tags, setTags] = useState(book.tags || [])
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [message, setMessage] = useState(null)

  // Construct preview object for the Book component
  const previewBook = {
    ...book,
    title,
    cover_image: coverImage,
    cover_color: coverColor,
    tags,
    summary
  }

  const handleSave = async () => {
    // If the user typed a tag but forgot to press Enter, auto-add it
    let finalTags = [...tags]
    if (newTag.trim() !== '' && !tags.includes(newTag.trim())) {
      finalTags.push(newTag.trim())
      setTags(finalTags)
      setNewTag('')
    }

    const updatedData = {
      title,
      coverImage,
      coverColor,
      summary,
      tags: finalTags
    }
    try {
      await booksService.update(book._id, updatedData)
      refreshBooks()
      onCancel()
    } catch (error) {
      console.error('Error updating book:', error)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() !== '' && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const handlePublish = async (metadata) => {
    try {
      await publicContentService.publishBook(book._id, metadata)
      setMessage({ type: 'success', text: t('public.publishSuccess') })
      setShowPublishModal(false)
      refreshBooks()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error publishing book:', error)
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to publish' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleUnpublish = async () => {
    try {
      await publicContentService.unpublishBook(book._id)
      setMessage({ type: 'success', text: t('public.unpublishSuccess') })
      refreshBooks()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error unpublishing book:', error)
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to unpublish' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <>
      {message && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 10000 }}>
          {message.type === 'success' ? <SuccessWindow message={message.text} /> : <ErrorMsg message={message.text} />}
        </Box>
      )}

      <PublishModal open={showPublishModal} onClose={() => setShowPublishModal(false)} onPublish={handlePublish} contentType='book' />

      <Modal
        open
        onClose={onCancel}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 0, sm: 2 } // flush on mobile
        }}
      >
        <ModalDialog
          variant='outlined'
          sx={{
            width: { xs: '100vw', sm: '100%' },
            maxWidth: 1000,
            height: { xs: '100dvh', sm: 'auto' },
            maxHeight: { xs: '100dvh', sm: '90vh' },
            p: 0,
            m: 0,
            borderRadius: { xs: 0, sm: 'md' },
            border: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: 'lg' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header - Compact */}
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography level='h4' sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
                Book Editor
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Edit details for &quot;{book.title}&quot;
              </Typography>
            </Box>
            <IconButton onClick={onCancel} variant='plain' color='neutral' size='sm'>
              <CloseIcon />
            </IconButton>
          </Box>

          <Grid container sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {/* Left Column: Form - Compact spacing */}
            <Grid
              xs={12}
              md={7}
              sx={{
                p: { xs: 2, md: 3 },
                borderRight: { md: '1px solid' },
                borderColor: 'divider',
                overflow: 'auto',
                bgcolor: 'background.surface'
              }}
            >
              <Stack spacing={2.5}>
                <FormControl>
                  <FormLabel sx={{ fontSize: '0.875rem', mb: 0.5 }}>Title</FormLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    size='md'
                    placeholder={t('books.editor.titlePlaceholder')}
                    variant='outlined'
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontSize: '0.875rem', mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Cover Color
                    <IconButton size='sm' onClick={() => setDisplayColorPicker(!displayColorPicker)} variant='soft' color='neutral'>
                      <PaletteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </FormLabel>

                  {/* Color Presets - Compact */}
                  <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ gap: 0.75 }}>
                    {PRESET_COLORS.map((color) => (
                      <Box
                        key={color}
                        onClick={() => setCoverColor(color)}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 'sm',
                          bgcolor: color,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          border: '2px solid',
                          borderColor: coverColor === color ? color : 'transparent',
                          outline: coverColor === color ? '2px solid' : 'none',
                          outlineColor: coverColor === color ? 'primary.outlinedBorder' : 'transparent',
                          outlineOffset: '2px',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            boxShadow: 'sm'
                          }
                        }}
                      >
                        {coverColor === color && <CheckIcon sx={{ color: 'white', fontSize: 18 }} />}
                      </Box>
                    ))}
                    <Box sx={{ position: 'relative' }}>
                      {displayColorPicker && (
                        <Box sx={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, mt: 1 }}>
                          <Box
                            sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                            onClick={() => setDisplayColorPicker(false)}
                          />
                          <SketchPicker color={coverColor} onChangeComplete={(color) => setCoverColor(color.hex)} />
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontSize: '0.875rem', mb: 0.5 }}>Cover Image URL</FormLabel>
                  <Input
                    value={coverImage || ''}
                    onChange={(e) => setCoverImage(e.target.value)}
                    size='sm'
                    placeholder='https://example.com/image.jpg'
                    variant='outlined'
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontSize: '0.875rem', mb: 0.75 }}>{t('books.tagsLabel')}</FormLabel>
                  <Box
                    sx={{
                      p: 1.25,
                      border: '1px solid',
                      borderColor: 'neutral.outlinedBorder',
                      borderRadius: 'sm',
                      minHeight: 80,
                      bgcolor: 'background.surface',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:focus-within': {
                        borderColor: 'primary.solidBg',
                        boxShadow: 'inset 0 0 0 1px var(--joy-palette-primary-solidBg)'
                      }
                    }}
                  >
                    <Stack direction='row' flexWrap='wrap' spacing={0.75} sx={{ mb: tags.length > 0 ? 1 : 0 }}>
                      {tags.map((tag) => (
                        <Chip
                          key={tag}
                          variant='soft'
                          color='primary'
                          size='sm'
                          endDecorator={
                            <ChipDelete variant='plain' aria-label={t('books.removeTag', { tag })} onDelete={() => handleRemoveTag(tag)}>
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </ChipDelete>
                          }
                        >
                          {tag}
                        </Chip>
                      ))}
                    </Stack>
                    <Input
                      variant='plain'
                      placeholder={t('books.tagInputPlaceholder')}
                      value={newTag}
                      size='sm'
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      sx={{
                        p: 0,
                        flex: 1,
                        fontSize: '0.875rem',
                        '--Input-focusedThickness': '0px',
                        '--Input-minHeight': '24px',
                        bgcolor: 'transparent'
                      }}
                    />
                  </Box>
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontSize: '0.875rem', mb: 0.5 }}>Summary</FormLabel>
                  <Textarea
                    minRows={3}
                    placeholder={t('books.editor.summaryPlaceholder')}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    size='sm'
                    sx={{ fontSize: '0.875rem' }}
                  />
                </FormControl>
              </Stack>
            </Grid>

            {/* Right Column: Preview - Compact */}
            <Grid
              xs={12}
              md={5}
              sx={{
                bgcolor: 'background.level1',
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto'
              }}
            >
              <Typography
                level='body-sm'
                sx={{
                  width: '100%',
                  mb: 2,
                  color: 'text.tertiary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Live Preview
              </Typography>

              {/* Live Preview using unified Book component */}
              <Box sx={{ width: 200, pointerEvents: 'none' }}>
                <Book book={previewBook} />
              </Box>

              <Typography level='body-xs' sx={{ mt: 3, color: 'text.tertiary', textAlign: 'center', fontSize: '0.7rem' }}>
                Created: {createdAt.toLocaleDateString()}
                <br />
                Last edited: {updatedAt.toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>

          {/* Footer actions - Mobile-First */}
          <Box
            sx={{
              p: { xs: 2, md: 2 },
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
              bgcolor: 'background.surface'
            }}
          >
            {/* Left: Publish button */}
            <Box sx={{ display: 'flex' }}>
              {book.is_public ? (
                <Tooltip title={t('public.unpublish')}>
                  <Button fullWidth variant='soft' color='neutral' onClick={handleUnpublish} size='md' startDecorator={<PublicOffIcon />}>
                    {t('public.published')}
                  </Button>
                </Tooltip>
              ) : (
                <Button fullWidth variant='outlined' onClick={() => setShowPublishModal(true)} size='md' startDecorator={<PublicIcon />}>
                  {t('public.publish')}
                </Button>
              )}
            </Box>

            {/* Right: Save/Cancel */}
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button fullWidth variant='plain' color='neutral' onClick={onCancel} size='md'>
                {t('common.cancel')}
              </Button>
              <Button fullWidth variant='solid' color='primary' onClick={handleSave} size='md'>
                {t('common.save')} {t('common.changes', { defaultValue: 'Changes' })}
              </Button>
            </Box>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default BookEditor
