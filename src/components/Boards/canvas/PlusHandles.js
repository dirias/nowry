import React from 'react'
import { useTranslation } from 'react-i18next'
import { Handle, Position } from '@xyflow/react'
import AddRounded from '@mui/icons-material/AddRounded'
import { useBoardCanvas } from './BoardCanvasContext'

const SIDES = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left]
]

/**
 * A node's four connection points (PRD D3). At rest they are hidden; on hover
 * they show as accent dots you can drag a link from. On the single selected
 * note they become the four "+": a click makes a linked note on that side,
 * already typing; a drag starts a link like any handle. The canvas styles
 * them by class (`board-handle`, `board-plus`, `board-handle-off`).
 *
 * Every node carries them even where they never show (a frame), because the
 * library draws a link only between nodes that have a handle.
 */
export default function PlusHandles({ id, plus = false, connectable = true }) {
  const { t } = useTranslation()
  const canvas = useBoardCanvas()
  return SIDES.map(([side, position]) => {
    if (!plus) {
      return (
        <Handle
          key={side}
          id={side}
          type='source'
          position={position}
          isConnectable={connectable}
          className={connectable ? 'board-handle' : 'board-handle-off'}
        />
      )
    }
    return (
      <Handle
        key={side}
        id={side}
        type='source'
        position={position}
        className='board-plus'
        role='button'
        tabIndex={-1}
        aria-label={t(`boards.plus.${side}`)}
        onClick={(event) => {
          event.stopPropagation()
          canvas.makeChild(id, side)
        }}
      >
        <AddRounded aria-hidden='true' />
      </Handle>
    )
  })
}
