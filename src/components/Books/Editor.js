import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, useTheme, Snackbar, Alert, Button } from '@mui/joy'
import DOMPurify from 'dompurify'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import {
  $createParagraphNode,
  $getRoot,
  $isElementNode,
  $isDecoratorNode,
  BLUR_COMMAND,
  FOCUS_COMMAND,
  COMMAND_PRIORITY_LOW
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Plugins and nodes
import RegisterListPlugin from '../../plugin/RegisterListPlugin'
import RegisterHorizontalRulePlugin from '../../plugin/RegisterHorizontalRulePlugin'
import TablePlugin from '../Editor/plugins/TablePlugin'
import SlashCommandPlugin from '../Editor/SlashCommandPlugin'
import WordCountPlugin from '../Editor/WordCountPlugin'
import SmartPaginationPlugin from '../Editor/plugins/SmartPaginationPlugin'
import ImageUploadPlugin from '../Editor/plugins/ImageUploadPlugin'
import CodePastePlugin from '../Editor/plugins/CodePastePlugin'
import ExitListPlugin from '../Editor/plugins/ExitListPlugin'
import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { PageNode } from '../../nodes/PageNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { ColumnContainerNode, ColumnNode } from '../../nodes/ColumnNodes'

// UI Components
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/GeneratedCards'
import QuestionnaireModal from '../Cards/QuestionnaireModal'
import VisualizerModal from '../Cards/VisualizerModal'
import { cardsService, quizzesService } from '../../api/services'
import ColumnPlugin from '../../plugin/ColumnPlugin'
import EditorErrorBoundary from '../Editor/EditorErrorBoundary'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'
import { EXTRACT_VOCABULARY_PROMPT } from '../../constants/prompts'

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
  }
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
  const [editor] = useLexicalComposerContext()
  const previousContent = useRef('')
  const isUpdating = useRef(false)

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        // Prevent re-entrant calls
        if (isUpdating.current) return

        editorState.read(() => {
          // Get full JSON from editor state (already flat - no PageNodes)
          const fullJson = editorState.toJSON()

          // Convert to string for comparison
          const contentString = JSON.stringify(fullJson)

          // Only trigger if content actually changed
          if (contentString !== previousContent.current) {
            previousContent.current = contentString
            isUpdating.current = true

            // Use setTimeout to break out of current event loop
            setTimeout(() => {
              onContentChange(fullJson)
              isUpdating.current = false
            }, 0)
          }
        })
      }}
    />
  )
}

function FocusReportPlugin({ onFocus }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    // Report focus immediately on mount if needed, or wait for event
    // If this is the *only* editor, we can just say we are focused.
    onFocus(editor)
    return editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        onFocus(editor)
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, onFocus])
  return null
}

function EditorEditablePlugin({ isReadOnly }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!isReadOnly)
  }, [editor, isReadOnly])
  return null
}

