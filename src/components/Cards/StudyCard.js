import * as React from 'react'
import { Card, CardContent, Typography, Chip, Box, IconButton, Dropdown, Menu, MenuButton, MenuItem } from '@mui/joy'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

import QuizIcon from '@mui/icons-material/Quiz'
import StyleIcon from '@mui/icons-material/Style'
import ImageIcon from '@mui/icons-material/Image'

export default function StudyCard({ card, onEdit, onDelete }) {
  const isQuiz = card.card_type === 'quiz' || (Array.isArray(card.tags) && card.tags.includes('quiz'))
  const isVisual = card.card_type === 'visual'

  let accentColor = 'primary.500'
  let hoverColor = 'primary.softBg'
  let Icon = StyleIcon
  let previewText = card.content

  if (isQuiz) {
    accentColor = 'warning.400'
    hoverColor = 'warning.softBg'
    Icon = QuizIcon
    previewText = 'Multiple Choice Question'
  } else if (isVisual) {
    accentColor = 'success.400'
    hoverColor = 'success.softBg'
    Icon = ImageIcon
    previewText = `AI Diagram (${card.diagram_type || 'Mermaid'})`
  }

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
        py: 2,
        borderRadius: 'lg',
        borderColor: 'neutral.outlinedBorder',
        borderLeft: '4px solid',
        borderLeftColor: accentColor,
        boxShadow: 'sm',
        backgroundColor: 'white',
        transition: '0.3s ease',
        '&:hover': {
          boxShadow: 'md',
          transform: 'translateY(-2px)',
          backgroundColor: hoverColor
        }
      }}
    >
      <CardContent sx={{ position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: -8, right: -10, zIndex: 1 }}>
          <Dropdown>
            <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}>
              <MoreVertIcon />
            </MenuButton>
            <Menu placement='bottom-end'>
              <MenuItem onClick={() => onEdit(card)}>
                <EditIcon /> Editar
              </MenuItem>
              <MenuItem onClick={() => onDelete(card)} variant='soft' color='danger'>
                <DeleteIcon /> Eliminar
              </MenuItem>
            </Menu>
          </Dropdown>
        </Box>

        {/* Type Icon & Title */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1, pr: 3 }}>
          <Box sx={{ color: accentColor, mt: 0.3 }}>
            <Icon fontSize='small' />
          </Box>
          <Typography
            level='title-sm'
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.95rem'
            }}
          >
            {card.title}
          </Typography>
        </Box>

        {/* Answer/Content Preview */}
        <Typography
          level='body-xs'
          sx={{
            color: 'text.tertiary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontStyle: 'italic'
          }}
        >
          {previewText}
        </Typography>
      </CardContent>

      <Box mt='auto' pt={2}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
          {Array.isArray(card.tags) &&
            card.tags.slice(0, 2).map((tag, idx) => (
              <Chip key={idx} size='sm' variant='soft' color='neutral' sx={{ fontSize: '10px' }}>
                #{tag}
              </Chip>
            ))}
        </Box>

        {/* Next Review Footer */}
        <Box
          sx={{
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {card.next_review ? (
            <Typography
              level='body-xs'
              sx={{
                color: new Date(card.next_review) > new Date() ? 'success.600' : 'warning.600',
                fontWeight: '600',
                fontSize: '11px'
              }}
            >
              {formatNextReview(card.next_review)}
            </Typography>
          ) : (
            <Typography level='body-xs' sx={{ color: 'neutral.400', fontWeight: '500', fontSize: '11px' }}>
              New Card
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

// Helper function to format relative time
function formatNextReview(nextReviewDate) {
  const now = new Date()
  const next = new Date(nextReviewDate)
  const diffMs = next - now
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffMs < 0) {
    return 'Due now!'
  } else if (diffHours < 1) {
    return 'in less than 1 hour'
  } else if (diffHours < 24) {
    return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`
  } else if (diffDays === 1) {
    return 'tomorrow'
  } else {
    return `in ${diffDays} days`
  }
}
