import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Dropdown, IconButton, Input, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem, Typography } from '@mui/joy'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import PersonAddAlt1Rounded from '@mui/icons-material/PersonAddAlt1Rounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import BoardOutline from './BoardOutline'
import { metaLine } from './boardMeta'
import { afterMenu } from './menuFocus'
import { focusRing, oneLine, tabularNums } from '../Common/Form/formStyles'

/** The name in the tile, being renamed: Enter or a click away keeps it, Esc leaves it. */
function TileNameInput({ name, onDone }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(name)
  const done = useRef(false)
  const finish = (keep) => {
    if (done.current) return
    done.current = true
    const next = value.trim()
    onDone(keep && next && next !== name ? next : null)
  }
  return (
    <Input
      size='sm'
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(true)
        if (event.key === 'Escape') finish(false)
      }}
      slotProps={{ input: { 'aria-label': t('boards.rename.label'), maxLength: 200 } }}
    />
  )
}

/**
 * One board on the boards page (PRD D1, canvas board 1): its outline, its
 * name, and one meta line. The tile opens the board; its menu renames in
 * place, duplicates, shares and deletes. Share and Delete are the owner's.
 */
export default function BoardTile({ board, onOpen, onRename, onDuplicate, onShare, onDelete }) {
  const { t, i18n } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const name = board.name || t('boards.untitled')
  const open = () => !renaming && onOpen(board)
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn()
  }

  return (
    <Box
      role='link'
      tabIndex={0}
      data-testid='board-tile'
      aria-label={t('boards.tile.open', { name })}
      onClick={open}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'lg',
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color var(--nowry-motion-quick) var(--nowry-motion-standard)',
        '&:hover': { borderColor: 'neutral.outlinedHoverBorder' },
        ...focusRing
      }}
    >
      <BoardOutline outline={board.outline} />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 1.75,
          pt: 1.5,
          pb: 1.75,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.375 }}>
          {renaming ? (
            <TileNameInput
              name={name}
              onDone={(next) => {
                setRenaming(false)
                if (next) onRename(board, next)
              }}
            />
          ) : (
            <Typography level='title-md' sx={oneLine}>
              {name}
            </Typography>
          )}
          <Typography level='body-xs' sx={{ color: 'text.tertiary', ...tabularNums }}>
            {metaLine(t, board, { locale: i18n?.language || 'en' })}
          </Typography>
        </Box>
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                color: 'neutral',
                size: 'sm',
                'aria-label': t('boards.tile.menu', { name }),
                onClick: (event) => event.stopPropagation(),
                onKeyDown: (event) => event.stopPropagation(),
                sx: { mr: -0.75, mt: -0.25, ...focusRing }
              }
            }}
          >
            <MoreVertRounded />
          </MenuButton>
          <Menu placement='bottom-end' size='sm' sx={{ minWidth: 200, borderRadius: 'md', p: 0.5 }}>
            <MenuItem onClick={stop(afterMenu(() => setRenaming(true)))}>
              <ListItemDecorator>
                <EditRounded />
              </ListItemDecorator>
              {t('boards.menu.rename')}
            </MenuItem>
            <MenuItem onClick={stop(() => onDuplicate(board))}>
              <ListItemDecorator>
                <ContentCopyRounded />
              </ListItemDecorator>
              {t('boards.menu.duplicate')}
            </MenuItem>
            {board.isOwner && (
              <MenuItem onClick={stop(() => onShare(board))}>
                <ListItemDecorator>
                  <PersonAddAlt1Rounded />
                </ListItemDecorator>
                {t('boards.menu.share')}
              </MenuItem>
            )}
            {board.isOwner && <ListDivider />}
            {board.isOwner && (
              <MenuItem color='danger' onClick={stop(() => onDelete(board))}>
                <ListItemDecorator>
                  <DeleteOutlineRounded />
                </ListItemDecorator>
                {t('boards.menu.delete')}
              </MenuItem>
            )}
          </Menu>
        </Dropdown>
      </Box>
    </Box>
  )
}
