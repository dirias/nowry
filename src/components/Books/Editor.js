import React, { useRef, useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import TextMenu from '../Menu/TextMenu'
import StudyCard from '../Cards/Card'
import { generateCard } from '../../api/StudyCards'

const Editor = ({ activePage, content, setContent }) => {
  const quillRef = useRef()
  const menuRef = useRef()
  const [showMenu, setShowMenu] = useState(false)
  const [showStudyCard, setShowStudyCard] = useState(false)
  const [selectedText, setSelectedText] = useState(false)
  const [cards, setCards] = useState([
    {
      title: 'What is Quantum Physics Basics?',
      content: 'Quantum physics is the study of matter and energy at the most fundamental level.'
    },
    { title: 'What is Physics?', content: 'Physics is the science that studies the universe.' }
  ])
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ['clean']
    ]
  }

  const handleEditorChange = (newContent) => {
    const quillInstance = quillRef.current.getEditor()
    const innerHTML = quillInstance.root.innerHTML

    const updatedPage = {
      ...activePage,
      content: innerHTML
    }

    setContent(updatedPage.content)
  }

  const handleRightClick = (event) => {
    event.preventDefault() // Prevent the default right-click context menu
    const selection = window.getSelection()
    setSelectedText(selection.toString())
    console.log('Right click detected, selection:', selection.toString())
    if (selection.toString().length > 0) {
      console.log('Setting menu position to:', event.pageX, event.pageY)
      setMenuPosition({ x: event.pageX, y: event.pageY })
      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }

  const handleOptionClick = async (option) => {
    console.log(`Option selected: ${option}`)
    setShowMenu(false)
    if (option === 'create_study_card') {
      console.log('selectedText', selectedText)
      if (selectedText) {
        try {
          // Here, you call the createBook function
          const response = await generateCard(selectedText, 2)
          console.log('Study card generated:', response)
          setCards(response)
          setShowStudyCard(true)
        } catch (error) {
          console.error('Error generating study card:', error)
        }
      } else {
        console.log('No text selected.')
      }
      setShowStudyCard(true) // code here
    }
  }

  return (
    <div onContextMenu={handleRightClick}>
      <ReactQuill
        ref={quillRef}
        theme='snow'
        modules={modules}
        value={content || ''}
        onChange={handleEditorChange}
        placeholder='Start typing here...'
      />
      {showMenu && (
        <TextMenu
          ref={menuRef} // Pass the menuRef to TextMenu
          onOptionClick={handleOptionClick}
          style={{ top: menuPosition.y, left: menuPosition.x }}
        />
      )}
      {showStudyCard && <StudyCard cards={cards} onCancel={() => setShowStudyCard(false)} />}
    </div>
  )
}

export default Editor
