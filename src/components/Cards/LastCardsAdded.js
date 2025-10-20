import * as React from 'react'
import Sheet from '@mui/joy/Sheet'
import Stack from '@mui/joy/Stack'
import Typography from '@mui/joy/Typography'
import Box from '@mui/joy/Box'
import StudyCard from './StudyCard'

const cards = [
  { title: 'What is AI?', content: 'AI stands for Artificial Intelligence...', tags: 'AI' },
  { title: 'What is Machine Learning?', content: 'Machine Learning is...', tags: 'ML' },
  { title: 'What is Deep Learning?', content: 'Deep Learning uses neural nets...', tags: 'DL' },
  { title: 'What is NLP?', content: 'Natural Language Processing...', tags: 'NLP' },
  { title: 'What is CV?', content: 'Computer Vision is...', tags: 'CV' },
  { title: 'What is RL?', content: 'Reinforcement Learning uses reward...', tags: 'RL' },
  { title: 'What is a Neural Network?', content: 'Neural nets are...', tags: 'NN' }
]

export default function LastCardsAdded() {
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
      <Typography level='h3' sx={{ fontWeight: 'bold', mb: 3, color: 'primary.700' }}>
        Últimas tarjetas añadidas
      </Typography>

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
            <StudyCard key={index} card={card} />
          ))}
        </Stack>
      </Box>
    </Sheet>
  )
}
