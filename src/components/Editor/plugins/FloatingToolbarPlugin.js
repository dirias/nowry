import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createParagraphNode, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createCalloutNode } from '../../../nodes/CalloutNode'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import TextMenu from '../../Menu/TextMenu'
import { ttsService } from '../../../api/services/tts.ai.service'

export default function FloatingToolbarPlugin({
  onOptionClick,
  illustrationCount = 0,
  tier = 'free',
  ttsLanguage = 'en-US',
  bookId,
  onTtsError
}) {
  const [editor] = useLexicalComposerContext()
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const [selectedText, setSelectedText] = useState('')
  const [currentBlockType, setCurrentBlockType] = useState('paragraph')
  const menuRef = useRef(null)

  // TTS state — play selected text via the mic icon in the floating toolbar
  const [ttsState, setTtsState] = useState('idle') // 'idle' | 'loading' | 'playing'
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  const stopTts = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setTtsState('idle')
  }, [])

  const handleTtsEnded = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setTtsState('idle')
  }, [])

  const handleMicClick = useCallback(async () => {
    if (ttsState !== 'idle') {
      stopTts()
      return
    }

    setTtsState('loading')
    try {
      const blobUrl = await ttsService.generate(bookId, selectedText, ttsLanguage)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
      blobUrlRef.current = blobUrl
      if (audioRef.current) {
        audioRef.current.src = blobUrl
        await audioRef.current.play()
      }
      setTtsState('playing')
    } catch {
      setTtsState('idle')
      onTtsError?.(t('aiMagic.tts.error'))
    }
  }, [ttsState, stopTts, bookId, selectedText, ttsLanguage, onTtsError, t])

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

      // A genuinely new selection (not just a re-fire of the same one) cancels any
      // in-flight/playing TTS audio rather than queuing or auto-playing the new text.
      if (ttsState !== 'idle' && nativeSelection.toString() !== selectedText) {
        stopTts()
      }
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
      // Keep the toolbar pinned at its last known position while audio is playing,
      // even if the native selection collapses.
      if (ttsState !== 'idle') return
      setShowMenu(false)
    }
  }, [editor, isEditingLink, ttsState, selectedText, stopTts])

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
        // Don't leave audio playing invisibly after the toolbar that controls it has closed.
        if (ttsState !== 'idle') stopTts()
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, isEditingLink, ttsState, stopTts])

  if (!showMenu) return null

  return createPortal(
    <>
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
        ttsState={ttsState}
        onMicClick={handleMicClick}
      />
      <audio ref={audioRef} style={{ display: 'none' }} onEnded={handleTtsEnded} />
    </>,
    document.body
  )
}
