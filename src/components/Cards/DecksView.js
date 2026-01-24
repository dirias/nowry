import React from 'react'
import { Sheet, Grid, Typography, Stack, Box } from '@mui/joy'
import Deck from './Deck'

export default function DecksView({ decks = [], cards = [], onStudy, onEdit, onDelete, onPreview, viewMode = 'grid' }) {
  if (decks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography level='h4' sx={{ mb: 1, color: 'neutral.500' }}>
          📭 No decks found
        </Typography>
        <Typography level='body-md' sx={{ color: 'neutral.400' }}>
          Create your first deck to start learning
        </Typography>
      </Box>
    )
  }

  if (viewMode === 'list') {
    return (
      <Stack spacing={2}>
        {decks.map((deck, idx) => (
          <Deck
            key={deck._id || idx}
            deck={deck}
            cards={cards}
            onStudy={onStudy}
            onEdit={onEdit}
            onDelete={onDelete}
            onPreview={onPreview}
            viewMode='list'
          />
        ))}
      </Stack>
    )
  }

  return (
    <Sheet
      sx={{
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <Grid container spacing={{ xs: 1, md: 1.5 }} sx={{ width: '100%' }}>
        {decks.map((deck, idx) => (
          <Grid key={deck._id || idx} xs={12} sm={6} md={4} lg={3}>
            <Deck deck={deck} cards={cards} onStudy={onStudy} onEdit={onEdit} onDelete={onDelete} onPreview={onPreview} viewMode='grid' />
          </Grid>
        ))}
      </Grid>
    </Sheet>
  )
}
