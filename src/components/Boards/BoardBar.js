import React, { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Dropdown,
  IconButton,
  Input,
  ListDivider,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Tooltip,
  Typography
} from '@mui/joy'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import PersonAddAlt1Rounded from '@mui/icons-material/PersonAddAlt1Rounded'
import PersonRounded from '@mui/icons-material/PersonRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import KeyboardRounded from '@mui/icons-material/KeyboardRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { focusRing, oneLine } from '../Common/Form/formStyles'
import { afterMenu } from './menuFocus'

/** "Saving…" shows only once a save has run this long, so a quick save never flickers. */
export const SAVING_DELAY = 400

/** A flag that turns on only after it has been on for `delay` ms, and off at once. */
const useSettled = (flag, delay) => {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!flag) {
      setSettled(false)
      return undefined
    }
    const timer = setTimeout(() => setSettled(true), delay)
    return () => clearTimeout(timer)
  }, [flag, delay])
  return flag && settled
}

/**
 * Saving you can see (PRD D4): "Saving…" while changes wait or travel, "Saved"
 * once they land, "Not saved · retrying" in the warning tone when a save
 * failed and the queue is trying again. Read out politely as it changes.
 */
export function SaveStatus({ status, hasPending }) {
  const { t } = useTranslation()
  const failed = status === 'error'
  const busy = !failed && (status === 'saving' || hasPending)
  const saving = useSettled(busy, SAVING_DELAY)
  const state = failed ? 'notSaved' : saving ? 'saving' : 'saved'

  return (
    <Typography
      level='body-sm'
      aria-live='polite'
      data-testid='board-save-status'
      data-state={state}
      startDecorator={
        state === 'saved' ? (
          <CheckRounded sx={{ color: 'primary.plainColor', width: 16, height: 16 }} />
        ) : state === 'notSaved' ? (
          <ErrorOutlineRounded sx={{ width: 16, height: 16 }} />
        ) : null
      }
      sx={{ color: failed ? 'warning.plainColor' : 'text.tertiary', whiteSpace: 'nowrap', flexShrink: 0 }}
    >
      {t(`boards.bar.${state}`)}
    </Typography>
  )
}

/** The name, renamed in place: click to edit, Enter or a click away keeps it, Esc leaves it. */
function BoardName({ name, editing, onEdit, onRename, onDone }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(name)
  const done = useRef(false)

  useEffect(() => {
    if (editing) {
      setValue(name)
      done.current = false
    }
  }, [editing, name])

  const finish = (keep) => {
    if (done.current) return
    done.current = true
    const next = value.trim()
    if (keep && next && next !== name) onRename(next)
    onDone()
  }

  if (editing) {
    return (
      <Input
        size='sm'
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') finish(true)
          if (event.key === 'Escape') finish(false)
        }}
        slotProps={{ input: { 'aria-label': t('boards.rename.label'), maxLength: 200 } }}
        sx={{ minWidth: { xs: 140, sm: 240 }, maxWidth: 420, fontWeight: 'lg' }}
      />
    )
  }
  return (
    <Box
      component='button'
      type='button'
      onClick={onEdit}
      aria-label={t('boards.bar.renameAria', { name })}
      sx={{
        minWidth: 0,
        border: 0,
        bgcolor: 'transparent',
        color: 'text.primary',
        font: 'inherit',
        p: 0.5,
        mx: -0.5,
        borderRadius: 'sm',
        cursor: 'text',
        textAlign: 'left',
        '&:hover': { bgcolor: 'background.level1' },
        ...focusRing
      }}
    >
      <Typography level='title-md' component='span' sx={oneLine} data-testid='board-name'>
        {name}
      </Typography>
    </Box>
  )
}

/** The people a board is shared with (BOARD-007). The list carries ids, not names, so each is a person glyph. */
function Collaborators({ count }) {
  const { t } = useTranslation()
  const label = t('boards.bar.collaborators', { count })
  const shown = Math.min(count, 3)
  return (
    <Tooltip title={label} size='sm'>
      <AvatarGroup size='sm' role='img' aria-label={label} sx={{ '--Avatar-size': '28px', '--AvatarGroup-gap': '-6px' }}>
        {Array.from({ length: shown }, (_, i) => (
          <Avatar key={i} variant='soft' color='neutral'>
            <PersonRounded />
          </Avatar>
        ))}
        {count > shown && (
          <Avatar variant='soft' color='neutral'>
            +{count - shown}
          </Avatar>
        )}
      </AvatarGroup>
    </Tooltip>
  )
}

/**
 * The board bar (BOARD-003, canvas board 2): where you are, what the board is
 * called, whether it is kept, and who it is shared with. Its keys are
 * secondary — the board itself is the page's work, so it has no solid key
 * (ADR-020). Import and Export join the menu with BOARD-008/009.
 */
export default function BoardBar({
  name,
  status,
  hasPending,
  collaborators = 0,
  canShare,
  canDelete,
  onRename,
  onShare,
  onDuplicate,
  onDelete,
  onShowKeys
}) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)

  return (
    <Box
      component='header'
      sx={{
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        px: { xs: 1, sm: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        flexShrink: 0
      }}
    >
      <Button component={RouterLink} to='/boards' variant='plain' color='neutral' size='sm' startDecorator={<ChevronLeftRounded />}>
        {t('boards.bar.back')}
      </Button>
      <Box aria-hidden='true' sx={{ width: '1px', height: 20, bgcolor: 'divider', flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <BoardName name={name} editing={renaming} onEdit={() => setRenaming(true)} onRename={onRename} onDone={() => setRenaming(false)} />
        <SaveStatus status={status} hasPending={hasPending} />
      </Box>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {collaborators > 0 && <Collaborators count={collaborators} />}
        {canShare && (
          <Button variant='soft' color='neutral' size='sm' startDecorator={<PersonAddAlt1Rounded />} onClick={onShare}>
            {t('boards.bar.share')}
          </Button>
        )}
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm', 'aria-label': t('boards.bar.more'), sx: focusRing } }}
          >
            <MoreHorizRounded />
          </MenuButton>
          <Menu placement='bottom-end' size='sm' sx={{ minWidth: 220, borderRadius: 'md', p: 0.5 }}>
            <MenuItem onClick={afterMenu(() => setRenaming(true))}>
              <ListItemDecorator>
                <EditRounded />
              </ListItemDecorator>
              {t('boards.menu.rename')}
            </MenuItem>
            <MenuItem onClick={onDuplicate}>
              <ListItemDecorator>
                <ContentCopyRounded />
              </ListItemDecorator>
              {t('boards.menu.duplicate')}
            </MenuItem>
            <MenuItem onClick={onShowKeys}>
              <ListItemDecorator>
                <KeyboardRounded />
              </ListItemDecorator>
              {t('boards.menu.keys')}
            </MenuItem>
            {canDelete && <ListDivider />}
            {canDelete && (
              <MenuItem color='danger' onClick={onDelete}>
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
