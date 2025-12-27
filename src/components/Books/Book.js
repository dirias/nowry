import React from 'react'
import { Card, CardContent, Typography, Box, AspectRatio, Sheet } from '@mui/joy'
import MenuBookIcon from '@mui/icons-material/MenuBook'

export default function Book({ book, handleBookClick = () => {}, handleContextMenu = () => {} }) {
  const { cover_color, cover_image, title, author, isbn } = book

  return (
    <Sheet
      component='article'
      sx={{
        width: 180,
        height: 260,
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 'lg',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        backgroundColor: 'background.surface',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: 'md'
        },
        '&:focus-visible': {
          outline: '2px solid var(--joy-palette-primary-outlinedBorder)',
          outlineOffset: '2px'
        }
      }}
      onClick={() => handleBookClick(book)}
      onContextMenu={(e) => {
        e.preventDefault()
        handleContextMenu(e, book)
      }}
      tabIndex={0}
    >
      {/* Book binding */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: (theme) => `linear-gradient(to bottom, ${theme.palette.neutral[300]}, ${theme.palette.neutral[400]})`,
          borderTopLeftRadius: 'lg',
          borderBottomLeftRadius: 'lg'
        }}
      />

      <Card
        variant='outlined'
        color='neutral'
        sx={{
          height: '100%',
          borderRadius: 'lg',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2.5,
          pl: 3,
          textAlign: 'center',
          backgroundColor: 'background.level1',
          boxShadow: 'sm'
        }}
      >
        <AspectRatio ratio='1' sx={{ width: 80, borderRadius: 'md', mb: 1.5 }}>
          {cover_image ? (
            <img
              src={cover_image}
              alt={title}
              loading='lazy'
              style={{
                objectFit: 'cover',
                borderRadius: 8,
                backgroundColor: cover_color || 'var(--joy-palette-primary-softBg)'
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cover_color || 'primary.softBg',
                color: 'primary.solidColor'
              }}
            >
              <MenuBookIcon sx={{ fontSize: 40 }} />
            </Box>
          )}
        </AspectRatio>

        <CardContent sx={{ p: 0 }}>
          <Typography level='title-sm' fontWeight='lg' noWrap>
            {title}
          </Typography>
          <Typography level='body-sm' color='text.secondary' noWrap>
            {author || 'Autor desconocido'}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' noWrap>
            {isbn || 'Sin ISBN'}
          </Typography>
        </CardContent>
      </Card>
    </Sheet>
  )
}
