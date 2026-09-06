import React, { useState } from 'react'
import { Input, ListDivider, Menu, MenuItem, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import CheckRounded from '@mui/icons-material/CheckRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { focusRing, tabularNums } from '../Common/Form/formStyles'

const menuSx = { minWidth: 260, maxHeight: 360, overflow: 'auto', borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }

/** every | some | none — how many of the selected cards carry `tag`. */
export function tagState(cards, tag) {
  const carrying = cards.filter((card) => (card.tags || []).includes(tag)).length
  if (carrying === 0) return 'none'
  return carrying === cards.length ? 'every' : 'some'
}

/**
 * The selection bar's Tag ▾ (PRD D16, US-009): a field for a new tag, then the
 * user's tags as tri-state rows — a check where every selected card carries
 * the tag, a dash where some do, nothing where none. Clicking a full check
 * takes the tag off the selection; anything else puts it on. The menu stays
 * open across clicks, as the toolbar's filter menus do, because tagging is
 * usually more than one tag.
 *
 * Styled exactly as the toolbar's own menus — radius `md`, 4px inset, rows
 * at radius `sm` — so the two read as one family.
 */
export default function TagMenu({ selectedCards = [], availableTags = [], onAdd, onRemove }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const keepOpen = (handler) => (event) => {
    handler()
    event.defaultMuiPrevented = true
  }
  // Joy's menu listens on its root for arrows and typeahead; a keystroke in
  // the field must not reach it, or typing "v" would move focus to "verbs".
  // Escape still bubbles so the menu closes as it does from any row.
  const submitDraft = (event) => {
    if (event.key !== 'Escape') event.stopPropagation()
    if (event.key !== 'Enter') return
    event.preventDefault()
    const tag = draft.trim()
    if (!tag) return
    onAdd?.(tag)
    setDraft('')
  }

  return (
    <Menu placement='bottom-start' data-testid='tag-menu' sx={menuSx}>
      <Input
        size='sm'
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={submitDraft}
        placeholder={t('cards.select.newTag')}
        aria-label={t('cards.select.newTag')}
        variant='soft'
        color='neutral'
        sx={{ m: 0.5, mb: 1, bgcolor: 'background.level1', boxShadow: 'none', '&::before': { boxShadow: 'none' }, ...focusRing }}
      />
      {availableTags.length > 0 && <ListDivider />}
      {availableTags.map(({ tag, count }) => {
        const state = tagState(selectedCards, tag)
        const every = state === 'every'
        return (
          <MenuItem
            key={tag}
            role='menuitemcheckbox'
            aria-checked={every ? 'true' : state === 'some' ? 'mixed' : 'false'}
            onClick={keepOpen(() => (every ? onRemove?.(tag) : onAdd?.(tag)))}
            sx={itemSx}
          >
            <Typography level='body-sm' sx={{ color: every ? 'text.primary' : 'text.secondary', fontWeight: every ? 'lg' : 'md' }}>
              {tag}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 1, ...tabularNums }}>
              {count}
            </Typography>
            {every && <CheckRounded fontSize='small' data-testid='tag-every' sx={{ ml: 'auto', color: 'primary.plainColor' }} />}
            {state === 'some' && <RemoveRounded fontSize='small' data-testid='tag-some' sx={{ ml: 'auto', color: 'text.tertiary' }} />}
          </MenuItem>
        )
      })}
    </Menu>
  )
}
