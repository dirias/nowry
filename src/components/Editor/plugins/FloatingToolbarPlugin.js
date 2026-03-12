import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical'
import { createPortal } from 'react-dom'
import TextMenu from '../../Menu/TextMenu'

export default function FloatingToolbarPlugin({ onOptionClick }) {
  const [editor] = useLexicalComposerContext()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const [selectedText, setSelectedText] = useState('')
  const menuRef = useRef(null)

  const updateToolbar = useCallback(() => {
    // If we are editing a link, don't let selection changes hide the menu
    if (isEditingLink) return

    // Hide toolbar if editor is in read-only mode
    if (!editor.isEditable()) {
      setShowMenu(false)
      return
    }

    const selection = $getSelection()
    const nativeSelection = window.getSelection()
    const rootElement = editor.getRootElement()

    if (
      $isRangeSelection(selection) &&
      nativeSelection &&
      !nativeSelection.isCollapsed &&
      rootElement &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()

      // Calculate position (centered above selection)
      const top = rect.top - 50 // 50px above selection
      const left = rect.left + rect.width / 2 - 110 // Half of menu width approx

      setPosition({ top, left })
      setActiveFormats({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline')
      })
      setSelectedText(nativeSelection.toString())
      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }, [editor, isEditingLink])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updateToolbar])

  // Handle click outside to close the menu, especially during link editing
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsEditingLink(false)
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, isEditingLink])

  if (!showMenu) return null

  return createPortal(
    <TextMenu
      ref={menuRef}
      onOptionClick={(opt) => {
        onOptionClick(opt, selectedText)
        setShowMenu(false)
      }}
      onLinkEdit={(editing) => {
        setIsEditingLink(editing)
      }}
      activeFormats={activeFormats}
      style={{ top: position.top, left: position.left }}
    />,
    document.body
  )
}
