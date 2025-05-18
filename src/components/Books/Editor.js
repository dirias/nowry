import React, { useRef, useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/GeneratedCards'
import { generateCard } from '../../api/StudyCards'
import { Box, Card, Typography, useTheme } from '@mui/joy'

const Editor = ({ activePage, content, setContent }) => {
  const quillRef = useRef()
  const menuRef = useRef()
  const [showMenu, setShowMenu] = useState(false)
  const [showStudyCard, setShowStudyCard] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [cards, setCards] = useState([])
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const theme = useTheme()

  useEffect(() => {
    if (activePage && activePage.content) {
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

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ header: 1 }, { header: 2 }],
      [{ color: [] }, { background: [] }],
      ['blockquote', 'code-block'],
      [{ align: [] }],
      ['clean']
    ]
  }

  const handleEditorChange = () => {
    const quillInstance = quillRef.current.getEditor()
    const updatedHTML = quillInstance.root.innerHTML
    setContent(updatedHTML)
  }

  const handleRightClick = (event) => {
    event.preventDefault()
    const selection = window.getSelection()
    const text = selection.toString()
    if (text.trim().length > 0) {
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
      onContextMenu={handleRightClick}
      sx={{
        position: 'relative',
        p: 2,
        bgcolor: 'background.body',
        borderRadius: 'md',
        boxShadow: 'sm'
      }}
    >
      <Typography level='body-sm' sx={{ mb: 1, color: 'text.secondary' }}>
        Editor de contenido
      </Typography>

      <Card variant='outlined' sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 200 }}>
        <ReactQuill
          ref={quillRef}
          theme='snow'
          modules={modules}
          value={content || ''}
          onChange={handleEditorChange}
          placeholder='Empieza a escribir aquí...'
          style={{ border: 'none', backgroundColor: theme.vars.palette.background.surface }}
        />
      </Card>

      {showMenu && (
        <Box
          sx={{
            position: 'absolute',
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 2000,
            transition: 'opacity 0.2s ease',
            opacity: showMenu ? 1 : 0
          }}
        >
          <TextMenu ref={menuRef} onOptionClick={handleOptionClick} />
        </Box>
      )}

      {showStudyCard && <StudyCard cards={cards} onCancel={() => setShowStudyCard(false)} />}
    </Box>
  )
}

export default Editor
