import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeResizer } from '@xyflow/react'
import { Box, Typography } from '@mui/joy'
import StyleRounded from '@mui/icons-material/StyleRounded'
import { useBoardCanvas } from '../BoardCanvasContext'
import PlusHandles from '../PlusHandles'
import NodeTextEditor from './NodeTextEditor'
import { noteVar } from '../noteColors'
import { NOTE_MIN } from '../toFlow'
import { splitText } from '../boardEdits'
import { appear, selectedRing, wrapText } from './nodeStyles'
import { useBoardLinks } from '../../boardLinksContext'
import { focusRing } from '../../../Common/Form/formStyles'

/**
 * The "3 cards" mark (BOARD-006, PRD D7): how many cards the note made, at
 * its foot, in the note's own ink. Its click opens them.
 */
function CardsMark({ node, color }) {
  const { t } = useTranslation()
  const links = useBoardLinks()
  const count = node.cardIds.length
  return (
    <Box
      component='button'
      type='button'
      className='nodrag'
      aria-label={t('boards.note.cardsAria', { count })}
      onClick={() => links?.openCards(node)}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        border: '1px solid',
        borderColor: noteVar(color, 'border'),
        borderRadius: 'sm',
        bgcolor: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: 'xs',
        lineHeight: 'sm',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        '&:hover': { bgcolor: noteVar(color, 'border') },
        ...focusRing
      }}
    >
      <StyleRounded aria-hidden='true' sx={{ fontSize: 'sm', color: 'inherit' }} />
      {t('boards.note.cards', { count })}
    </Box>
  )
}

/**
 * A note (PRD D2): text on one of five tints, no emoji. The first line is its
 * title and reads bold; the rest is the body. It grows with its text until it
 * is resized, and the single selected note carries the four "+".
 */
function NoteNode({ id, data, selected }) {
  const { t } = useTranslation()
  const canvas = useBoardCanvas()
  const { node, editing, plus, fresh } = data
  const color = node.color ?? 'yellow'
  const { title, body } = splitText(node.text)
  const sized = node.h != null

  return (
    <>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={NOTE_MIN.w}
        minHeight={NOTE_MIN.h}
        onResizeStart={canvas.checkpoint}
        handleClassName='board-resize-handle'
        lineClassName='board-resize-line'
      />
      <PlusHandles id={id} plus={plus && !editing} />
      <Box
        data-testid={`board-note-${id}`}
        sx={{
          width: '100%',
          height: sized ? '100%' : 'auto',
          minHeight: NOTE_MIN.h,
          boxSizing: 'border-box',
          px: 1.75,
          py: 1.5,
          borderRadius: 'md',
          bgcolor: noteVar(color, 'bg'),
          color: noteVar(color, 'text'),
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          ...selectedRing(selected),
          ...(fresh ? appear : {})
        }}
      >
        {editing ? (
          <Typography level='body-md' component='div' sx={{ color: 'inherit' }}>
            <NodeTextEditor
              id={id}
              value={node.text}
              placeholder={t('boards.note.placeholder')}
              ariaLabel={t('boards.note.editAria')}
              next
            />
          </Typography>
        ) : node.text ? (
          <>
            <Typography level='title-sm' sx={wrapText}>
              {title}
            </Typography>
            {body && (
              <Typography level='body-sm' sx={wrapText}>
                {body}
              </Typography>
            )}
          </>
        ) : (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {t('boards.note.placeholder')}
          </Typography>
        )}
        {!editing && node.cardIds?.length > 0 && (
          <Box sx={{ mt: 'auto', pt: 0.75, display: 'flex' }}>
            <CardsMark node={node} color={color} />
          </Box>
        )}
      </Box>
    </>
  )
}

export default memo(NoteNode)
