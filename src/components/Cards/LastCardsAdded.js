import * as React from 'react'
import { Sheet, Stack, Typography, Box } from '@mui/joy'
import StudyCard from './StudyCard'

export default function LastCardsAdded({ cards = [], onEdit, onDelete }) {
  if (cards.length === 0) {
    return (
      <Sheet
        variant='soft'
        sx={{
          borderRadius: 'lg',
          p: 4,
          textAlign: 'center',
          backgroundColor: '#f1fbfb'
        }}
      >
        <Typography level='body-md' sx={{ color: 'neutral.500' }}>
          No hay tarjetas recientes.
        </Typography>
      </Sheet>
    )
  }

  return (
    <Sheet
      variant='soft'
      sx={{
        borderRadius: 'lg',
        p: 4,
        mb: 5,
        backgroundColor: '#f1fbfb',
        boxShadow: 'lg',
        border: '1px solid',
        borderColor: 'primary.softActiveBg',
        width: '100%',
        overflowX: 'auto'
      }}
    >
      <Box
        sx={{
          overflowX: 'auto',
          width: '100%',
          pb: 1,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#bbb',
            borderRadius: 4
          }
        }}
      >
        <Stack
          direction='row'
          spacing={3}
          sx={{
            minWidth: 'max-content',
            px: 1,
            '& > *': { flex: '0 0 auto' }
          }}
        >
          {cards.map((card, index) => (
            <StudyCard key={card._id || index} card={card} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Stack>
      </Box>
    </Sheet>
  )
}
