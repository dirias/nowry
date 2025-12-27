import * as React from 'react'
import { Card, CardContent, Typography, Chip, Box, IconButton, Dropdown, Menu, MenuButton, MenuItem } from '@mui/joy'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function StudyCard({ card, onEdit, onDelete }) {
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
      <CardContent sx={{ position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: -5, right: -5, zIndex: 1 }}>
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
        <Typography
          level='title-md'
          sx={{
            fontWeight: 'bold',
            mb: 1,
            color: 'primary.700',
            pr: 3 // Leave space for the menu button
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

      <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {Array.isArray(card.tags) ? (
          card.tags.map((tag, idx) => (
            <Chip key={idx} size='sm' variant='solid' color='primary' sx={{ fontWeight: 'bold' }}>
              {tag}
            </Chip>
          ))
        ) : card.tags ? (
          <Chip size='sm' variant='solid' color='primary' sx={{ fontWeight: 'bold' }}>
            {card.tags}
          </Chip>
        ) : null}
      </Box>

      {/* Next Review Footer */}
      <Box
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        {card.next_review ? (
          <Typography
            level='body-xs'
            sx={{
              color: new Date(card.next_review) > new Date() ? 'success.600' : 'warning.600',
              fontWeight: '500'
            }}
          >
            📅 Next review: {formatNextReview(card.next_review)}
          </Typography>
        ) : (
          <Typography level='body-xs' sx={{ color: 'neutral.500', fontWeight: '500' }}>
            🆕 Not reviewed yet
          </Typography>
        )}
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
