import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeResizer } from '@xyflow/react'
import { Box, Typography } from '@mui/joy'
import { useBoardCanvas } from '../BoardCanvasContext'
import PlusHandles from '../PlusHandles'
import NodeTextEditor from './NodeTextEditor'
import { noteVar } from '../noteColors'
import { NOTE_MIN } from '../toFlow'
import { splitText } from '../boardEdits'
import { appear, selectedRing, wrapText } from './nodeStyles'

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
      </Box>
    </>
  )
}

export default memo(NoteNode)
