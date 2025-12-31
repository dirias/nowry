import React, { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { IconButton, Tooltip, Divider, Box } from '@mui/joy'
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react'

const TextFormatButtons = () => {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
    }
  }, [])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  return (
    <>
      <Tooltip title='Bold (Ctrl+B)'>
        <IconButton
          size='sm'
          variant={isBold ? 'solid' : 'plain'}
          color={isBold ? 'primary' : 'neutral'}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        >
          <Bold size={16} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Italic (Ctrl+I)'>
        <IconButton
          size='sm'
          variant={isItalic ? 'solid' : 'plain'}
          color={isItalic ? 'primary' : 'neutral'}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        >
          <Italic size={16} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Underline (Ctrl+U)'>
        <IconButton
          size='sm'
          variant={isUnderline ? 'solid' : 'plain'}
          color={isUnderline ? 'primary' : 'neutral'}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        >
          <Underline size={16} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Strikethrough'>
        <IconButton
          size='sm'
          variant={isStrikethrough ? 'solid' : 'plain'}
          color={isStrikethrough ? 'primary' : 'neutral'}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        >
          <Strikethrough size={16} />
        </IconButton>
      </Tooltip>
    </>
  )
}

export default TextFormatButtons
