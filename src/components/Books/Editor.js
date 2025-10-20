import React, { useRef, useEffect, useState } from 'react'
import { Box, Typography, useTheme } from '@mui/joy'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'
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

// UI Components
import Toolbar from './Toolbar'
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/GeneratedCards'
import { generateCard } from '../../api/StudyCards'

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
    code: 'editor-textCode'
  }
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

export default function Editor({ activePage, content, setContent }) {
  const theme = useTheme()
  const menuRef = useRef()
  const containerRef = useRef()
  const [showMenu, setShowMenu] = useState(false)
  const [showStudyCard, setShowStudyCard] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [cards, setCards] = useState([])
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const editorConfig = {
    namespace: 'NowryEditor',
    theme: EditorTheme,
    onError: (e) => console.error('Lexical error:', e),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, AutoLinkNode, LinkNode, HorizontalRuleNode, ImageNode],
    editorState: (editor) => {
      const parser = new DOMParser()
      const dom = parser.parseFromString(content || '<p></p>', 'text/html')
      const nodes = $generateNodesFromDOM(editor, dom)
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        root.append(...nodes)
      })
    }
  }

  useEffect(() => {
    // When the active page changes, you can sync the external state if needed
    if (activePage?.content != null) {
      setContent(activePage.content)
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
    if (option === 'create_study_card' && selectedText) {
      try {
        const response = await generateCard(selectedText, 2)
        setCards(response)
        setShowStudyCard(true)
      } catch (error) {
        console.error('Error generating study card:', error)
      }
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        bgcolor: 'background.level1',
        overflow: 'auto',
        py: 3
      }}
    >
      <LexicalComposer key={activePage?._id || 'editor'} initialConfig={editorConfig}>
        {/* 🧭 Floating toolbar inside LexicalComposer */}
        <Box
          sx={{
            position: 'sticky',
            top: 12,
            zIndex: 10,
            bgcolor: 'background.body',
            boxShadow: 'sm',
            borderRadius: 'lg',
            px: 2,
            py: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            mb: 3,
            width: 'auto',
            minWidth: 'fit-content'
          }}
        >
          <div className='editor-toolbar'>
            <Toolbar /> {/* ✅ now inside Lexical context */}
          </div>
        </Box>

        {/* 📄 Main “sheet” area */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            pb: 6
          }}
          onContextMenu={handleRightClick}
          ref={containerRef}
        >
          <Box
            sx={{
              position: 'relative',
              width: '21cm',
              minHeight: '29.7cm',
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
        <EditorContent setContent={setContent} />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <RegisterListPlugin />
        <RegisterHorizontalRulePlugin />
        <SlashCommandPlugin />
        <TablePlugin />
        <WordCountPlugin />
      </LexicalComposer>

      {/* 📊 Word count footer */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 12,
          right: 24,
          px: 2,
          py: 1,
          fontSize: 'sm',
          color: 'text.secondary',
          bgcolor: 'background.level2',
          borderRadius: 'md',
          boxShadow: 'sm'
        }}
      >
        Words: 0 | Characters: 0
      </Box>

      {/* Context menu + Study card */}
      {showMenu && (
        <Box
          ref={menuRef}
          sx={{
            position: 'absolute',
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 1000,
            bgcolor: 'white',
            boxShadow: 'md',
            borderRadius: 'sm'
          }}
        >
          <TextMenu onOptionClick={handleOptionClick} />
        </Box>
      )}

      {showStudyCard && <StudyCard cards={cards} onCancel={() => setShowStudyCard(false)} />}
    </Box>
  )
}
