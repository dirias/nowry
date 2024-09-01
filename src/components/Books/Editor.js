import React, { useRef, useEffect } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const Editor = ({ activePage, content, setContent }) => {
  const quillRef = useRef()

  useEffect(() => {
    // Ensure the content is set correctly when activePage changes
    if (activePage && activePage.content) {
      setContent(activePage.content)
    }
  }, [activePage, setContent])

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

  const handleEditorChange = async (newContent) => {
    const quillInstance = quillRef.current.getEditor()
    const innerHTML = quillInstance.root.innerHTML

    // Update activePage content without directly mutating state
    const updatedPage = {
      ...activePage,
      content: innerHTML
    }
    activePage.content = innerHTML

    setContent(updatedPage.content)

    console.log('Updated innerHTML:', innerHTML)
    console.log('Updated activePage:', updatedPage)
  }

  return (
    <div>
      <ReactQuill
        ref={quillRef}
        theme='snow'
        modules={modules}
        value={content || ''}
        onChange={handleEditorChange}
        placeholder='Start typing here...'
      />
    </div>
  )
}

export default Editor
