import React, { useState } from 'react'
import { SketchPicker } from 'react-color'
import { booksService } from '../../api/services'
import {
  Box,
  Typography,
  Button,
  Input,
  Textarea,
  Chip,
  Stack,
  Sheet,
  IconButton,
  Modal,
  FormControl,
  FormLabel,
  Grid,
  Divider,
  Tooltip
} from '@mui/joy'
import CloseIcon from '@mui/icons-material/Close'
import PaletteIcon from '@mui/icons-material/Palette'
import CheckIcon from '@mui/icons-material/Check'

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

const BookEditor = ({ book, refreshBooks, onCancel }) => {
  const [title, setTitle] = useState(book.title)
  const [createdAt] = useState(new Date(book.created_at) || new Date())
  const [updatedAt] = useState(new Date(book.updated_at) || new Date())
  const [pageLimit] = useState(book.page_limit)
  const [coverImage, setCoverImage] = useState(book.cover_image)
  const [coverColor, setCoverColor] = useState(book.cover_color || '#0B6BCB')
  const [summary, setSummary] = useState(book.summary || '')
  const [tags, setTags] = useState(book.tags || [])
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const [newTag, setNewTag] = useState('')

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
    const updatedData = {
      title,
      coverImage,
      coverColor,
      summary,
      tags
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

  const handleRemoveTag = (index) => {
    const updatedTags = tags.filter((_, i) => i !== index)
    setTags(updatedTags)
  }

  return (
    <Modal open onClose={onCancel} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
      <Sheet
        variant='outlined'
        sx={{
          width: '95%',
          maxWidth: 1000,
          maxHeight: '90vh',
          borderRadius: 'lg',
          boxShadow: 'lg',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          p: 0
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.level1'
          }}
        >
          <Box>
            <Typography level='h4' fontWeight='lg'>
              Book Editor
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              Edit details and appearance for &quot;{book.title}&quot;
            </Typography>
          </Box>
          <IconButton onClick={onCancel} variant='plain' color='neutral'>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container sx={{ flex: 1, minHeight: 0 }}>
          {/* Left Column: Form */}
          <Grid xs={12} md={7} sx={{ p: 3, borderRight: { md: '1px solid' }, borderColor: 'divider' }}>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  size='lg'
                  placeholder='Enter book title...'
                  variant='outlined'
                />
              </FormControl>

              <FormControl>
                <FormLabel>
                  Cover Color
                  <IconButton size='sm' onClick={() => setDisplayColorPicker(!displayColorPicker)} sx={{ ml: 1, verticalAlign: 'middle' }}>
                    <PaletteIcon fontSize='small' />
                  </IconButton>
                </FormLabel>

                {/* Color Presets */}
                <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ mb: 1 }}>
                  {PRESET_COLORS.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setCoverColor(color)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: color,
                        cursor: 'pointer',
                        boxShadow: 'sm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'scale(1.1)' },
                        border: coverColor === color ? '2px solid white' : 'none',
                        outline: coverColor === color ? `2px solid ${color}` : 'none'
                      }}
                    >
                      {coverColor === color && <CheckIcon sx={{ color: 'white', fontSize: 16 }} />}
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
                <FormLabel>Cover Image URL</FormLabel>
                <Input
                  value={coverImage || ''}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder='https://example.com/image.jpg'
                  variant='outlined'
                />
              </FormControl>

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Box
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder',
                    borderRadius: 'md',
                    minHeight: 100,
                    bgcolor: 'background.surface'
                  }}
                >
                  <Stack direction='row' flexWrap='wrap' spacing={1} sx={{ mb: 1.5 }}>
                    {tags.map((tag, index) => (
                      <Chip
                        key={index}
                        variant='soft'
                        color='primary'
                        endDecorator={<CloseIcon fontSize='small' />}
                        onDelete={() => handleRemoveTag(index)}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </Stack>
                  <Input
                    variant='plain'
                    placeholder='Type tag and press Enter...'
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    sx={{ p: 0 }}
                  />
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel>Summary</FormLabel>
                <Textarea
                  minRows={4}
                  placeholder='Brief description of the book...'
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </FormControl>
            </Stack>
          </Grid>

          {/* Right Column: Preview */}
          <Grid
            xs={12}
            md={5}
            sx={{
              bgcolor: 'background.level1',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography
              level='title-sm'
              sx={{ width: '100%', mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              Live Preview
            </Typography>

            {/* Live Preview using unified Book component */}
            <Box sx={{ width: 220, pointerEvents: 'none' }}>
              <Book book={previewBook} />
            </Box>

            <Typography level='body-xs' sx={{ mt: 4, color: 'text.tertiary', textAlign: 'center' }}>
              Created: {createdAt.toLocaleDateString()}
              <br />
              Last editted: {updatedAt.toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>

        {/* Footer actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            bgcolor: 'background.surface'
          }}
        >
          <Button variant='plain' color='neutral' onClick={onCancel}>
            Cancel
          </Button>
          <Button variant='solid' color='primary' onClick={handleSave}>
            Save Changes
          </Button>
        </Box>
      </Sheet>
    </Modal>
  )
}

export default BookEditor
