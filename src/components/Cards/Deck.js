import * as React from 'react'
import { Card, CardContent, Typography, AspectRatio, CardActions, Button, LinearProgress, Chip, Box } from '@mui/joy'
import SchoolIcon from '@mui/icons-material/School'
import WarningIcon from '@mui/icons-material/Warning'

export default function Deck({ deckName, deckTotal, url, status = 'default', progress = null }) {
  const statusColor =
    {
      new: 'success',
      attention: 'danger',
      default: 'neutral'
    }[status] || 'neutral'

  const statusLabel = {
    new: 'Nuevo',
    attention: 'Atención',
    default: null
  }[status]

  return (
    <Card
      variant='soft'
      color='neutral'
      sx={{
        width: 240,
        mx: 'auto',
        boxShadow: 'xs',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 'md'
        },
        position: 'relative'
      }}
    >
      {/* Badge */}
      {statusLabel && (
        <Chip
          size='sm'
          variant='soft'
          color={statusColor}
          startDecorator={status === 'attention' ? '⚠️' : '✨'}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            px: 1.2,
            fontSize: 11,
            borderRadius: 'xl',
            fontWeight: 600,
            overflow: 'visible', // Fix cut-off
            backgroundColor: status === 'attention' ? '#ffe5e5' : status === 'new' ? '#e5fff1' : 'transparent',
            color: status === 'attention' ? '#b30000' : status === 'new' ? '#027a4c' : '#333'
          }}
        >
          {statusLabel}
        </Chip>
      )}

      {/* Deck Info */}
      <Typography level='title-md' sx={{ fontWeight: 600 }}>
        {deckName}
      </Typography>
      <Typography level='body-xs' textColor='neutral.500'>
        Total: {deckTotal}
      </Typography>

      {/* Flag or icon */}
      <AspectRatio ratio='4/3' sx={{ borderRadius: 'sm', my: 1 }}>
        <img src={url} alt={deckName} loading='lazy' />
      </AspectRatio>

      {/* Optional progress */}
      {progress !== null && <LinearProgress determinate value={progress} thickness={6} sx={{ borderRadius: 'lg', mb: 1 }} />}

      {/* Call to action */}
      <CardActions>
        <Button size='sm' variant='solid' color='primary'>
          Explore
        </Button>
      </CardActions>
    </Card>
  )
}
