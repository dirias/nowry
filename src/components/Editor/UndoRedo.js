import React, { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical'
import { IconButton, Tooltip } from '@mui/joy'
import { RotateCcw, RotateCw } from 'lucide-react'

const UndoRedo = () => {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(CAN_UNDO_COMMAND, setCanUndo, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(CAN_REDO_COMMAND, setCanRedo, COMMAND_PRIORITY_CRITICAL)
    )
  }, [editor])

  const handleUndo = () => {
    editor.dispatchCommand(UNDO_COMMAND)
  }

  const handleRedo = () => {
    editor.dispatchCommand(REDO_COMMAND)
  }

  return (
    <>
      <Tooltip title='Undo'>
        <span>
          <IconButton size='sm' onClick={handleUndo} disabled={!canUndo}>
            <RotateCcw size={16} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title='Redo'>
        <span>
          <IconButton size='sm' onClick={handleRedo} disabled={!canRedo}>
            <RotateCw size={16} />
          </IconButton>
        </span>
      </Tooltip>
    </>
  )
}

// Utilidad para combinar registros y limpiar correctamente
function mergeRegister(...unsubs) {
  return () => {
    for (const unsubscribe of unsubs) {
      unsubscribe()
    }
  }
}

export default UndoRedo
