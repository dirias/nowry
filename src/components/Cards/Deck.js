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
  MenuItem,
  Tooltip,
  Stack
} from '@mui/joy'
import QuizIcon from '@mui/icons-material/Quiz'
import StyleIcon from '@mui/icons-material/Style'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SchoolIcon from '@mui/icons-material/School'
import VisibilityIcon from '@mui/icons-material/Visibility'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function Deck({ deck, cards = [], onStudy, onEdit, onDelete, onPreview }) {
  const {
    name: deckName,
    total_cards: deckTotal,
    image_url: url,
    status = 'default',
    progress = null,
    deck_type,
    due_cards = 0,
    has_cards = false
  } = deck

  // Configuration for different deck types
  let config = {
    icon: StyleIcon,
    label: 'Card',
    gradient: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
    color: 'primary.600'
  }

  if (deck_type === 'quiz') {
    config = {
      icon: QuizIcon,
      label: 'Question',
      gradient: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
      color: 'warning.600'
    }
  } else if (deck_type === 'visual') {
    config = {
      icon: AccountTreeIcon,
      label: 'Diagram',
      gradient: 'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)', // Cyan
      color: 'info.600'
    }
  }

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
        position: 'relative',
        bgcolor: 'background.surface'
      }}
    >
      <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1, zIndex: 1, alignItems: 'center' }}>
        {statusLabel && (
          <Chip
            size='sm'
            variant='soft'
            color={statusColor}
            startDecorator={status === 'attention' ? '⚠️' : '✨'}
            sx={{
              px: 1,
              fontSize: 10,
              borderRadius: 'md',
              fontWeight: 600,
              bgcolor: 'background.surface'
            }}
          >
            {statusLabel}
          </Chip>
        )}

        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                color: 'neutral',
                size: 'sm',
                sx: { bgcolor: 'background.surface', borderRadius: '50%', '&:hover': { bgcolor: 'background.level1' } }
              }
            }}
          >
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
      <Typography level='title-md' sx={{ fontWeight: 600, mt: 0.5 }}>
        {deckName}
      </Typography>

      {/* Minimal Metadata Row */}
      <Typography level='body-xs' textColor='neutral.500' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <config.icon sx={{ fontSize: 14 }} />
        {deckTotal} {deckTotal === 1 ? config.label : `${config.label}s`}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5, minHeight: 20 }}>
        {Array.isArray(deck.tags)
          ? deck.tags.slice(0, 3).map((tag, idx) => (
              <Chip
                key={idx}
                size='sm'
                variant='outlined'
                color='neutral'
                sx={{ fontSize: '9px', border: 'none', bgcolor: 'background.level1' }}
              >
                #{tag.toLowerCase()}
              </Chip>
            ))
          : null}
      </Box>

      {/* Dynamic Cover Area */}
      <AspectRatio ratio='2/1' sx={{ borderRadius: 'md', bgcolor: 'transparent' }}>
        {url ? (
          <img src={url} alt={deckName} loading='lazy' style={{ borderRadius: 8 }} />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: config.gradient,
              color: config.color,
              borderRadius: 'md'
            }}
          >
            <config.icon sx={{ fontSize: '2.5rem', opacity: 0.8 }} />
          </Box>
        )}
      </AspectRatio>

      {/* Optional progress */}
      {progress !== null && <LinearProgress determinate value={progress} thickness={6} sx={{ borderRadius: 'lg', mb: 1 }} />}

      {/* Call to action */}
      <CardActions>
        {!has_cards ? (
          // Empty state - no cards in deck
          <Button size='sm' variant='outlined' color='neutral' disabled fullWidth>
            No cards yet
          </Button>
        ) : due_cards === 0 ? (
          // All cards reviewed - show preview option
          <Tooltip title='All cards reviewed! Come back later or preview the deck' variant='soft' placement='top'>
            <Button
              size='sm'
              variant='soft'
              color='neutral'
              onClick={() => onPreview?.(deck)}
              startDecorator={<VisibilityIcon />}
              fullWidth
            >
              Preview
            </Button>
          </Tooltip>
        ) : (
          // Cards due - show study button
          <Stack direction='row' spacing={1} sx={{ width: '100%' }}>
            <Button size='sm' variant='solid' color='primary' onClick={() => onStudy?.(deck)} fullWidth startDecorator={<SchoolIcon />}>
              Study {due_cards > 0 && `(${due_cards})`}
            </Button>
          </Stack>
        )}
      </CardActions>
    </Card>
  )
}
