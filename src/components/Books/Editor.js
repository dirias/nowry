import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, useTheme, Snackbar, Alert, Button, LinearProgress } from '@mui/joy'
import DiagramPreviewPanel from './DiagramPreviewPanel'
import DOMPurify from 'dompurify'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TablePlugin as LexicalTablePlugin } from '@lexical/react/LexicalTablePlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isDecoratorNode,
  $isRangeSelection,
  BLUR_COMMAND,
  FOCUS_COMMAND,
  COMMAND_PRIORITY_LOW
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Plugins and nodes
import RegisterListPlugin from '../../plugin/RegisterListPlugin'
import RegisterHorizontalRulePlugin from '../../plugin/RegisterHorizontalRulePlugin'
import TablePlugin from '../Editor/plugins/TablePlugin'
import TableActionMenuPlugin from '../Editor/plugins/TableActionMenuPlugin'
import SlashCommandPlugin from '../Editor/SlashCommandPlugin'
import FlowContentPlugin from '../Editor/plugins/FlowContentPlugin'
import TrailingParagraphPlugin from '../Editor/plugins/TrailingParagraphPlugin'
import ImageUploadPlugin from '../Editor/plugins/ImageUploadPlugin'
import CodePastePlugin from '../Editor/plugins/CodePastePlugin'
import ExitListPlugin from '../Editor/plugins/ExitListPlugin'
import MathPlugin from '../Editor/plugins/MathPlugin'
import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { MathNode } from '../../nodes/MathNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode, $createCodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { ColumnContainerNode, ColumnNode } from '../../nodes/ColumnNodes'
import { CalloutNode } from '../../nodes/CalloutNode'

// UI Components
// `writesToDocument` is the shared Reading Mode classification rule — an action is
// available in reading mode iff its handler never writes to the open Lexical document.
import { writesToDocument } from '../Menu/TextMenu'
// Heavy UI Components (Lazy Loaded for performance)
const StudyCard = React.lazy(() => import('../Cards/GeneratedCards'))
const QuestionnaireModal = React.lazy(() => import('../Cards/QuestionnaireModal'))
const VisualizerModal = React.lazy(() => import('../Cards/VisualizerModal'))
import { booksService, cardsService, quizzesService, illustrationsService } from '../../api/services'
import ColumnPlugin from '../../plugin/ColumnPlugin'
import FloatingToolbarPlugin from '../Editor/plugins/FloatingToolbarPlugin'
import CommentAnchorPlugin from '../Editor/plugins/CommentAnchorPlugin'
import LinkPreviewPlugin from '../Editor/plugins/LinkPreviewPlugin'
import EditorErrorBoundary from '../Editor/EditorErrorBoundary'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'
import { EXTRACT_VOCABULARY_PROMPT } from '../../constants/prompts'

// Backend wire-contract limit for POST /card/generate/stream sampleText.
// Over-limit selections are clipped client-side — never send an over-limit body.
const MAX_CARD_GEN_INPUT_CHARS = 20000

const toPx = (val) => {
  if (typeof val === 'number') return val
  if (typeof val === 'string' && val.endsWith('mm')) return parseFloat(val) * 3.7795
  if (typeof val === 'string' && val.endsWith('cm')) return parseFloat(val) * 37.795
  if (typeof val === 'string' && val.endsWith('in')) return parseFloat(val) * 96
  return 1123
}

const EditorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2'
  },
  list: {
    nested: { listitem: 'editor-nested-listitem' },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-list-item'
  },
  code: 'editor-code',
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
    strikethrough: 'editor-textStrikethrough',
    code: 'editor-textCode'
  },
  callout: 'editor-callout',
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellSelected: 'editor-table-cell-selected',
  tableRow: 'editor-table-row'
}

/**
 * EditorSyncPlugin - Syncs editor content for auto-save
 * Uses JSON format (Content-First) instead of HTML
 *
 * Benefits:
 * - 40% smaller payload
 * - 7.5x faster parsing
 * - Content is flat (no PageNodes)
 * - Enables future collaboration features
 */
