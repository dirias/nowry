import React, { useRef, useEffect, useState } from 'react'
import { Box, Typography, useTheme } from '@mui/joy'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import RegisterListPlugin from '../../plugin/RegisterListPlugin'
import { $getRoot } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import Toolbar from './Toolbar'
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/GeneratedCards'
import { generateCard } from '../../api/StudyCards'

import { HorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { ImageNode } from '../../nodes/ImageNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'

const EditorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3'
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

const Editor = ({ activePage, content, setContent }) => {
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
    if (activePage?.content) {
      setContent(activePage.content)
    }
  }, [activePage, setContent])

  useEffect(() => {
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
    <Box sx={{ p: 2, height: '100%', bgcolor: 'background.body' }}>
      <Typography level='body-sm' sx={{ mb: 1, color: 'text.secondary' }}>
        Editor de contenido
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
        <Typography fontWeight='md'>Nowry Editor</Typography>
      </Box>

      <Box
        ref={containerRef}
        onContextMenu={handleRightClick}
        sx={{
          height: 'calc(100vh - 180px)',
          overflowY: 'auto',
          px: 2,
          py: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'md',
          bgcolor: theme.vars.palette.background.surface
        }}
      >
        <LexicalComposer initialConfig={editorConfig}>
          <Toolbar />
          <RichTextPlugin
            contentEditable={<ContentEditable className='editor-content' />}
            placeholder={<div className='editor-placeholder'>Empieza a escribir aquí...</div>}
          />
          <EditorContent setContent={setContent} />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <RegisterListPlugin />
        </LexicalComposer>
      </Box>

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

export default Editor
