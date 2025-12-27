import React, { useState } from 'react'
import { SketchPicker } from 'react-color'
import Book from './Book'
import { booksService } from '../../api/services'
import { Box, Typography, Button, Input, Textarea, Chip, Stack, Sheet, IconButton, Modal } from '@mui/joy'
import CloseIcon from '@mui/icons-material/Close'

const BookEditor = ({ book, refreshBooks, onCancel }) => {
  const [title, setTitle] = useState(book.title)
  const [createdAt] = useState(new Date(book.created_at) || new Date())
  const [updatedAt] = useState(new Date(book.updated_at) || new Date())
  const [pageLimit] = useState(book.page_limit)
  const [coverImage, setCoverImage] = useState(book.cover_image)
  const [coverColor, setCoverColor] = useState(book.cover_color)
  const [summary, setSummary] = useState(book.summary)
  const [tags, setTags] = useState(book.tags || [])
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const [newTag, setNewTag] = useState('')

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
    if (newTag.trim() !== '') {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (index) => {
    const updatedTags = tags.filter((_, i) => i !== index)
    setTags(updatedTags)
  }

  return (
    <Modal open onClose={onCancel} keepMounted>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Sheet
          variant='outlined'
          sx={{
            width: '90%',
            maxWidth: 900,
            p: 3,
            borderRadius: 'md',
            bgcolor: 'background.surface',
            boxShadow: 'lg'
          }}
        >
          <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
            <Typography level='h4'>Editar libro</Typography>
            <IconButton onClick={onCancel}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack spacing={3} direction={{ xs: 'column', md: 'row' }}>
            <Box flex={1}>
              <Typography level='body-sm' mb={0.5}>
                Título
              </Typography>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />

              <Typography level='body-sm' mt={2} mb={0.5}>
                Color de portada
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: coverColor || '#fff',
                    borderRadius: 'sm',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder'
                  }}
                  onClick={() => setDisplayColorPicker(!displayColorPicker)}
                />
                {displayColorPicker && (
                  <Box position='absolute' zIndex={2000}>
                    <Box position='fixed' top={0} left={0} right={0} bottom={0} onClick={() => setDisplayColorPicker(false)} />
                    <SketchPicker
                      color={coverColor}
                      onChangeComplete={(color) => setCoverColor(color.hex)}
                      styles={{ default: { picker: { background: 'var(--joy-palette-background-surface)' } } }}
                    />
                  </Box>
                )}
              </Box>

              <Typography level='body-sm' mt={2} mb={0.5}>
                Etiquetas
              </Typography>
              <Box>
                <Stack direction='row' spacing={1} flexWrap='wrap'>
                  {tags.map((tag, index) => (
                    <Chip key={index} onDelete={() => handleRemoveTag(index)}>
                      {tag}
                    </Chip>
                  ))}
                </Stack>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder='Añadir etiqueta y presiona Enter'
                  fullWidth
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <Box flex={1}>
              <Typography level='body-sm' mb={0.5}>
                Resumen
              </Typography>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} minRows={6} />

              <Typography level='body-sm' mt={2} mb={0.5}>
                Vista previa
              </Typography>
              <Book book={{ ...book, title, cover_color: coverColor }} handleBookClick={() => {}} handleContextMenu={() => {}} />
            </Box>
          </Stack>

          <Stack direction='row' justifyContent='space-between' mt={4}>
            <Typography level='body-xs' color='text.tertiary'>
              Creado: {createdAt.toLocaleDateString()} • Última edición: {updatedAt.toLocaleDateString()} • Límite: {pageLimit} páginas
            </Typography>
            <Stack direction='row' spacing={1}>
              <Button variant='plain' onClick={onCancel}>
                Cancelar
              </Button>
              <Button variant='solid' color='primary' onClick={handleSave}>
                Guardar cambios
              </Button>
            </Stack>
          </Stack>
        </Sheet>
      </Box>
    </Modal>
  )
}

export default BookEditor
