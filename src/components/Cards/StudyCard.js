import * as React from 'react'
import { Card, CardContent, Typography, Chip, Box } from '@mui/joy'

export default function StudyCard({ card }) {
  return (
    <Card
      variant='outlined'
      sx={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        px: 2,
        py: 2.5,
        borderRadius: 'lg',
        borderColor: 'neutral.outlinedActiveBorder',
        boxShadow: 'sm',
        backgroundColor: 'white',
        transition: '0.3s ease',
        '&:hover': {
          boxShadow: 'lg',
          transform: 'translateY(-4px)',
          borderColor: 'primary.solidBg',
          backgroundColor: 'primary.softBg'
        }
      }}
    >
      <CardContent>
        <Typography
          level='title-md'
          sx={{
            fontWeight: 'bold',
            mb: 1,
            color: 'primary.700'
          }}
        >
          {card.title}
        </Typography>

        <Typography
          level='body-sm'
          sx={{
            color: 'text.secondary',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {card.content}
        </Typography>
      </CardContent>

      <Box mt={2}>
        <Chip size='sm' variant='solid' color='primary' sx={{ fontWeight: 'bold' }}>
          {card.tags}
        </Chip>
      </Box>
    </Card>
  )
}
