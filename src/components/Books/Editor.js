import React, { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Button, useTheme, Snackbar, Alert } from '@mui/joy'
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
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  $isDecoratorNode,
  FORMAT_TEXT_COMMAND,
  headers,
  TextNode
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Plugins and nodes
import RegisterListPlugin from '../../plugin/RegisterListPlugin'
import RegisterHorizontalRulePlugin from '../../plugin/RegisterHorizontalRulePlugin'
import TablePlugin from '../Editor/plugins/TablePlugin'
import SlashCommandPlugin from '../Editor/SlashCommandPlugin'
import WordCountPlugin from '../Editor/WordCountPlugin'
import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ColumnContainerNode, ColumnNode } from '../../nodes/ColumnNodes'

// UI Components
import Toolbar from './Toolbar'
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/GeneratedCards'
import QuestionnaireModal from '../Cards/QuestionnaireModal'
import VisualizerModal from '../Cards/VisualizerModal'
import { cardsService, quizzesService } from '../../api/services'
import ColumnPlugin from '../../plugin/ColumnPlugin'
import PaginationPlugin from '../Editor/plugins/PaginationPlugin'
import PageFlowPlugin from '../Editor/plugins/PageFlowPlugin'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'

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

const EditorContentUpdater = ({ content, trigger }) => {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    editor.update(() => {
      const parser = new DOMParser()
      const dom = parser.parseFromString(content || '<p></p>', 'text/html')
      const nodes = $generateNodesFromDOM(editor, dom)
      const root = $getRoot()
      root.clear()

      // Fix: Ensure only Element/Decorator nodes go to Root. Wrap others in Paragraph.
      const validNodes = []
      let currentParagraph = null

      nodes.forEach((node) => {
        if ($isElementNode(node) || $isDecoratorNode(node)) {
          if (currentParagraph) {
            validNodes.push(currentParagraph)
            currentParagraph = null
          }
          validNodes.push(node)
        } else {
          // Wrap text/linebreaks in a paragraph
          if (!currentParagraph) currentParagraph = $createParagraphNode()
          currentParagraph.append(node)
        }
      })
      if (currentParagraph) validNodes.push(currentParagraph)

      root.append(...validNodes)
    })
  }, [trigger, editor])
  return null
}

function EditorContent({ setContent }) {
  const [editor] = useLexicalComposerContext()
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor, null)
          setContent(html)
        })
      }}
    />
  )
}

