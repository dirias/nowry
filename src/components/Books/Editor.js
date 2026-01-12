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
import { $createPageNode } from '../../nodes/PageNode'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Plugins and nodes
import RegisterListPlugin from '../../plugin/RegisterListPlugin'
import RegisterHorizontalRulePlugin from '../../plugin/RegisterHorizontalRulePlugin'
import TablePlugin from '../Editor/plugins/TablePlugin'
import SlashCommandPlugin from '../Editor/SlashCommandPlugin'
import WordCountPlugin from '../Editor/WordCountPlugin'
import ContinuousPaginationPlugin from '../Editor/plugins/ContinuousPaginationPlugin'
import ImageUploadPlugin from '../Editor/plugins/ImageUploadPlugin'
import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { PageNode } from '../../nodes/PageNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
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

function EditorSyncPlugin({ onHtmlChange }) {
  const [editor] = useLexicalComposerContext()
  const previousHtml = useRef('')
  const isUpdating = useRef(false)

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        // Prevent re-entrant calls
        if (isUpdating.current) return

        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor, null)
          // Only call onHtmlChange if HTML actually changed
          if (html !== previousHtml.current) {
            previousHtml.current = html
            isUpdating.current = true

            // Use setTimeout to break out of the current event loop
            setTimeout(() => {
              onHtmlChange(html)
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
  const navigate = useNavigate()
  const { t } = useTranslation()

  // We keep track of content for auto-save, though ideally EditorHome handles the heavy lifting
  // But SyncPlugin pushes updates up
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

  // Page Tracking Logic (Count + Preview - lightweight text only)
  useEffect(() => {
    if (!containerRef.current) return

    const updatePages = () => {
      if (!containerRef.current) return
      const now = performance.now()
      // Throttle to avoid excessive captures during rapid edits
      if (now - lastPageCaptureTsRef.current < 100) return
      lastPageCaptureTsRef.current = now

      const MAX_PREVIEW_CHARS = 8000
      const pageElements = containerRef.current.querySelectorAll('.editor-page')
      const pagesData = Array.from(pageElements).map((el, index) => {
        const html = (el.innerHTML || '').slice(0, MAX_PREVIEW_CHARS)
        return { index, content: html }
      })

      // Prevent unnecessary updates: track count + text lengths
      const currentPagesJson = JSON.stringify(pagesData.map((p) => `${p.index}:${p.content.length}`))

      if (lastPagesJsonRef.current !== currentPagesJson) {
        lastPagesJsonRef.current = currentPagesJson
        if (onPageCountChange) {
          onPageCountChange(pagesData)
        }
      }
    }

    // Call immediately for fast initial load
    updatePages()

    // Also schedule after RAF for updated content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updatePages()
      })
    })

    const observer = new MutationObserver(() => {
      // rAF throttle for responsive sidebar updates
      if (pageUpdateTimeoutRef.current) clearTimeout(pageUpdateTimeoutRef.current)
      pageUpdateTimeoutRef.current = requestAnimationFrame(updatePages)
    })

    // We observe the containerRef for content changes
    observer.observe(containerRef.current, { childList: true, subtree: true, characterData: true })

    return () => {
      observer.disconnect()
      if (pageUpdateTimeoutRef.current) cancelAnimationFrame(pageUpdateTimeoutRef.current)
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
        ColumnNode
      ],
      editorState: (editor) => {
        const parser = new DOMParser()
        const sanitized = DOMPurify.sanitize(initialContent || '<p></p>')
        const dom = parser.parseFromString(sanitized, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)
        editor.update(() => {
          const root = $getRoot()
          root.clear()

          // Create the first page container
          const firstPage = $createPageNode()
          root.append(firstPage)

          // Append all nodes to first page; pagination plugin will split across pages
          nodes.forEach((node) => {
            firstPage.append(node)
          })

          // Ensure at least one paragraph for focus
          if (firstPage.getChildren().length === 0) {
            firstPage.append($createParagraphNode())
          }
        })
      },
      onError: (e) => console.error('Lexical error:', e)
    }),
    [book?._id, initialContent] // Re-init if book ID changes. initialContent only matters on mount logic usually.
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
            sx={{
              position: 'relative',
              // If Zoom < 1, force fixed page width so it scales down the "print layout"
              // If Zoom >= 1, allow fluid width on mobile for editing
              width: pageZoom < 1 ? fixedWidth : { xs: '100%', md: fixedWidth },
              maxWidth: pageZoom < 1 ? 'none' : '100%', // Allow overflow if scaled down
              minHeight: { xs: '500px', md: fixedHeight },
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `scale(${pageZoom})`,
              transformOrigin: 'top center',
              // Responsive Variables for PageNode
              '--page-width': pageZoom < 1 ? fixedWidth : { xs: '100%', md: fixedWidth },
              '--page-height': fixedHeight,
              '--page-py': '96px', // Always enforce Print vertical margins for pagination consistency
              '--page-px': pageZoom < 1 ? '96px' : { xs: '24px', md: '96px' }
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
                  style={{
                    outline: 'none',
                    width: '100%',
                    display: 'block',
                    overflow: 'visible'
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
          <EditorSyncPlugin onHtmlChange={setInternalContent} />
          <ImageUploadPlugin bookId={book?._id} onUploadComplete={onImageUpload} />
          <HistoryPlugin />
          {/* <AutoFocusPlugin /> */}
          <RegisterListPlugin />
          <RegisterHorizontalRulePlugin />
          <SlashCommandPlugin />
          <TablePlugin />
          <WordCountPlugin />
          <ContinuousPaginationPlugin key={`pagination-${pageSize}`} pageHeight={toPx(PAGE_SIZES[pageSize]?.height || '297mm')} />
          <ColumnPlugin />
          <ImageUploadPlugin bookId={book?._id} />

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
