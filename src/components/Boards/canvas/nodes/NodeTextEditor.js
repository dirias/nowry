import React, { useRef } from 'react'
import { Textarea } from '@mui/joy'
import { useBoardCanvas } from '../BoardCanvasContext'
import { plainEditor } from './nodeStyles'
import { useFocusOnMount } from '../useFocusOnMount'

/**
 * The text of a note or a text block, being typed (PRD D3). It grows with what
 * is written; every keystroke is written to the board (one undo step per
 * edit), so nothing typed waits on a blur to be saved. `Esc` finishes; on a
 * note, `Tab` makes the next idea to the right and `⌘/Ctrl Enter` one below,
 * already typing. The `nodrag nopan nowheel` classes keep the library's drag,
 * pan and zoom out of the text.
 */
export default function NodeTextEditor({ id, value, placeholder, ariaLabel, next = false }) {
  const canvas = useBoardCanvas()
  const ref = useRef(null)

  useFocusOnMount(ref)

  const onKeyDown = (event) => {
    // Typing belongs to the text: no key reaches the canvas while a node is edited.
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      canvas.finishEditing(id)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      if (next && !event.shiftKey) canvas.makeChild(id, 'right')
      else canvas.finishEditing(id)
    } else if (next && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      canvas.makeSibling(id)
    }
  }

  return (
    <Textarea
      variant='plain'
      minRows={1}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => canvas.writeText(id, event.target.value)}
      onBlur={() => canvas.finishEditing(id, { refocus: false })}
      onKeyDown={onKeyDown}
      slotProps={{ textarea: { ref, className: 'nodrag nopan nowheel', 'aria-label': ariaLabel, 'data-testid': `board-editor-${id}` } }}
      sx={plainEditor}
    />
  )
}