export default function Editor({
  activePage,
  book,
  content,
  setContent,
  onSave,
  pageSize = 'a4',
  setPageSize,
  onPageOverflow,
  onMergeBack
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

  const editorConfig = {
    namespace: 'NowryEditor',
    theme: EditorTheme,
    onError: (e) => console.error('Lexical error:', e),
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
      ColumnNode // Multi-column support
    ],
    editorState: (editor) => {
      const parser = new DOMParser()
      // Use flattened content if in edit mode for multi-column pages
      const dom = parser.parseFromString(content || '<p></p>', 'text/html')
      const nodes = $generateNodesFromDOM(editor, dom)
      editor.update(() => {
        const root = $getRoot()
        root.clear()

        const validNodes = []
        let currentParagraph = null

        nodes.forEach((node) => {
          if ($isElementNode(node) || $isDecoratorNode(node)) {
            if (currentParagraph) {
              validNodes.push(currentParagraph)
              currentParagraph = null
            }
            validNodes.push(node)
          } else {
            if (!currentParagraph) currentParagraph = $createParagraphNode()
            currentParagraph.append(node)
          }
        })
        if (currentParagraph) validNodes.push(currentParagraph)

        root.append(...validNodes)
      })
    }
  }

  useEffect(() => {
    // When the active page changes, you can sync the external state if needed
    if (activePage?.content != null) {
      setContent(activePage.content)
    }
    // Force scroll to top when page changes or reloads
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      }, 10)
    }
  }, [activePage, setContent])

  useEffect(() => {
    // Hide context menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRightClick = (event) => {
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
  }

  const handleOptionClick = async (option) => {
    setShowMenu(false)
    setError(null)
    if (option === 'create_study_card' && selectedText) {
      try {
        const response = await cardsService.generate(selectedText, 2)
        setCards(response)
        setShowStudyCard(true)
      } catch (error) {
        console.error('Error generating study card:', error)
        const status = error.response?.status
        const msg = error.response?.data?.detail || t('subscription.errors.genericCreate')

        if (status === 403) {
          setIsLimitError(true)
          setError(t('subscription.errors.upgradeToUse'))
        } else {
          setError(msg)
        }
      }
    } else if (option === 'create_questionnaire' && selectedText) {
      try {
        // Default to easy/medium mixed, 5 questions
        const response = await quizzesService.generate(selectedText, 5, 'Medium')
        setQuestionnaireData(response)
        setShowQuestionnaire(true)
      } catch (error) {
        console.error('Error generating questionnaire:', error)
        const status = error.response?.status
        const msg = error.response?.data?.detail || t('subscription.errors.genericCreate')

        if (status === 403) {
          setIsLimitError(true)
          setError(t('subscription.errors.upgradeToUse'))
        } else {
          setError(msg)
        }
      }
    } else if (option === 'create_visual_content' && selectedText) {
      setShowVisualizer(true)
    }
  }

  // Render editable content with column support
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        bgcolor: 'background.level1',
        overflow: 'hidden', // Prevent outer scroll
        py: 0 // Remove vertical padding from root
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

      <LexicalComposer key={activePage?._id || 'editor'} initialConfig={editorConfig}>
        {/* 🧭 Toolbar - Static Flex Item */}
        <Box
          sx={{
            zIndex: 100,
            bgcolor: 'background.surface',
            borderBottom: '1px solid',
            borderColor: 'divider',
            width: '100%',
            px: 3,
            py: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            boxShadow: 'xs'
          }}
        >
          <Toolbar onSave={onSave} pageSize={pageSize} setPageSize={setPageSize} />
        </Box>
        {/* 📄 Main "sheet" area - Scrollable */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'block', // Use block for scroll container
            width: '100%',
            overflow: 'auto', // Independent scrolling
            pb: 12,
            pt: 4
          }}
          onContextMenu={handleRightClick}
          ref={containerRef}
        >
          <Box
            sx={{
              position: 'relative',
              width: toPx(PAGE_SIZES[pageSize]?.width || '210mm'),
              height: toPx(PAGE_SIZES[pageSize]?.height || '297mm'),
              mx: 'auto', // Center horizontally
              bgcolor: '#fff',
              borderRadius: 'md',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #ddd',
              px: '2.5cm',
              py: '2.5cm',
              overflow: 'hidden'
            }}
          >
            <RichTextPlugin
              contentEditable={<ContentEditable className='editor-content' />}
              placeholder={<div className='editor-placeholder'>Start typing here...</div>}
            />
          </Box>
        </Box>
        {/* Plugins */}
        <EditorContentUpdater content={content} trigger={activePage?._id || activePage?.clientKey} />
        <PageFlowPlugin onMergeBack={onMergeBack} />
        <EditorContent setContent={setContent} />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <RegisterListPlugin />
        <RegisterHorizontalRulePlugin />
        <SlashCommandPlugin />
        <TablePlugin />
        <WordCountPlugin />
        <PaginationPlugin pageHeight={toPx(PAGE_SIZES[pageSize]?.height || '297mm') - toPx('5cm')} onOverflow={onPageOverflow} />
        <ColumnPlugin /> {/* Multi-column support */}
      </LexicalComposer>

      {/* Context menu + Study card */}
      {showMenu && (
        <TextMenu
          ref={menuRef}
          onOptionClick={handleOptionClick}
          style={{
            top: menuPosition.y,
            left: menuPosition.x
          }}
        />
      )}

      {showStudyCard && <StudyCard cards={cards} book={book} onCancel={() => setShowStudyCard(false)} />}
      {showQuestionnaire && <QuestionnaireModal questions={questionnaireData} onCancel={() => setShowQuestionnaire(false)} />}
      {showVisualizer && <VisualizerModal open={showVisualizer} onClose={() => setShowVisualizer(false)} text={selectedText} />}
    </Box>
  )
}
