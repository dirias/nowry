import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createParagraphNode, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createCalloutNode } from '../../../nodes/CalloutNode'
import { createPortal } from 'react-dom'
import TextMenu from '../../Menu/TextMenu'

export default function FloatingToolbarPlugin({ onOptionClick, illustrationCount = 0, tier = 'free' }) {
  const [editor] = useLexicalComposerContext()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const [selectedText, setSelectedText] = useState('')
  const [currentBlockType, setCurrentBlockType] = useState('paragraph')
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

      // Detect block type from anchor node
      const anchorNode = selection.anchor.getNode()
      let block = anchorNode
      while (block && block.getParent && block.getParent() && block.getParent().getType() !== 'root') {
        block = block.getParent()
      }
      let blockType = 'paragraph'
      if (block) {
        const type = block.getType()
        if (type === 'heading')
          blockType = block.getTag() // 'h1', 'h2', 'h3'
        else if (type === 'list') blockType = block.getListType() === 'bullet' ? 'bullet' : 'number'
        else if (type === 'listitem') {
          const parent = block.getParent()
          blockType = parent?.getListType() === 'bullet' ? 'bullet' : 'number'
        } else if (['quote', 'code', 'paragraph'].includes(type)) blockType = type
        else if (type === 'callout') blockType = block.__calloutType ?? 'note'
        else blockType = 'mixed'
      }
      setCurrentBlockType(blockType)

      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }, [editor, isEditingLink])

  const onBlockTypeChange = useCallback(
    (blockType) => {
      if (blockType === 'bullet') {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        return
      }
      if (blockType === 'number') {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        return
      }
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        if (blockType === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode())
        } else if (blockType === 'h1') {
          $setBlocksType(selection, () => $createHeadingNode('h1'))
        } else if (blockType === 'h2') {
          $setBlocksType(selection, () => $createHeadingNode('h2'))
        } else if (blockType === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode('h3'))
        } else if (blockType === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode())
        } else if (blockType === 'code') {
          $setBlocksType(selection, () => $createCodeNode())
        } else if (['note', 'tip', 'warning'].includes(blockType)) {
          $setBlocksType(selection, () => {
            const callout = $createCalloutNode(blockType)
            callout.append($createParagraphNode())
            return callout
          })
        }
      })
    },
    [editor]
  )

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

  // Handle click outside to close the menu, especially during link editing.
  // Must not close when clicking inside a Joy UI Menu portal (role="menu" / role="menuitem")
  // that belongs to this toolbar — those are rendered in document.body outside menuRef.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target

      // Ignore clicks that land inside any open [role="menu"] popup — these are
      // Dropdown menu portals (Turn into / AI actions) attached to this toolbar.
      if (target.closest('[role="menu"]') || target.closest('[role="menuitem"]')) return

      if (menuRef.current && !menuRef.current.contains(target)) {
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
      currentBlockType={currentBlockType}
      onBlockTypeChange={onBlockTypeChange}
      illustrationCount={illustrationCount}
      style={{ top: position.top, left: position.left }}
    />,
    document.body
  )
}
