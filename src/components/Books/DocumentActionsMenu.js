import React from 'react'
import { Chip, Dropdown, IconButton, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import HeadphonesRounded from '@mui/icons-material/HeadphonesRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import LockRounded from '@mui/icons-material/LockRounded'
import { focusRing } from '../Common/Form/formStyles'
import { kindOf } from './libraryQuery'

/**
 * The one menu behind every document's kebab, row and tile alike
 * (docs/prd-books-library.md D9, D10): Open · Listen (imports) · Make cards ·
 * Make a quiz · Edit details · Delete…. Generation and Listen are what the plan
 * buys, so on a free account they keep their label and carry the plan (§10).
 */
export default function DocumentActionsMenu({
  book,
  tier = 'free',
  onOpen,
  onListen,
  onMakeCards,
  onMakeQuiz,
  onEdit,
  onDelete,
  onUpgrade,
  className
}) {
  const { t } = useTranslation()
  const locked = tier === 'free'
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn?.(book)
  }
  const paid = (labelKey, Icon, handler, feature) =>
    locked ? (
      <MenuItem onClick={stop(() => onUpgrade?.(feature))} aria-label={t(`${labelKey}LockedAria`)} sx={focusRing}>
        <ListItemDecorator>
          <LockRounded />
        </ListItemDecorator>
        {t(labelKey)}
        <Chip size='sm' color='warning' variant='soft' sx={{ ml: 'auto' }}>
          {t('plans.plus')}
        </Chip>
      </MenuItem>
    ) : (
      <MenuItem onClick={stop(handler)} sx={focusRing}>
        <ListItemDecorator>
          <Icon />
        </ListItemDecorator>
        {t(labelKey)}
      </MenuItem>
    )

  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        slotProps={{
          root: {
            variant: 'plain',
            color: 'neutral',
            size: 'sm',
            className,
            'aria-label': t('books.lib.menuAria', { title: book.title || '' }),
            onClick: (event) => event.stopPropagation()
          }
        }}
      >
        <MoreVertRounded />
      </MenuButton>
      <Menu placement='bottom-end' size='sm' sx={{ minWidth: 220, borderRadius: 'md', p: 0.5 }}>
        <MenuItem onClick={stop(onOpen)} sx={focusRing}>
          <ListItemDecorator>
            <OpenInNewRounded />
          </ListItemDecorator>
          {t('books.lib.open')}
        </MenuItem>
        {kindOf(book) === 'imported' && paid('books.lib.listen', HeadphonesRounded, onListen, 'listen')}
        {paid('books.lib.makeCards', StyleRounded, onMakeCards, 'makeCards')}
        {paid('books.lib.makeQuiz', QuizRounded, onMakeQuiz, 'quiz')}
        <MenuItem onClick={stop(onEdit)} sx={focusRing}>
          <ListItemDecorator>
            <EditRounded />
          </ListItemDecorator>
          {t('books.lib.editDetails')}
        </MenuItem>
        <ListDivider />
        <MenuItem onClick={stop(onDelete)} color='danger' sx={focusRing}>
          <ListItemDecorator>
            <DeleteRounded />
          </ListItemDecorator>
          {t('books.lib.deleteAction')}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}