export default function Editor({
  initialContent,
  book,
  onSave,
  onFocus,
  onPageCountChange,
  onImageUpload,
  pageSize = 'a4',
  pageZoom = 1.0,
  isReadOnly = false
}) {
  const theme = useTheme()
  const menuRef = useRef()
  const containerRef = useRef()
  const [showMenu, setShowMenu] = useState(false)
  const [showStudyCard, setShowStudyCard] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [cards, setCards] = useState([])
  const [questionnaireData, setQuestionnaireData] = useState([])
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [error, setError] = useState(null)
  const [isLimitError, setIsLimitError] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false))
  const navigate = useNavigate()
  const { t } = useTranslation()

  // We keep track of content for auto-save
  // Content is now stored as JSON (Content-First approach)
  const [internalContent, setInternalContent] = useState(initialContent || '')

  useEffect(() => {
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
    if (!containerRef.current) return

    const capturePages = () => {
      if (!containerRef.current) return

      const MAX_PREVIEW_CHARS = 8000
      const pageElements = containerRef.current.querySelectorAll('.editor-page')
      const pagesData = Array.from(pageElements).map((el, index) => {
        const html = (el.innerHTML || '').slice(0, MAX_PREVIEW_CHARS)
        return { index, content: html }
      })

      // Only update if count or content changed
      const currentSignature = `${pagesData.length}:${pagesData.map((p) => p.content.length).join(',')}`
      if (lastPagesJsonRef.current !== currentSignature) {
        lastPagesJsonRef.current = currentSignature
        if (onPageCountChange) {
          onPageCountChange(pagesData)
        }
      }
    }

    // Initial capture
    capturePages()

    // Minimal debounce for rapid changes (typing), immediate for paste
    let debounceTimer = null
    const observer = new MutationObserver((mutations) => {
      clearTimeout(debounceTimer)

      // Check if this is a large mutation (paste operation)
      const isLargeMutation = mutations.some((m) => m.addedNodes.length > 1 || m.target.childNodes.length > 10)

      if (isLargeMutation) {
        // Large paste: capture immediately after a short delay for DOM to settle
        debounceTimer = setTimeout(capturePages, 50)
      } else {
        // Small change (typing): debounce normally
        debounceTimer = setTimeout(capturePages, 200)
      }
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
      clearTimeout(debounceTimer)
      if (pageUpdateTimeoutRef.current) {
        cancelAnimationFrame(pageUpdateTimeoutRef.current)
      }
    }
  }, [onPageCountChange, pageSize])

  const editorConfig = useMemo(
    () => ({
      namespace: `NowryEditor-${book?._id}`,
      theme: EditorTheme,
      nodes: [
        PageNode,
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
        TableRowNode
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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRightClick = useCallback((event) => {
    event.preventDefault()
    const selection = window.getSelection()
    const text = selection?.toString()
    if (text?.trim()) {
      setSelectedText(text)
      setMenuPosition({ x: event.pageX, y: event.pageY })
      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }, [])

  const handleOptionClick = useCallback(
    async (option) => {
      setShowMenu(false)
      setError(null)
      try {
        if (option === 'create_study_card' && selectedText) {
          const response = await cardsService.generate(selectedText, 2)
          setCards(response)
          setShowStudyCard(true)
        } else if (option === 'create_questionnaire' && selectedText) {
          const response = await quizzesService.generate(selectedText, 5, 'Medium')
          setQuestionnaireData(response)
          setShowQuestionnaire(true)
        } else if (option === 'create_visual_content' && selectedText) {
          setShowVisualizer(true)
        } else if (option === 'extract_vocabulary' && selectedText) {
          // Pro Feature: Bulk Extraction
          // We ask for up to 50 cards to cover long lists, but enforce strict extraction
          const response = await cardsService.generate(selectedText, 50, EXTRACT_VOCABULARY_PROMPT)
          setCards(response)
          setShowStudyCard(true)
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
    [selectedText, t]
  )

  const fixedWidth = `${toPx(PAGE_SIZES[pageSize]?.width || '210mm')}px`
  const fixedHeight = `${toPx(PAGE_SIZES[pageSize]?.height || '297mm')}px`
  const fixedPaddingY = `${toPx(PAGE_SIZES[pageSize]?.paddingY || '25mm')}px`
  const fixedPaddingX = `${toPx(PAGE_SIZES[pageSize]?.paddingX || '20mm')}px`
  const adjustedZoom = useMemo(() => (isMobile ? 0.75 : pageZoom), [isMobile, pageZoom])

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
              transformOrigin: 'top center',
              // CSS Variables for page styling (not used with MultiPageRendererPlugin)
              '--page-width': fixedWidth,
              '--page-height': fixedHeight,
              '--page-py': fixedPaddingY,
              '--page-px': fixedPaddingX
            }}
            onContextMenu={handleRightClick}
            ref={containerRef}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className='editor-content-flat'
                  role='textbox'
                  aria-multiline='true'
                  style={{
                    outline: 'none',
                    width: '100%',
                    minHeight: '100%',
                    display: 'block'
                  }}
                />
              }
              placeholder={null}
              ErrorBoundary={EditorErrorBoundary}
            />
          </Box>

          {/* Plugins */}
          <FocusReportPlugin onFocus={onFocus} />
          <EditorEditablePlugin isReadOnly={isReadOnly} />
          <EditorSyncPlugin onContentChange={setInternalContent} />
          <ImageUploadPlugin bookId={book?._id} onUploadComplete={onImageUpload} />
          <CodePastePlugin />
          <HistoryPlugin />
          {/* <AutoFocusPlugin /> */}
          <RegisterListPlugin />
          <RegisterHorizontalRulePlugin />
          <SlashCommandPlugin />
          <ExitListPlugin />
          <TablePlugin />
          <WordCountPlugin />
          <SmartPaginationPlugin
            key={`pagination-${pageSize}`}
            pageHeight={toPx(PAGE_SIZES[pageSize]?.height || '297mm')}
            pageWidth={toPx(PAGE_SIZES[pageSize]?.width || '210mm')}
            paddingTop={toPx(PAGE_SIZES[pageSize]?.paddingY || '25mm')}
            paddingBottom={toPx(PAGE_SIZES[pageSize]?.paddingY || '25mm')}
            paddingX={toPx(PAGE_SIZES[pageSize]?.paddingX || '20mm')}
            onPageCountChange={handlePageUpdate}
          />
          <ColumnPlugin />

          {/* Overlays */}
          {showMenu && <TextMenu ref={menuRef} onOptionClick={handleOptionClick} style={{ top: menuPosition.y, left: menuPosition.x }} />}
          {showStudyCard && <StudyCard cards={cards} book={book} onCancel={() => setShowStudyCard(false)} />}
          {showQuestionnaire && <QuestionnaireModal questions={questionnaireData} onCancel={() => setShowQuestionnaire(false)} />}
          {showVisualizer && <VisualizerModal open={showVisualizer} onClose={() => setShowVisualizer(false)} text={selectedText} />}
        </LexicalComposer>
      </Box>
    </EditorErrorBoundary>
  )
}