function EditorSyncPlugin({ onContentChange }) {
  const previousContent = useRef('')

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const fullJson = editorState.toJSON()
          const contentString = JSON.stringify(fullJson)
          if (contentString !== previousContent.current) {
            previousContent.current = contentString
            onContentChange(fullJson)
          }
        })
      }}
    />
  )
}

function FocusReportPlugin({ onFocus }) {
  const [editor] = useLexicalComposerContext()
  const onFocusRef = useRef(onFocus)
  useEffect(() => {
    onFocusRef.current = onFocus
  }, [onFocus])
  useEffect(() => {
    return editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        onFocusRef.current(editor)
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])
  return null
}

function EditorEditablePlugin({ mode }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(mode === 'edit')
  }, [editor, mode])
  return null
}

function EditorRefPlugin({ editorRef, onEditorReady }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editorRef.current = editor
    if (onEditorReady) onEditorReady(editor)
  }, [editor, editorRef, onEditorReady])
  return null
}

const URL_MATCHER =
  /((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}))/

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text)
    if (match === null) {
      return null
    }
    const fullMatch = match[0]
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`
    }
  }
]

export default function Editor({
  initialContent,
  book,
  onSave,
  onFocus,
  onPageCountChange,
  onImageUpload,
  onTOCChange,
  onReadingStatsChange,
  pageSize = 'a4',
  pageZoom = 1.0,
  // 'edit'       — owner, editing unlocked (full toolbar)
  // 'read'       — owner, editing locked (read-only actions only)
  // 'read-guest' — public reader on someone else's book
  // A string union rather than two booleans: `isReadOnly={false} isGuest={true}`
  // is an expressible nonsense state; `mode` makes it unrepresentable.
  mode = 'edit',
  onEditorReady,
  illustrationCount = 0,
  onDiagramInserted, // called after successful diagram insert to update parent count
  // NOTE: no `tier` prop — TextMenu reads the tier from useSubscription() directly.
  ttsLanguage = 'en-US',
  ttsAutoDetect = true,
  onRequestEditMode, // 'read': the blocked-edit snackbar's "Edit" action
  onRequestFork, // 'read-guest': the blocked-edit snackbar's "Fork" action
  onSelectionSurfaceChange, // ({ visible, layout }) — drives the parent's FAB offset + coach mark
  // Comments — lifted to EditorHome.js (useComments) so the same list is shared
  // by CommentMarginRail. Editor.js itself stays resourceType-agnostic; it just
  // forwards these through to CommentAnchorPlugin.
  comments,
  onCreateComment,
  onAnchorPositionsChange,
  onAnchorStatusesChange
}) {
  const theme = useTheme()
  const menuRef = useRef()
  const containerRef = useRef()
  const editorInstanceRef = useRef(null)
  const commentAnchorPluginRef = useRef(null)
  // Saves the Lexical node key of the block to insert a diagram after.
  // Captured on "Generate Diagram" click — before the modal opens and steals focus,
  // which would clear the editor selection and lose the insertion point.
  const diagramAnchorKeyRef = useRef(null)
  const [showStudyCard, setShowStudyCard] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showDiagramPanel, setShowDiagramPanel] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [cards, setCards] = useState([])
  // SSE card generation stream state
  const cardStreamAbortRef = useRef(null)
  const lastCardGenParamsRef = useRef(null)
  const [isCardStreaming, setIsCardStreaming] = useState(false)
  const [cardStreamError, setCardStreamError] = useState(null) // null | { code }
  // null = adaptive "auto" mode with no total known yet; number = known/requested total
  const [expectedCardCount, setExpectedCardCount] = useState(0)
  // Metadata from the SSE `done` event: { cap, truncated, mode } — null while streaming
  const [generationMeta, setGenerationMeta] = useState(null)
  // True when the selection exceeded MAX_CARD_GEN_INPUT_CHARS and was clipped
  const [inputWasTruncated, setInputWasTruncated] = useState(false)
  const [questionnaireData, setQuestionnaireData] = useState([])
  const [error, setError] = useState(null)
  const [isLimitError, setIsLimitError] = useState(false)
  // True while the "you can't edit in reading mode" hint is showing.
  const [blockedEditOpen, setBlockedEditOpen] = useState(false)
  const [isExpandingText, setIsExpandingText] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false))
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Flow content state (no pagination)
  const [toc, setTOC] = useState([])
  const [readingStats, setReadingStats] = useState({ wordCount: 0, readingTime: 0, characterCount: 0 })

  // Pass TOC and stats to parent
  useEffect(() => {
    if (onTOCChange) onTOCChange(toc)
  }, [toc, onTOCChange])

  useEffect(() => {
    if (onReadingStatsChange) onReadingStatsChange(readingStats)
  }, [readingStats, onReadingStatsChange])

  // We keep track of content for auto-save
  // Content is now stored as JSON (Content-First approach)
  const [internalContent, setInternalContent] = useState(initialContent || '')

  // hasMounted prevents onSave from firing on the initial render (which would
  // incorrectly mark the document as UNSAVED and trigger a spurious auto-save).
  const hasMounted = useRef(false)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    if (onSave) {
      onSave(internalContent)
    }
  }, [internalContent, onSave])

  // Ref to track last page data to prevent infinite loops
  const lastPagesJsonRef = useRef('')
  const pageUpdateTimeoutRef = useRef(null)
  const lastPageCaptureTsRef = useRef(0)

  // Handle updates from PrecisePaginationPlugin
  const handlePageUpdate = useCallback(
    (pageData) => {
      if (onPageCountChange) {
        onPageCountChange(pageData)
      }
    },
    [onPageCountChange]
  )

  // Page Tracking Logic - Direct capture with minimal debounce
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const capturePages = () => {
      const pageElements = container.querySelectorAll('.editor-page')
      const pagesData = Array.from(pageElements).map((el, index) => {
        const html = (el.innerHTML || '').slice(0, 8000)
        return { index, content: html }
      })

      const currentSignature = `${pagesData.length}:${pagesData.map((p) => p.content.length).join(',')}`
      if (lastPagesJsonRef.current !== currentSignature) {
        lastPagesJsonRef.current = currentSignature
        if (onPageCountChange) {
          onPageCountChange(pagesData)
        }
      }
    }

    capturePages()

    let debounceTimer = null
    const observer = new MutationObserver((mutations) => {
      clearTimeout(debounceTimer)
      const isLargeMutation = mutations.some((m) => m.addedNodes.length > 1 || m.target.childNodes.length > 10)
      debounceTimer = setTimeout(capturePages, isLargeMutation ? 50 : 200)
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    })

    const currentTimeout = pageUpdateTimeoutRef.current
    return () => {
      observer.disconnect()
      clearTimeout(debounceTimer)
      if (currentTimeout) {
        cancelAnimationFrame(currentTimeout)
      }
    }
  }, [onPageCountChange, pageSize])

  const editorConfig = useMemo(
    () => ({
      namespace: `NowryEditor-${book?._id}`,
      theme: EditorTheme,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        AutoLinkNode,
        LinkNode,
        HorizontalRuleNode,
        ImageNode,
        ColumnContainerNode,
        ColumnNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        CalloutNode,
        MathNode
      ],
      editorState: (editor) => {
        // Support both JSON (new) and HTML (legacy) formats
        let content = initialContent || ''

        try {
          // Try to parse as JSON first (Content-First format)
          if (typeof content === 'object' || (content && content.trim().startsWith('{'))) {
            const jsonContent = typeof content === 'object' ? content : JSON.parse(content)

            if (jsonContent.root) {
              // Content is already flat (no PageNodes in storage)
              const editorState = editor.parseEditorState(jsonContent)
              editor.setEditorState(editorState)
              console.log('✓ Loaded from JSON format (Content-First) - flat content')
              return
            }
          }
        } catch (e) {
          // Not JSON, fall through to HTML parsing
          console.log('Parsing as HTML (legacy format)...')
        }

        // Fall back to HTML parsing (legacy format)
        const parser = new DOMParser()
        const sanitized = DOMPurify.sanitize(content || '<p></p>')
        const dom = parser.parseFromString(sanitized, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)

        editor.update(() => {
          const root = $getRoot()
          root.clear()

          // Add all content FLAT to root
          nodes.forEach((node) => {
            root.append(node)
          })

          // Ensure at least one paragraph for focus
          if (root.getChildren().length === 0) {
            root.append($createParagraphNode())
          }
        })
        console.log('✓ Loaded from HTML format (legacy) - flat content')
      },
      onError: (e) => console.error('Lexical error:', e)
    }),
    [book?._id, initialContent]
  )

  useEffect(() => {
    // Legacy handleClickOutside for TextMenu removed as FloatingToolbarPlugin handles its own state
  }, [])

  const handleRightClick = useCallback((event) => {
    // We can keep this to prevent browser menu,
    // but the FloatingToolbarPlugin will handle the UI on selection
    const selection = window.getSelection()
    if (selection?.toString().trim()) {
      event.preventDefault()
    }
  }, [])

  // Insert mermaid diagram as a new block BELOW the paragraph that was selected
  // when the user triggered "Generate Diagram". The anchor block key is saved
  // in diagramAnchorKeyRef before the modal opens (modal focus clears the selection).
  const handleDiagramInsert = useCallback(
    async (mermaidCode) => {
      // Confirm the insert with the backend first — this is where the Free-tier
      // counter increments (count-on-insert, not count-on-generate).
      const bookId = book?._id
      if (bookId) {
        try {
          await illustrationsService.confirmDiagram(bookId)
        } catch (err) {
          if (err.response?.status === 403) {
            // Cap reached between generate and insert (race condition) — show upgrade
            setShowDiagramPanel(false)
            setIsLimitError(true)
            setError(t('subscription.errors.upgradeToUse'))
            return
          }
          // Non-403 errors: still allow insert (don't block on counter failure)
        }
      }

      const editor = editorInstanceRef.current
      if (editor) {
        editor.update(() => {
          const root = $getRoot()
          const codeNode = $createCodeNode('mermaid')
          codeNode.append($createTextNode(mermaidCode))

          const anchorKey = diagramAnchorKeyRef.current
          diagramAnchorKeyRef.current = null
          const anchorBlock = anchorKey ? $getNodeByKey(anchorKey) : null

          if (anchorBlock && anchorBlock.getParent() === root) {
            anchorBlock.insertAfter(codeNode)
          } else {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              let topBlock = selection.focus.getNode()
              while (topBlock.getParent() !== root && topBlock.getParent() !== null) {
                topBlock = topBlock.getParent()
              }
              topBlock.insertAfter(codeNode)
            } else {
              const lastChild = root.getLastChild()
              if (lastChild) lastChild.insertAfter(codeNode)
              else root.append(codeNode)
            }
          }

          const trailingParagraph = $createParagraphNode()
          codeNode.insertAfter(trailingParagraph)
          trailingParagraph.select()
        })
        if (onDiagramInserted) onDiagramInserted()
      }
      setShowDiagramPanel(false)
    },
    [book, onDiagramInserted, t]
  )

  /**
   * Start (or restart) an SSE card-generation stream.
   * The modal opens immediately; cards arrive incrementally via onCard.
   * @param {string} text - Selection text (clipped here if over the wire limit)
   * @param {'auto'|number} countMode - 'auto' lets the backend pick the count
   * @param {string|null} prompt - Optional custom generation prompt
   * @param {string[]} excludeTitles - Titles to exclude ("Generate more" flow)
   */
  const startCardGeneration = useCallback(
    (text, countMode, prompt = null, excludeTitles = []) => {
      // Abort any in-flight stream before starting a new one
      cardStreamAbortRef.current?.abort()
      const controller = new AbortController()
      cardStreamAbortRef.current = controller

      // Never send an over-limit body — clip at the last whitespace before the cap
      let clippedText = text
      let wasClipped = false
      if (text.length > MAX_CARD_GEN_INPUT_CHARS) {
        const head = text.slice(0, MAX_CARD_GEN_INPUT_CHARS)
        const lastWhitespace = /\s\S*$/.exec(head)
        clippedText = (lastWhitespace ? head.slice(0, lastWhitespace.index) : head).trimEnd()
        wasClipped = true
      }

      lastCardGenParamsRef.current = { text: clippedText, countMode, prompt, excludeTitles }

      setInputWasTruncated(wasClipped)
      setCards([])
      setCardStreamError(null)
      setGenerationMeta(null)
      // null = auto mode: total unknown until the first card event arrives
      setExpectedCardCount(countMode === 'auto' ? null : countMode)
      setIsCardStreaming(true)
      setShowStudyCard(true) // Modal opens BEFORE the first event arrives

      cardsService.generateStream(clippedText, countMode, prompt, {
        signal: controller.signal,
        excludeTitles,
        onCard: (e) => {
          setCards((prev) => [...prev, e.card])
          setExpectedCardCount(e.total)
        },
        onDone: (e) => {
          setGenerationMeta({ cap: e?.cap, truncated: Boolean(e?.truncated), mode: e?.mode })
          setIsCardStreaming(false)
        },
        onError: (e) => {
          setIsCardStreaming(false)
          if (e.status === 403) {
            // Plan limit reached — same behavior as the legacy catch block
            setShowStudyCard(false)
            setIsLimitError(true)
            setError(t('subscription.errors.upgradeToUse'))
          } else {
            setCardStreamError({ code: e.code })
          }
        }
      })
    },
    [t]
  )

  // Re-run the last generation with the same params (error/empty retry) —
  // preserves auto mode (sampleNumber: null) and any excludeTitles
  const handleCardStreamRetry = useCallback(() => {
    const params = lastCardGenParamsRef.current
    if (params) {
      startCardGeneration(params.text, params.countMode, params.prompt, params.excludeTitles)
    }
  }, [startCardGeneration])

  // Regenerate with a user-picked count mode ('auto' or fixed int) — same text/prompt
  const handleGenerateAgainWithCount = useCallback(
    (countMode) => {
      const params = lastCardGenParamsRef.current
      if (params) {
        startCardGeneration(params.text, countMode, params.prompt)
      }
    },
    [startCardGeneration]
  )

  // "Generate more": re-run excluding titles already generated (previous
  // excludeTitles merged with the current batch, capped per wire contract)
  const handleGenerateMore = useCallback(() => {
    const params = lastCardGenParamsRef.current
    if (!params) return
    const excludeTitles = [...new Set([...(params.excludeTitles || []), ...cards.map((c) => c?.title).filter(Boolean)])]
      .map((title) => title.slice(0, 200))
      .slice(0, 50)
    startCardGeneration(params.text, params.countMode, params.prompt, excludeTitles)
  }, [cards, startCardGeneration])

  const handleCardModalCancel = useCallback(() => {
    cardStreamAbortRef.current?.abort()
    setIsCardStreaming(false)
    setShowStudyCard(false)
  }, [])

  // Abort any in-flight card stream on unmount
  useEffect(() => {
    return () => {
      cardStreamAbortRef.current?.abort()
    }
  }, [])

  const handleOptionClick = useCallback(
    async (option, overrideText) => {
      const textToProcess = overrideText || selectedText
      // Second line of defense behind TextMenu's render guard: a document-writing
      // action must never run while the document is not editable.
      if (mode !== 'edit' && writesToDocument(option)) return
      setError(null)
      try {
        if (option === 'add_comment' && textToProcess) {
          // CommentAnchorPlugin re-reads window.getSelection() itself, synchronously,
          // in this same click handler — before the composer opens and steals focus.
          // Same timing guarantee generate_diagram below relies on for its anchor capture.
          // That guarantee depends on TextMenu's `keepSelection` pointerdown guard; if it
          // ever regresses the capture returns false, and we surface it rather than
          // no-op silently (which is indistinguishable from a dead button).
          const captured = commentAnchorPluginRef.current?.openComposerForSelection()
          if (!captured) setError(t('comments.errors.selectionLost'))
        } else if (option === 'create_study_card' && textToProcess) {
          startCardGeneration(textToProcess, 'auto')
        } else if (option === 'create_questionnaire' && textToProcess) {
          const response = await quizzesService.generate(textToProcess, 5, 'Medium')
          setQuestionnaireData(response)
          setShowQuestionnaire(true)
        } else if (option === 'create_visual_content' && textToProcess) {
          setShowVisualizer(true)
        } else if (option === 'extract_vocabulary' && textToProcess) {
          startCardGeneration(textToProcess, 'auto', EXTRACT_VOCABULARY_PROMPT)
        } else if (option === 'expand_with_ai' && textToProcess) {
          setIsExpandingText(true)
          try {
            const { expanded_text } = await booksService.aiExpand(book?._id, textToProcess, '')
            const editor = editorInstanceRef.current
            if (editor) {
              editor.update(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                  selection.insertText(expanded_text)
                }
              })
            }
          } catch (err) {
            console.error('Error expanding text:', err)
            const status = err.response?.status
            if (status === 403) {
              setIsLimitError(true)
              setError(t('subscription.errors.upgradeToUse'))
            } else {
              setError(err.response?.data?.detail || t('aiMagic.expandError'))
            }
          } finally {
            setIsExpandingText(false)
          }
        } else if (option === 'generate_diagram' && textToProcess) {
          // Capture the top-level block key NOW — the modal will steal focus and
          // clear the Lexical selection before handleDiagramInsert runs.
          const editorForAnchor = editorInstanceRef.current
          if (editorForAnchor) {
            editorForAnchor.read(() => {
              const sel = $getSelection()
              if ($isRangeSelection(sel)) {
                const root = $getRoot()
                let topBlock = sel.focus.getNode()
                while (topBlock.getParent() !== root && topBlock.getParent() !== null) {
                  topBlock = topBlock.getParent()
                }
                diagramAnchorKeyRef.current = topBlock.getKey()
              }
            })
          }
          setSelectedText(textToProcess)
          setShowDiagramPanel(true)
        }
      } catch (error) {
        console.error('Error:', error)
        const status = error.response?.status
        if (status === 403) {
          setIsLimitError(true)
          setError(t('subscription.errors.upgradeToUse'))
        } else {
          setError(error.response?.data?.detail || t('subscription.errors.genericCreate'))
        }
      }
    },
    [selectedText, t, book, startCardGeneration, mode]
  )

  // Fired by FloatingToolbarPlugin when a formatting shortcut (⌘/Ctrl + B/I/U/K)
  // is pressed while the document is locked. Already throttled upstream.
  const handleBlockedEdit = useCallback(() => setBlockedEditOpen(true), [])

  const fixedWidth = `${toPx(PAGE_SIZES[pageSize]?.width || '210mm')}px`
  const fixedHeight = `${toPx(PAGE_SIZES[pageSize]?.height || '297mm')}px`
  const fixedPaddingY = `${toPx(PAGE_SIZES[pageSize]?.paddingY || '25mm')}px`
  const fixedPaddingX = `${toPx(PAGE_SIZES[pageSize]?.paddingX || '20mm')}px`
  const adjustedZoom = useMemo(() => pageZoom, [pageZoom])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <EditorErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          flexGrow: 1,
          position: 'relative'
        }}
      >
        {isExpandingText && (
          <LinearProgress
            size='sm'
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10
            }}
          />
        )}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} color='danger' variant='soft'>
          <Alert
            color='danger'
            variant='soft'
            endDecorator={
              isLimitError ? (
                <Button size='sm' variant='solid' color='danger' onClick={() => navigate('/profile')}>
                  {t('subscription.upgrade')}
                </Button>
              ) : null
            }
          >
            {error}
          </Alert>
        </Snackbar>

        {/* Blocked edit in reading mode — responds to a user action, so polite, not an alert. */}
        <Snackbar
          open={blockedEditOpen}
          autoHideDuration={4000}
          onClose={() => setBlockedEditOpen(false)}
          color='neutral'
          variant='soft'
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          aria-live='polite'
          endDecorator={
            mode === 'read-guest' ? (
              <Button
                size='sm'
                variant='soft'
                onClick={() => {
                  setBlockedEditOpen(false)
                  onRequestFork?.()
                }}
              >
                {t('public.fork')}
              </Button>
            ) : (
              <Button
                size='sm'
                variant='soft'
                onClick={() => {
                  setBlockedEditOpen(false)
                  onRequestEditMode?.()
                }}
              >
                {t('editor.mobile.editMode')}
              </Button>
            )
          }
        >
          {mode === 'read-guest' ? t('editor.mode.blockedGuest') : t('editor.mode.blockedHint')}
        </Snackbar>

        <LexicalComposer initialConfig={editorConfig}>
          <Box
            id='editor-pages-container'
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
              transform: `scale(${adjustedZoom})`,
              transformOrigin: 'top center'
            }}
            onContextMenu={handleRightClick}
            ref={containerRef}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className='editor-content'
                  role='textbox'
                  aria-multiline='true'
                  style={
                    isMobile
                      ? undefined
                      : {
                          width: fixedWidth,
                          paddingTop: fixedPaddingY,
                          paddingBottom: fixedPaddingY,
                          paddingLeft: fixedPaddingX,
                          paddingRight: fixedPaddingX
                        }
                  }
                />
              }
              placeholder={
                <div
                  className='editor-placeholder'
                  style={
                    isMobile
                      ? undefined
                      : {
                          top: fixedPaddingY,
                          left: fixedPaddingX,
                          right: fixedPaddingX
                        }
                  }
                >
                  {t('editor.placeholder', 'Start writing your book...')}
                </div>
              }
              ErrorBoundary={EditorErrorBoundary}
            />
          </Box>

          {/* Plugins */}
          <EditorRefPlugin editorRef={editorInstanceRef} onEditorReady={onEditorReady} />
          <FocusReportPlugin onFocus={onFocus} />
          <EditorEditablePlugin mode={mode} />
          <EditorSyncPlugin onContentChange={setInternalContent} />
          <ImageUploadPlugin bookId={book?._id} onUploadComplete={onImageUpload} onUploadError={(msg) => setError(msg)} />
          <CodePastePlugin />
          <HistoryPlugin />
          {/* <AutoFocusPlugin /> */}
          <RegisterListPlugin />
          <RegisterHorizontalRulePlugin />
          <SlashCommandPlugin />
          <MathPlugin />
          <ExitListPlugin />
          <TabIndentationPlugin />
          <LinkPlugin />
          <LinkPreviewPlugin />
          <AutoLinkPlugin matchers={MATCHERS} />
          <TablePlugin />
          <LexicalTablePlugin />
          <TableActionMenuPlugin />
          <FlowContentPlugin onTOCChange={setTOC} onProgressChange={setReadingStats} />
          <TrailingParagraphPlugin />
          <ColumnPlugin />
          <FloatingToolbarPlugin
            onOptionClick={(opt, text) => {
              setSelectedText(text)
              handleOptionClick(opt, text)
            }}
            illustrationCount={illustrationCount}
            ttsLanguage={ttsLanguage}
            ttsAutoDetect={ttsAutoDetect}
            bookId={book?._id}
            mode={mode}
            onBlockedEdit={handleBlockedEdit}
            onSelectionSurfaceChange={onSelectionSurfaceChange}
            onError={(msg) => setError(msg)}
          />

          <CommentAnchorPlugin
            ref={commentAnchorPluginRef}
            comments={comments}
            onCreateComment={onCreateComment}
            onAnchorPositionsChange={onAnchorPositionsChange}
            onAnchorStatusesChange={onAnchorStatusesChange}
            onError={(msg) => setError(msg)}
          />

          {/* Overlays (Lazy Loaded) */}
          {/* DiagramPreviewPanel — rendered outside Suspense (not lazy-loaded) */}
          <DiagramPreviewPanel
            open={showDiagramPanel}
            onClose={() => setShowDiagramPanel(false)}
            selectedText={selectedText}
            bookId={book?._id || book?.id}
            onInsert={handleDiagramInsert}
          />

          <React.Suspense
            fallback={
              <Box
                sx={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(2px)'
                }}
              />
            }
          >
            {showStudyCard && (
              <StudyCard
                cards={cards}
                book={book}
                onCancel={handleCardModalCancel}
                isStreaming={isCardStreaming}
                streamError={cardStreamError}
                expectedTotal={expectedCardCount}
                onRetry={handleCardStreamRetry}
                onGenerateAgain={handleGenerateAgainWithCount}
                onGenerateMore={handleGenerateMore}
                generationMeta={generationMeta}
                inputWasTruncated={inputWasTruncated}
              />
            )}
            {showQuestionnaire && <QuestionnaireModal questions={questionnaireData} onCancel={() => setShowQuestionnaire(false)} />}
            {showVisualizer && <VisualizerModal open={showVisualizer} onClose={() => setShowVisualizer(false)} text={selectedText} />}
          </React.Suspense>
        </LexicalComposer>
      </Box>
    </EditorErrorBoundary>
  )
}
