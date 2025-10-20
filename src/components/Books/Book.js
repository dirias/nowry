import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/joy'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export default function Book({ book, handleBookClick, handleContextMenu }) {
  const { cover_color, cover_image, title, author, isbn } = book

  return (
    <Box
      sx={{
        position: 'relative',
        width: 160,
        height: 240,
        cursor: 'pointer'
      }}
    >
      {/* Book Binding (like a spine or spring edge with metallic rings) */}
      <Box
        className='book-binding'
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          backgroundColor: 'neutral.outlinedBorder',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          transition: 'background-color 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          py: 1,
          zIndex: 1
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #ddd 20%, #888 90%)',
              boxShadow: 'inset 0 0 2px rgba(0, 0, 0, 0.4)'
            }}
          />
        ))}
      </Box>

      <Card
        onClick={() => handleBookClick(book)}
        onContextMenu={(event) => handleContextMenu(event, book)}
        variant='outlined'
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'background.surface',
          borderRadius: '12px',
          boxShadow: 'sm',
          textAlign: 'center',
          px: 2,
          pt: 2,
          pb: 3,
          pl: 4.5,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 'md'
          },
          zIndex: 0
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mb: 1,
            backgroundColor: cover_color || 'primary.softBg',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {cover_image ? (
            <img src={cover_image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
          ) : (
            <MenuBookIcon sx={{ color: 'primary.solidColor' }} />
          )}
        </Box>

        <CardContent sx={{ p: 0 }}>
          <Typography level='title-sm' fontWeight='md' noWrap>
            {title}
          </Typography>
          <Typography level='body-xs' noWrap color='text.tertiary'>
            {author || 'Autor desconocido'}
          </Typography>
          <Typography level='body-xs' noWrap color='text.tertiary'>
            {isbn || 'Sin ISBN'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
