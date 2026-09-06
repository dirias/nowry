import React from 'react'
import { Dropdown, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import AddRounded from '@mui/icons-material/AddRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import NoteAddRounded from '@mui/icons-material/NoteAddRounded'
import FileUploadRounded from '@mui/icons-material/FileUploadRounded'
import { focusRing } from '../Common/Form/formStyles'

/**
 * "Add ▾" on the title row (docs/prd-books-library.md D3): the two ways a
 * document enters the library, always both, as one secondary key.
 */
export default function AddMenu({ onNew, onImport }) {
  const { t } = useTranslation()
  return (
    <Dropdown>
      <MenuButton
        variant='soft'
        color='neutral'
        startDecorator={<AddRounded />}
        endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
        aria-label={t('books.lib.addAria')}
      >
        {t('books.lib.add')}
      </MenuButton>
      <Menu placement='bottom-end' sx={{ minWidth: 200, borderRadius: 'md', p: 0.5 }}>
        <MenuItem onClick={onNew} sx={{ borderRadius: 'sm', ...focusRing }}>
          <ListItemDecorator>
            <NoteAddRounded />
          </ListItemDecorator>
          {t('books.lib.newDocument')}
        </MenuItem>
        <ListDivider />
        <MenuItem onClick={onImport} sx={{ borderRadius: 'sm', ...focusRing }}>
          <ListItemDecorator>
            <FileUploadRounded />
          </ListItemDecorator>
          {t('books.lib.importFiles')}
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}
