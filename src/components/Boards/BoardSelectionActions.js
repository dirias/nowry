import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button } from '@mui/joy'
import StyleRounded from '@mui/icons-material/StyleRounded'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import { useBoardLinks } from './boardLinksContext'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The selection bar's study and planning actions (PRD D7, Board and Study
 * boards): Make cards and Make items, for the notes in the selection. Fills
 * the bar's `actions` slot through `BoardCanvas`'s `selectionActions`.
 */
export default function BoardSelectionActions({ nodes }) {
  const { t } = useTranslation()
  const links = useBoardLinks()
  const notes = nodes.filter((n) => n.kind === 'note')
  if (!links || !notes.length) return null
  return (
    <>
      <Button
        size='sm'
        variant='plain'
        color='neutral'
        startDecorator={<StyleRounded />}
        onClick={() => links.makeCards(notes)}
        sx={focusRing}
      >
        {t('boards.selection.makeCards')}
      </Button>
      <Button
        size='sm'
        variant='plain'
        color='neutral'
        startDecorator={<TaskAltRounded />}
        loading={links.makingItems}
        loadingPosition='start'
        onClick={() => links.makeItems(notes)}
        sx={focusRing}
      >
        {t('boards.selection.makeItems', { count: notes.length })}
      </Button>
      <Box aria-hidden='true' sx={{ width: '1px', height: 20, mx: 0.25, bgcolor: 'divider' }} />
    </>
  )
}

/** For `BoardCanvas`'s `selectionActions`: the actions for what is selected. */
export const boardSelectionActions = (nodes) => <BoardSelectionActions nodes={nodes} />
