import React from 'react'
import { Box, Button, Dropdown, IconButton, MenuButton, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import CloseRounded from '@mui/icons-material/CloseRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import Bookmark from '@mui/icons-material/Bookmark'
import BookmarkBorder from '@mui/icons-material/BookmarkBorder'
import { focusRing, tabularNums } from '../Common/Form/formStyles'
import TagMenu from './TagMenu'

/**
 * The toolbar's replacement while a selection exists (PRD D16, ADR-023 point
 * 2): ✕ · "N selected" · Move to · Tag ▾ · Mark / Unmark · Delete … Select
 * all N. Same outer box, same rail, same control height as the toolbar it
 * stands in for, so the list never moves. No solid key: every verb acts on
 * the same object and none is primary; Delete is a secondary in danger ink.
 *
 * `allMarked` flips Mark to Unmark when every selected card carries the mark
 * (ADR-010 keeps that one axis: the bar never grades). `total` is what is
 * loaded in the view — the bar selects what is on screen, never past it.
 */
export default function SelectionBar({
  selectedCards = [],
  total = 0,
  availableTags = [],
  onClear,
  onSelectAll,
  onMove,
  onTag,
  onUntag,
  onMark,
  onUnmark,
  onDelete,
  sx
}) {
  const { t } = useTranslation()
  const count = selectedCards.length
  const allMarked = count > 0 && selectedCards.every((card) => Boolean(card.marked_at))

  return (
    <Box
      data-testid='selection-bar'
      role='toolbar'
      aria-label={t('cards.select.barAria')}
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 3, minHeight: 40, ...sx }}
    >
      <IconButton variant='soft' color='neutral' aria-label={t('cards.select.clear')} onClick={onClear} sx={focusRing}>
        <CloseRounded />
      </IconButton>
      <Typography level='title-sm' sx={tabularNums}>
        {t('cards.select.count', { count })}
      </Typography>
      <Box aria-hidden='true' sx={{ width: '1px', height: 20, bgcolor: 'divider', flexShrink: 0 }} />

      <Button variant='soft' color='neutral' onClick={onMove} sx={focusRing}>
        {t('cards.select.moveTo')}
      </Button>
      <Dropdown>
        <MenuButton
          variant='soft'
          color='neutral'
          endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
          aria-label={t('cards.select.tagAria')}
          sx={focusRing}
        >
          {t('cards.select.tag')}
        </MenuButton>
        <TagMenu selectedCards={selectedCards} availableTags={availableTags} onAdd={onTag} onRemove={onUntag} />
      </Dropdown>
      <Button
        variant='soft'
        color='neutral'
        startDecorator={allMarked ? <Bookmark /> : <BookmarkBorder />}
        onClick={allMarked ? onUnmark : onMark}
        sx={focusRing}
      >
        {allMarked ? t('cards.select.unmark') : t('cards.mark.action')}
      </Button>
      <Button variant='soft' color='neutral' onClick={onDelete} sx={{ color: 'danger.plainColor', ...focusRing }}>
        {t('cards.deck.delete')}
      </Button>

      <Button
        variant='plain'
        color='neutral'
        onClick={onSelectAll}
        disabled={count >= total}
        sx={{ ml: 'auto', ...tabularNums, ...focusRing }}
      >
        {t('cards.select.all', { count: total })}
      </Button>
    </Box>
  )
}
