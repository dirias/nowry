import React from 'react'
import { Card, Typography, Box, AspectRatio, IconButton, Stack, Chip } from '@mui/joy'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'

export default function Book({ book, handleBookClick = () => {}, onEdit, onDelete }) {
  const { cover_color, cover_image, title, author, isbn } = book
  const { themeColor } = useThemePreferences()

  return (
    <Card
      variant='plain'
      component='div'
      sx={{
        width: '100%',
        maxWidth: 200,
        p: 0,
        backgroundColor: 'transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
        boxShadow: 'sm',
        borderRadius: 'md',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-6px) scale(1.02)',
          boxShadow: 'lg',
          '& .book-actions': { opacity: 1 },
          '& .book-shine': { opacity: 1 }
        }
      }}
      onClick={() => handleBookClick(book)}
    >
      {/* 1. Futuristic Spine (Left Edge) */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '12px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 100%)',
          borderRight: '1px solid',
          borderRightColor: 'divider',
          zIndex: 10,
          boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.1)'
        }}
      />

      <AspectRatio
        ratio='2/3'
        sx={{
          borderRadius: 'md',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'background.surface'
        }}
      >
        {/* 2. Cover Image/Color */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: cover_color || themeColor || 'primary.solidBg',
            background: cover_image
              ? `url(${cover_image}) center/cover`
              : `linear-gradient(135deg, ${cover_color || themeColor || 'var(--joy-palette-primary-solidBg)'} 0%, var(--joy-palette-neutral-900) 120%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Fallback Icon with Glow */}
          {!cover_image && (
            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 0 20px rgba(255,255,255,0.1)',
                backdropFilter: 'blur(4px)'
              }}
            >
              <MenuBookIcon sx={{ fontSize: 32, color: 'common.white', opacity: 0.9 }} />
            </Box>
          )}
          {cover_image && (
            <img src={cover_image} alt={title} loading='lazy' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </Box>

        {/* 3. Surface Shine Effect (Hover) */}
        <Box
          className='book-shine'
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 35%, transparent 40%)',
            backgroundSize: '200% 100%',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            zIndex: 15
          }}
        />

        {/* 4. Top Overlay: Tags (Glassmorphism) */}
        {book.tags && book.tags.length > 0 && (
          <Box sx={{ position: 'absolute', top: 0, left: 12, right: 0, p: 1, zIndex: 10 }}>
            <Stack direction='row' flexWrap='wrap' spacing={0.5}>
              {book.tags.slice(0, 3).map((tag, i) => (
                <Chip
                  key={i}
                  size='sm'
                  variant='solid'
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    color: 'common.white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '10px',
                    height: 20
                  }}
                >
                  {tag}
                </Chip>
              ))}
            </Stack>
          </Box>
        )}

        {/* 5. Bottom Gradient Overlay (Glassmorphism Text Area) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            pl: 3, // Account for spine
            pt: 6,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            zIndex: 5
          }}
        >
          <Typography
            level='title-md'
            sx={{
              color: 'common.white',
              fontWeight: 600,
              letterSpacing: '0.01em',
              mb: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              bgcolor: 'transparent'
            }}
          >
            {title}
          </Typography>
          <Typography
            level='body-xs'
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.75rem',
              fontWeight: 500,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              bgcolor: 'transparent'
            }}
            noWrap
          >
            {author || 'Unknown Author'}
          </Typography>
        </Box>

        {/* 6. Actions Overlay */}
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
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateY(-4px)',
              '.MuiCard-root:hover &': {
                transform: 'translateY(0)'
              }
            }}
          >
            {onEdit && (
              <IconButton
                size='sm'
                variant='solid'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(book)
                }}
                sx={{
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(4px)',
                  color: 'common.white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: 'sm',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.4)', transform: 'scale(1.1)' }
                }}
              >
                <EditIcon fontSize='small' />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size='sm'
                variant='solid'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(book)
                }}
                sx={{
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(4px)',
                  color: 'danger.softColor',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: 'sm',
                  '&:hover': { bgcolor: 'danger.solidBg', color: 'common.white', transform: 'scale(1.1)', border: 'none' }
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
