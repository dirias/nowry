import React from 'react'
import { Box, Checkbox, Dropdown, IconButton, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import DriveFileMoveRounded from '@mui/icons-material/DriveFileMoveRounded'
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded'
import { focusRing, identityTile, listRow, oneLine, readout } from '../Common/Form/formStyles'
import { MOTION } from '../../theme/tokens'
import { deckType } from '../Study/deckTypes'
import MarkToggle from './MarkToggle'
import SourceReadout from './SourceReadout'

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

const swap = `opacity ${MOTION.duration.quick}ms ${MOTION.easing.standard}`

/**
 * The tile's slot while the row is selectable (PRD D16): the tile at rest, a
 * checkbox on hover, on focus-within, and whenever a selection exists. Both
 * live in one 16px box; the row's own sx swaps them, so nothing beside the
 * slot moves. The checkbox is not a target at rest — a phone has no hover,
 * and there a long press is what starts a selection.
 */
const slotSx = (revealed) => ({
  '& .card-tile': { opacity: revealed ? 0 : 1, transition: swap },
  '& .card-check': {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: revealed ? 1 : 0,
    pointerEvents: revealed ? 'auto' : 'none',
    transition: swap
  },
  '&:hover .card-tile, &:focus-within .card-tile': { opacity: 0 },
  '&:hover .card-check, &:focus-within .card-check': { opacity: 1, pointerEvents: 'auto' }
})

// Joy puts `Mui-focusVisible` on the checkbox root when its input has focus.
const checkSx = { '&.Mui-focusVisible': focusRing['&:focus-visible'] }

/**
 * `showSource` — the Struggling group's rows carry the source as a link (D7):
 * the card the learner keeps failing reopens the notes it was made from.
 *
 * `selectable` adds the checkbox to the tile's slot; `selected` grounds the
 * row on `level1`; while `selecting` the row's click toggles instead of
 * previewing. `longPressHandlers` come from `useCardSelection` (a phone).
 */
export default function CardRow({
  card,
  deckName,
  onPreview,
  onEdit,
  onMove,
  onEditTags,
  onDelete,
  onMarkChange,
  showSource = false,
  selectable = false,
  selected = false,
  selecting = false,
  onSelect,
  longPressHandlers
}) {
  const { t } = useTranslation()
  const type = deckType(card.card_type)
  const title = card.title || ''
  const tags = (card.tags || []).map((tag) => `#${tag}`).join(' ')
  const meta = [deckName, formatNextReview(t, card.next_review), tags].filter(Boolean).join(' · ')
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn?.(card)
  }
  const activate = () => (selectable && selecting ? onSelect?.(card) : onPreview?.(card))
  const revealed = selectable && (selecting || selected)

  return (
    <Box
      data-testid='card-row'
      role='button'
      tabIndex={0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      }}
      {...(selectable ? longPressHandlers?.(card._id) : {})}
      sx={{
        ...listRow,
        cursor: 'pointer',
        ...(selected ? { bgcolor: 'background.level1' } : {}),
        ...(selectable ? slotSx(revealed) : {})
      }}
    >
      {selectable ? (
        <Box sx={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
          <Box className='card-tile' aria-hidden='true' sx={identityTile(type.color)} />
          <Box className='card-check'>
            <Checkbox
              size='sm'
              checked={selected}
              onChange={() => onSelect?.(card)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              slotProps={{ input: { 'aria-label': t('cards.select.rowAria', { title }) } }}
              sx={checkSx}
            />
          </Box>
        </Box>
      ) : (
        <Box aria-hidden='true' sx={identityTile(type.color)} />
      )}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='title-sm' sx={oneLine}>
          {card.title || t('cards.manage_content.untitled')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...readout, fontSize: 'xs', ...oneLine }}>
          {meta}
        </Typography>
        {showSource && <SourceReadout card={card} link />}
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
                'aria-label': t('cards.manage_content.aria.cardActions', { title })
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
            <MenuItem onClick={stop(onMove)} sx={focusRing}>
              <ListItemDecorator>
                <DriveFileMoveRounded />
              </ListItemDecorator>
              {t('cards.select.moveOne')}
            </MenuItem>
            <MenuItem onClick={stop(onEditTags)} sx={focusRing}>
              <ListItemDecorator>
                <LocalOfferRounded />
              </ListItemDecorator>
              {t('cards.select.editTags')}
            </MenuItem>
            <ListDivider />
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
