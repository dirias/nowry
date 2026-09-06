import React from 'react'
import { Box, Dropdown, IconButton, ListItemDecorator, Menu, MenuButton, MenuItem, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import { focusRing, identityTile, listRow, oneLine, readout } from '../Common/Form/formStyles'
import { deckType } from '../Study/deckTypes'
import MarkToggle from './MarkToggle'

/**
 * A card as one row (PRD US-003): type tile · title with one meta line
 * (deck · next review · tags) · the Mark control, visible · edit and delete in
 * a kebab. No emoji, no always-on icon buttons (§13.4), no chips (§15.11).
 * Click previews; the actions stop the click.
 */
export function formatNextReview(t, iso) {
  if (!iso) return t('cards.manage_content.reviewNew')
  const diffMs = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diffMs)) return ''
  if (diffMs <= 0) return t('cards.manage_content.nextReview.dueNow')
  const hours = Math.round(diffMs / (1000 * 60 * 60))
  if (hours < 1) return t('cards.manage_content.nextReview.lessThanHour')
  if (hours < 24) return t('cards.manage_content.nextReview.inHours', { count: hours })
  const days = Math.round(hours / 24)
  if (days === 1) return t('cards.manage_content.nextReview.tomorrow')
  return t('cards.manage_content.nextReview.inDays', { count: days })
}

export default function CardRow({ card, deckName, onPreview, onEdit, onDelete, onMarkChange }) {
  const { t } = useTranslation()
  const type = deckType(card.card_type)
  const tags = (card.tags || []).map((tag) => `#${tag}`).join(' ')
  const meta = [deckName, formatNextReview(t, card.next_review), tags].filter(Boolean).join(' · ')
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn?.(card)
  }
  return (
    <Box
      data-testid='card-row'
      role='button'
      tabIndex={0}
      onClick={() => onPreview?.(card)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPreview?.(card)
        }
      }}
      sx={{ ...listRow, cursor: 'pointer' }}
    >
      <Box aria-hidden='true' sx={identityTile(type.color)} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='title-sm' sx={oneLine}>
          {card.title || t('cards.manage_content.untitled')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...readout, fontSize: 'xs', ...oneLine }}>
          {meta}
        </Typography>
      </Box>
      <Box onClick={(event) => event.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <MarkToggle card={card} onMarkChange={onMarkChange} />
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                color: 'neutral',
                size: 'sm',
                'aria-label': t('cards.manage_content.aria.cardActions', { title: card.title || '' })
              }
            }}
          >
            <MoreVertRounded />
          </MenuButton>
          <Menu placement='bottom-end' size='sm' sx={{ minWidth: 180, borderRadius: 'md', p: 0.5 }}>
            <MenuItem onClick={stop(onEdit)} sx={focusRing}>
              <ListItemDecorator>
                <EditRounded />
              </ListItemDecorator>
              {t('cards.deck.edit')}
            </MenuItem>
            <MenuItem onClick={stop(onDelete)} color='danger' sx={focusRing}>
              <ListItemDecorator>
                <DeleteRounded />
              </ListItemDecorator>
              {t('cards.deck.delete')}
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>
    </Box>
  )
}
