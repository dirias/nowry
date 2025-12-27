import React from 'react'
import { Sheet, Grid, Typography } from '@mui/joy'
import Deck from './Deck'

export default function DecksView({ decks = [], onStudy, onEdit, onDelete }) {
  if (decks.length === 0) {
    return (
      <Typography level='body-md' sx={{ textAlign: 'center', py: 4, color: 'neutral.500' }}>
        No tienes mazos aún. ¡Crea uno para empezar!
      </Typography>
    )
  }

  return (
    <Sheet
      sx={{
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <Grid container spacing={3} sx={{ width: '100%' }}>
        {decks.map((deck, idx) => (
          <Grid key={deck._id || idx} xs={12} sm={6} md={4} lg={3}>
            <Deck deck={deck} onStudy={onStudy} onEdit={onEdit} onDelete={onDelete} />
          </Grid>
        ))}
      </Grid>
    </Sheet>
  )
}
