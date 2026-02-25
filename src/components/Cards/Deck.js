import * as React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
    singularKey: 'cards.typeLabels.card',
    pluralKey: 'cards.typeLabels.cards',
    gradient: 'linear-gradient(135deg, var(--joy-palette-primary-50) 0%, var(--joy-palette-primary-100) 100%)',
    color: 'primary.solidBg'
  }

  if (deck_type === 'quiz') {
    config = {
      icon: QuizIcon,
      singularKey: 'cards.typeLabels.question',
      pluralKey: 'cards.typeLabels.questions',
      gradient: 'linear-gradient(135deg, var(--joy-palette-warning-50) 0%, var(--joy-palette-warning-100) 100%)',
      color: 'warning.solidBg'
    }
  } else if (deck_type === 'visual') {
    config = {
      icon: AccountTreeIcon,
      singularKey: 'cards.typeLabels.diagram',
      pluralKey: 'cards.typeLabels.diagrams',
      gradient: 'linear-gradient(135deg, var(--joy-palette-success-50) 0%, var(--joy-palette-success-100) 100%)',
      color: 'success.solidBg'
    }
  }

  const statusColor =
    {
      new: 'success',
      attention: 'danger',
      default: 'neutral'
    }[status] || 'neutral'

  const typeLabel = deckTotal === 1 ? t(config.singularKey) : t(config.pluralKey)

  return (
    <Card
      variant='outlined'
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 260 },
        minHeight: 220,
        mx: 'auto',
        transition: 'all 0.15s ease',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'neutral.outlinedBorder',
          boxShadow: 'sm'
        },
        position: 'relative',
        bgcolor: 'background.surface',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Preview Area - Fixed Height for Consistency */}
      <Box sx={{ mb: 1.5, height: 87, borderRadius: 'sm', overflow: 'hidden' }}>
        {url ? (
          <img
            src={url}
            alt={deckName}
            loading='lazy'
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '6px'
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: config.gradient,
              borderRadius: 'sm'
            }}
          >
            <config.icon sx={{ fontSize: 40, opacity: 0.6, color: config.color }} />
          </Box>
        )}
      </Box>

      {/* Header Row - Title + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        {/* Title */}
        <Typography
          level='title-md'
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'text.primary',
            flex: 1
          }}
        >
          {deckName}
        </Typography>

        {/* Actions Menu */}
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                color: 'neutral',
                size: 'sm',
                sx: {
                  minWidth: 24,
                  minHeight: 24,
                  '&:hover': { bgcolor: 'background.level1' }
                }
              }
            }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </MenuButton>
          <Menu placement='bottom-end' size='sm'>
            <MenuItem onClick={() => onEdit(deck)}>
              <EditIcon sx={{ fontSize: 16 }} /> {t('cards.deck.edit')}
            </MenuItem>
            <MenuItem onClick={() => onDelete(deck)} color='danger'>
              <DeleteIcon sx={{ fontSize: 16 }} /> {t('cards.deck.delete')}
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>

      {/* Metadata Row - Compact, Single Line */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: '0.75rem' }}>
          {deckTotal} {typeLabel.toLowerCase()}
        </Typography>

        {due_cards > 0 && (
          <Typography
            level='body-sm'
            sx={{
              color: 'primary.plainColor',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {t('cards.dueLabel', { count: due_cards })}
          </Typography>
        )}
      </Box>

      {/* Optional progress bar - Ultra-thin */}
      {progress !== null && (
        <LinearProgress
          determinate
          value={progress}
          thickness={3}
          sx={{
            borderRadius: 'xs',
            mb: 1,
            bgcolor: 'background.level1'
          }}
        />
      )}

      {/* Spacer to push button to bottom */}
      <Box sx={{ flex: 1 }} />

      {/* Call to action - Minimalistic Button */}
      {!has_cards ? (
        <Button size='sm' variant='outlined' color='neutral' disabled fullWidth sx={{ fontSize: '0.75rem', py: 0.75 }}>
          {t('cards.noCardsYet')}
        </Button>
      ) : due_cards === 0 ? (
        <Button
          size='sm'
          variant='outlined'
          color='neutral'
          onClick={() => onPreview?.(deck)}
          startDecorator={<VisibilityIcon sx={{ fontSize: 14 }} />}
          fullWidth
          sx={{ fontSize: '0.75rem', py: 0.75 }}
        >
          {t('cards.preview')}
        </Button>
      ) : (
        <Button
          size='sm'
          variant='solid'
          color='primary'
          onClick={() => onStudy?.(deck)}
          fullWidth
          startDecorator={<SchoolIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: '0.75rem', py: 0.75, fontWeight: 600 }}
        >
          {t('cards.studyDue', { count: due_cards })}
        </Button>
      )}
    </Card>
  )
}
