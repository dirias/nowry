import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// A stray drag across a single space should not pop a full toolbar.
const MIN_SELECTION_CHARS = 2

// Reading mode reads the native selection on a debounce rather than reacting to
// Lexical updates — see updateToolbarFromNativeSelection below.
const SELECTION_DEBOUNCE_MS = 120

// Held formatting shortcuts must not stack blocked-edit hints.
const BLOCKED_EDIT_THROTTLE_MS = 4000

// Vertical gap between the selection rect and the floating toolbar.
const TOOLBAR_OFFSET_PX = 50

// Joy UI's `md` breakpoint. Below it the reading surface is a fixed bottom bar,
// because iOS Safari / Android Chrome draw their own callout over the selection.
const COMPACT_MEDIA_QUERY = '(max-width: 899.98px)'

const BLOCKED_SHORTCUT_KEYS = ['b', 'i', 'u', 'k']

export default function FloatingToolbarPlugin({
  onOptionClick,
  illustrationCount = 0,
  ttsLanguage = 'en-US',
  bookId,
  onError,
  mode = 'edit',
  onBlockedEdit,
  onSelectionSurfaceChange
}) {
  const [editor] = useLexicalComposerContext()
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingLink, setIsEditingLink] = useState(false)
  // `anchor` is the measured selection geometry; `position` is the resolved
  // top/left once the menu's real width is known (see the layout effect).
  const [anchor, setAnchor] = useState({ top: 0, centerX: 0 })
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const [selectedText, setSelectedText] = useState('')
  const [currentBlockType, setCurrentBlockType] = useState('paragraph')
  const menuRef = useRef(null)

  const isReading = mode !== 'edit'

  // TTS state — play selected text via the speaker icon in the toolbar
  const [ttsState, setTtsState] = useState('idle') // 'idle' | 'loading' | 'playing'
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(COMPACT_MEDIA_QUERY).matches : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia(COMPACT_MEDIA_QUERY)
    const handler = (event) => setIsCompact(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Editing mode always uses the floating toolbar (unchanged). Only the reading
  // surface switches to a bottom bar on small viewports.
  const layout = isReading && isCompact ? 'bar' : 'floating'

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
      onError?.(t('aiMagic.tts.error'))
    }
  }, [ttsState, stopTts, bookId, selectedText, ttsLanguage, onError, t])

  /**
   * Editing mode — Lexical-driven selection path. Unchanged apart from the
   * trivial-selection guard and the centering fix (both apply to all modes).
   */
  const updateToolbar = useCallback(() => {
    // If we are editing a link, don't let selection changes hide the menu
    if (isEditingLink) return

    const selection = $getSelection()
    const nativeSelection = window.getSelection()
    const rootElement = editor.getRootElement()

    if (
      $isRangeSelection(selection) &&
      nativeSelection &&
      !nativeSelection.isCollapsed &&
      nativeSelection.toString().trim().length >= MIN_SELECTION_CHARS &&
      rootElement &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()

      // Only the anchor point is known here — the true left depends on the
      // menu's rendered width, resolved in the layout effect below.
      setAnchor({ top: rect.top - TOOLBAR_OFFSET_PX, centerX: rect.left + rect.width / 2 })
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

  /**
   * Reading mode — native-selection path.
   *
   * With `editor.setEditable(false)` the ContentEditable becomes
   * contenteditable="false" and Lexical stops reconciling DOM selection into a
   * RangeSelection: `$getSelection()` returns null or stale state, so
   * `$isRangeSelection` in the editing path above can never pass. Everything
   * here is therefore derived from `window.getSelection()` instead.
   *
   * `activeFormats` and `currentBlockType` are deliberately not computed — they
   * only drive controls that reading mode does not render.
   */
  const updateToolbarFromNativeSelection = useCallback(() => {
    if (isEditingLink) return

    const nativeSelection = window.getSelection()
    const rootElement = editor.getRootElement()
    const text = nativeSelection ? nativeSelection.toString() : ''

    const hasUsableSelection =
      nativeSelection &&
      nativeSelection.rangeCount > 0 &&
      !nativeSelection.isCollapsed &&
      text.trim().length >= MIN_SELECTION_CHARS &&
      rootElement &&
      rootElement.contains(nativeSelection.anchorNode)

    if (!hasUsableSelection) {
      // Same pinned-while-playing rule as editing mode.
      if (ttsState !== 'idle') return
      setShowMenu(false)
      return
    }

    const rect = nativeSelection.getRangeAt(0).getBoundingClientRect()
    setAnchor({ top: rect.top - TOOLBAR_OFFSET_PX, centerX: rect.left + rect.width / 2 })

    if (ttsState !== 'idle' && text !== selectedText) {
      stopTts()
    }
    setSelectedText(text)
    setShowMenu(true)
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

  // ── Editing mode: Lexical-driven triggers ──────────────────────────────────
  useEffect(() => {
    if (isReading) return undefined
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar, isReading])

  useEffect(() => {
    if (isReading) return undefined
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updateToolbar, isReading])

  // ── Reading mode: native `selectionchange`, debounced ──────────────────────
  // Also covers keyboard-driven (Shift+Arrow) selections — the surface is never
  // gated on pointer events.
  useEffect(() => {
    if (!isReading) return undefined
    let timer = null
    const handleSelectionChange = () => {
      clearTimeout(timer)
      timer = setTimeout(updateToolbarFromNativeSelection, SELECTION_DEBOUNCE_MS)
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [isReading, updateToolbarFromNativeSelection])

  // Horizontal centering needs the menu's real width — the reading toolbar is
  // ~3 controls narrower than the editing one, so a fixed offset is visibly off.
  useLayoutEffect(() => {
    if (!showMenu || layout === 'bar') return
    const width = menuRef.current?.offsetWidth ?? 0
    const next = { top: anchor.top, left: anchor.centerX - width / 2 }
    setPosition((prev) => (prev.top === next.top && prev.left === next.left ? prev : next))
  }, [showMenu, anchor, layout])

  // Let the host page react to the surface (mobile FAB offset, coach mark).
  useEffect(() => {
    onSelectionSurfaceChange?.({ visible: showMenu, layout })
  }, [showMenu, layout, onSelectionSurfaceChange])

  /**
   * ⌘/Ctrl + B/I/U/K while the document is locked → explain, don't silently no-op.
   *
   * NOTE: this deliberately does NOT use Lexical's KEY_DOWN_COMMAND. Lexical
   * only dispatches root-element key events when `editor.isEditable()` is true
   * (`addRootElementEvents` in lexical gates every function-type handler on it),
   * and a contenteditable="false" root is not focusable anyway, so the keydown
   * never reaches it. Listening on `document` and scoping to selections inside
   * the editor root is the same remedy already applied to selection detection.
   */
  const lastBlockedEditRef = useRef(0)
  useEffect(() => {
    if (!isReading) return undefined
    const handleKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key?.toLowerCase()
      if (!BLOCKED_SHORTCUT_KEYS.includes(key)) return

      const rootElement = editor.getRootElement()
      if (!rootElement) return
      const nativeSelection = window.getSelection()
      const isInsideEditor =
        (nativeSelection?.anchorNode && rootElement.contains(nativeSelection.anchorNode)) ||
        (document.activeElement && rootElement.contains(document.activeElement))
      if (!isInsideEditor) return

      event.preventDefault()
      const now = Date.now()
      if (now - lastBlockedEditRef.current < BLOCKED_EDIT_THROTTLE_MS) return
      lastBlockedEditRef.current = now
      onBlockedEdit?.(mode)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, isReading, mode, onBlockedEdit])

  // Handle click outside to close the menu, especially during link editing.
  // Must not close when clicking inside a Joy UI Menu portal (role="menu" / role="menuitem")
  // that belongs to this toolbar — those are rendered in document.body outside menuRef.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      if (!target?.closest) return

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
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
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
        mode={mode}
        layout={layout}
        selectedText={selectedText}
        onError={onError}
      />
      <audio ref={audioRef} style={{ display: 'none' }} onEnded={handleTtsEnded} />
    </>,
    document.body
  )
}
