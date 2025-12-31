import React from 'react'
import { Card, Typography, Box, AspectRatio, IconButton, Stack, Chip } from '@mui/joy'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function Book({ book, handleBookClick = () => {}, onEdit, onDelete }) {
  const { cover_color, cover_image, title, author, isbn } = book

  return (
    <Card
      variant='plain'
      sx={{
        width: '100%',
        maxWidth: 200,
        p: 0,
        backgroundColor: 'transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '2px 4px 8px rgba(0,0,0,0.15), 4px 8px 16px rgba(0,0,0,0.1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '3px 6px 12px rgba(0,0,0,0.2), 6px 12px 24px rgba(0,0,0,0.15)',
          '& .book-actions': { opacity: 1 }
        }
      }}
      onClick={() => handleBookClick(book)}
    >
      {/* Book Spine (Left Edge) */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: cover_image
            ? 'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(255,255,255,0.1))'
            : `linear-gradient(to right, ${cover_color || '#0B6BCB'}dd, ${cover_color || '#0B6BCB'}88, rgba(255,255,255,0.1))`,
          borderRadius: '4px 0 0 4px',
          zIndex: 5,
          boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3)'
        }}
      />

      <AspectRatio
        ratio='2/3'
        sx={{
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'background.surface'
        }}
      >
        {/* Cover Image/Color with Gradient Texture */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: cover_color || 'primary.solidBg',
            background: cover_image
              ? `url(${cover_image}) center/cover`
              : `radial-gradient(circle at 30% 30%, ${cover_color || '#0B6BCB'}dd, ${cover_color || '#0B6BCB'} 60%, ${cover_color || '#0B6BCB'}bb 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!cover_image && <MenuBookIcon sx={{ fontSize: 48, opacity: 0.2, color: '#fff' }} />}
          {cover_image && (
            <img src={cover_image} alt={title} loading='lazy' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </Box>

        {/* Embossed Relief Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {/* Top Overlay: Tags */}
        {book.tags && book.tags.length > 0 && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, p: 1, zIndex: 10 }}>
            <Stack direction='row' flexWrap='wrap' spacing={0.5}>
              {book.tags.slice(0, 3).map((tag, i) => (
                <Chip
                  key={i}
                  size='sm'
                  variant='solid'
                  sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', fontSize: '10px', height: 20 }}
                >
                  {tag}
                </Chip>
              ))}
              {book.tags.length > 3 && (
                <Chip size='sm' variant='solid' sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'black', fontSize: '10px', height: 20 }}>
                  +{book.tags.length - 3}
                </Chip>
              )}
            </Stack>
          </Box>
        )}

        {/* Gradient Overlay for Text */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            pt: 8,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}
        >
          <Typography
            level='title-md'
            sx={{
              color: '#fff',
              mb: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              backgroundColor: 'transparent'
            }}
          >
            {title}
          </Typography>
          <Typography
            level='body-xs'
            sx={{
              color: 'neutral.300',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              display: 'block',
              backgroundColor: 'transparent'
            }}
            noWrap
          >
            {author || 'Unknown Author'}
          </Typography>
        </Box>

        {/* Actions Overlay (Top Right) */}
        {(onEdit || onDelete) && (
          <Stack
            className='book-actions'
            direction='row'
            spacing={1}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 20,
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out'
            }}
          >
            {onEdit && (
              <IconButton
                size='sm'
                variant='solid'
                color='neutral'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(book)
                }}
                sx={{
                  borderRadius: '50%',
                  boxShadow: 'sm',
                  bgcolor: 'background.surface',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'primary.solidBg', color: '#fff' }
                }}
              >
                <EditIcon fontSize='small' />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size='sm'
                variant='solid'
                color='danger'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(book)
                }}
                sx={{
                  borderRadius: '50%',
                  boxShadow: 'sm'
                }}
              >
                <DeleteIcon fontSize='small' />
              </IconButton>
            )}
          </Stack>
        )}
      </AspectRatio>
    </Card>
  )
}
