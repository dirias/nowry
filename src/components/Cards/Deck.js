import * as React from 'react'
import {
  Card,
  CardContent,
  Typography,
  AspectRatio,
  CardActions,
  Button,
  LinearProgress,
  Chip,
  Box,
  IconButton,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem
} from '@mui/joy'
import SchoolIcon from '@mui/icons-material/School'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function Deck({ deck, onStudy, onEdit, onDelete }) {
  const { name: deckName, total_cards: deckTotal, image_url: url, status = 'default', progress = null } = deck

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
      <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1, zIndex: 1, alignItems: 'center' }}>
        {/* Badge */}
        {statusLabel && (
          <Chip
            size='sm'
            variant='soft'
            color={statusColor}
            startDecorator={status === 'attention' ? '⚠️' : '✨'}
            sx={{
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

        <Dropdown>
          <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}>
            <MoreVertIcon />
          </MenuButton>
          <Menu placement='bottom-end'>
            <MenuItem onClick={() => onEdit(deck)}>
              <EditIcon /> Editar
            </MenuItem>
            <MenuItem onClick={() => onDelete(deck)} variant='soft' color='danger'>
              <DeleteIcon /> Eliminar
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>

      {/* Deck Info */}
      <Typography level='title-md' sx={{ fontWeight: 600 }}>
        {deckName}
      </Typography>
      <Typography level='body-xs' textColor='neutral.500'>
        Total: {deckTotal}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
        {Array.isArray(deck.tags) ? (
          deck.tags.slice(0, 3).map((tag, idx) => (
            <Chip key={idx} size='sm' variant='soft' color='neutral' sx={{ fontSize: '9px', fontWeight: 600 }}>
              {tag.toUpperCase()}
            </Chip>
          ))
        ) : deck.tags ? (
          <Chip size='sm' variant='soft' color='neutral' sx={{ fontSize: '9px', fontWeight: 600 }}>
            {deck.tags.toUpperCase()}
          </Chip>
        ) : null}
      </Box>

      {/* Flag or icon */}
      <AspectRatio ratio='4/3' sx={{ borderRadius: 'sm', my: 1 }}>
        {url ? (
          <img
            src={url}
            alt={deckName}
            loading='lazy'
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <Box
          sx={{
            display: url ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'primary.50',
            color: 'primary.500',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <SchoolIcon sx={{ fontSize: '2rem', opacity: 0.5 }} />
          <Typography level='h2' sx={{ opacity: 0.2, fontWeight: 'bold' }}>
            {deckName?.charAt(0).toUpperCase()}
          </Typography>
        </Box>
      </AspectRatio>

      {/* Optional progress */}
      {progress !== null && <LinearProgress determinate value={progress} thickness={6} sx={{ borderRadius: 'lg', mb: 1 }} />}

      {/* Call to action */}
      <CardActions>
        <Button size='sm' variant='solid' color='primary' onClick={() => onStudy?.(deck)}>
          Study
        </Button>
      </CardActions>
    </Card>
  )
}
