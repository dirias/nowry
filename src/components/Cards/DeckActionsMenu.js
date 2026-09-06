import React from 'react'
import { Chip, Dropdown, IconButton, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'
import PsychologyRounded from '@mui/icons-material/PsychologyRounded'
import LockRounded from '@mui/icons-material/LockRounded'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The one menu behind every deck's kebab — tile and list row alike (PRD D3).
 * It used to be written twice, once per shape; one deck, one menu.
 */
export default function DeckActionsMenu({
  deck,
  onAddCard,
  onDeckSettings,
  onEditDeck,
  onPublishDeck,
  onAnalyzeDeck,
  onDeleteDeck,
  tier,
  openUpgradeModal,
  className
}) {
  const { t } = useTranslation()
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn?.(deck)
  }
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
            'aria-label': t('cards.manage_content.aria.deckActions', { name: deck.name }),
            onClick: (event) => event.stopPropagation()
          }
        }}
      >
        <MoreVertRounded />
      </MenuButton>
      <Menu placement='bottom-end' size='sm' sx={{ minWidth: 220, borderRadius: 'md', p: 0.5 }}>
        <MenuItem onClick={stop(onAddCard)} sx={focusRing}>
          <ListItemDecorator>
            <AddRounded />
          </ListItemDecorator>
          {t('cards.deck.addCard')}
        </MenuItem>
        <MenuItem onClick={stop(onDeckSettings)} sx={focusRing}>
          <ListItemDecorator>
            <SettingsRounded />
          </ListItemDecorator>
          {t('deckSettings.menuItem')}
        </MenuItem>
        <MenuItem onClick={stop(onEditDeck)} sx={focusRing}>
          <ListItemDecorator>
            <EditRounded />
          </ListItemDecorator>
          {t('cards.deck.edit')}
        </MenuItem>
        <ListDivider />
        <MenuItem onClick={stop(onPublishDeck)} sx={focusRing}>
          <ListItemDecorator>
            {deck.is_public ? <PublicRounded sx={{ color: 'success.plainColor' }} /> : <CloudUploadRounded />}
          </ListItemDecorator>
          {t(deck.is_public ? 'publish.manageButton' : 'publish.publishButton')}
        </MenuItem>
        {tier === 'pro' ? (
          <MenuItem onClick={stop(() => onAnalyzeDeck?.(deck._id))} aria-label={t('aiMagic.analyzeDeck.ariaLabel')} sx={focusRing}>
            <ListItemDecorator>
              <PsychologyRounded />
            </ListItemDecorator>
            {t('aiMagic.analyzeDeck.label')}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={stop(() => openUpgradeModal?.(t('upgrade.headlines.analyzeDeck')))}
            aria-label={t('aiMagic.analyzeDeck.lockedAriaLabel')}
            sx={focusRing}
          >
            <ListItemDecorator>
              <LockRounded />
            </ListItemDecorator>
            {t('aiMagic.analyzeDeck.label')}
            <Chip size='sm' color='warning' variant='soft' sx={{ ml: 'auto' }}>
              {t('plans.pro')}
            </Chip>
          </MenuItem>
        )}
        <ListDivider />
        <MenuItem onClick={stop(onDeleteDeck)} color='danger' sx={focusRing}>
          <ListItemDecorator>
            <DeleteRounded />
          </ListItemDecorator>
          {t('cards.deck.delete')}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}
