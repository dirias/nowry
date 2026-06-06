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
import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode, $createCodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { ColumnContainerNode, ColumnNode } from '../../nodes/ColumnNodes'
import { CalloutNode } from '../../nodes/CalloutNode'

// UI Components
import TextMenu from '../Menu/TextMenu'
// Heavy UI Components (Lazy Loaded for performance)
const StudyCard = React.lazy(() => import('../Cards/GeneratedCards'))
const QuestionnaireModal = React.lazy(() => import('../Cards/QuestionnaireModal'))
const VisualizerModal = React.lazy(() => import('../Cards/VisualizerModal'))
import { booksService, cardsService, quizzesService } from '../../api/services'
import ColumnPlugin from '../../plugin/ColumnPlugin'
import FloatingToolbarPlugin from '../Editor/plugins/FloatingToolbarPlugin'
import LinkPreviewPlugin from '../Editor/plugins/LinkPreviewPlugin'
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

function EditorEditablePlugin({ isReadOnly }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!isReadOnly)
  }, [editor, isReadOnly])
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
  isReadOnly = false,
  onEditorReady, // NEW: callback fires with editor instance when Lexical mounts
  illustrationCount = 0, // NEW: threaded from EditorHome → FloatingToolbarPlugin → TextMenu
  tier = 'free' // NEW: threaded from EditorHome → FloatingToolbarPlugin → TextMenu
}) {
  const theme = useTheme()
  const menuRef = useRef()
  const containerRef = useRef()
  const editorInstanceRef = useRef(null)
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
  const [questionnaireData, setQuestionnaireData] = useState([])
  const [error, setError] = useState(null)
  const [isLimitError, setIsLimitError] = useState(false)
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
        CalloutNode
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
  const handleDiagramInsert = useCallback((mermaidCode) => {
    const editor = editorInstanceRef.current
    if (editor) {
      editor.update(() => {
        const root = $getRoot()
        const codeNode = $createCodeNode('mermaid')
        codeNode.append($createTextNode(mermaidCode))

        // Prefer the pre-captured anchor key (selection is gone when modal closes)
        const anchorKey = diagramAnchorKeyRef.current
        diagramAnchorKeyRef.current = null
        const anchorBlock = anchorKey ? $getNodeByKey(anchorKey) : null

        if (anchorBlock && anchorBlock.getParent() === root) {
          // Insert right below the paragraph the user selected
          anchorBlock.insertAfter(codeNode)
        } else {
          // Fallback: try current selection
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

        // Trailing empty paragraph so cursor lands somewhere editable
        const trailingParagraph = $createParagraphNode()
        codeNode.insertAfter(trailingParagraph)
        trailingParagraph.select()
      })
    }
    setShowDiagramPanel(false)
  }, [])

  const handleOptionClick = useCallback(
    async (option, overrideText) => {
      const textToProcess = overrideText || selectedText
      setError(null)
      try {
        if (option === 'create_study_card' && textToProcess) {
          const response = await cardsService.generate(textToProcess, 2)
          setCards(response)
          setShowStudyCard(true)
        } else if (option === 'create_questionnaire' && textToProcess) {
          const response = await quizzesService.generate(textToProcess, 5, 'Medium')
          setQuestionnaireData(response)
          setShowQuestionnaire(true)
        } else if (option === 'create_visual_content' && textToProcess) {
          setShowVisualizer(true)
        } else if (option === 'extract_vocabulary' && textToProcess) {
          const response = await cardsService.generate(textToProcess, 50, EXTRACT_VOCABULARY_PROMPT)
          setCards(response)
          setShowStudyCard(true)
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
    [selectedText, t, book]
  )

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
          <EditorEditablePlugin isReadOnly={isReadOnly} />
          <EditorSyncPlugin onContentChange={setInternalContent} />
          <ImageUploadPlugin bookId={book?._id} onUploadComplete={onImageUpload} onUploadError={(msg) => setError(msg)} />
          <CodePastePlugin />
          <HistoryPlugin />
          {/* <AutoFocusPlugin /> */}
          <RegisterListPlugin />
          <RegisterHorizontalRulePlugin />
          <SlashCommandPlugin />
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
            tier={tier}
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
            {showStudyCard && <StudyCard cards={cards} book={book} onCancel={() => setShowStudyCard(false)} />}
            {showQuestionnaire && <QuestionnaireModal questions={questionnaireData} onCancel={() => setShowQuestionnaire(false)} />}
            {showVisualizer && <VisualizerModal open={showVisualizer} onClose={() => setShowVisualizer(false)} text={selectedText} />}
          </React.Suspense>
        </LexicalComposer>
      </Box>
    </EditorErrorBoundary>
  )
}
