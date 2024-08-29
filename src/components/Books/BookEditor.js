import React, { useState } from 'react'
import { SketchPicker } from 'react-color'
import Book from './Book'
import { editBook } from '../../api/Books'
import { SuccessWindow } from '../Messages'

const BookEditor = ({ book, refreshBooks, onCancel }) => {
  console.log(book)
  const [title, setTitle] = useState(book.title)
  const [author] = useState(book.author)
  const [createdAt] = useState(new Date(book.created_at) || new Date())
  const [updatedAt] = useState(new Date(book.updated_at) || new Date())
  const [pageLimit] = useState(book.page_limit)
  const [coverImage, setCoverImage] = useState(book.cover_image)
  const [coverColor, setCoverColor] = useState(book.cover_color)
  const [summary, setSummary] = useState(book.summary)
  const [tags, setTags] = useState(book.tags || [])
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const [newTag, setNewTag] = useState('')

  const handleSave = async () => {
    const updatedData = {
      title,
      coverImage,
      coverColor,
      summary,
      tags
    }
    console.log(updatedData, 'updatedData')
    try {
      await editBook(book._id, updatedData)
      console.log('Book updated successfully')
      refreshBooks()
      onCancel()
    } catch (error) {
      console.error('Error updating book:', error)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() !== '') {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (index) => {
    const updatedTags = tags.filter((_, i) => i !== index)
    setTags(updatedTags)
  }

  return (
    <div className='backdrop'>
      <div className='modal-window' style={{ boxSizing: 'unset' }}>
        <div className='modal-header'>
          <h3 className='modal-title'>Book Details</h3>
          <div className='tags-group display-row'>
            <label style={{ alignContent: 'center' }}>Tags </label>
            <div className='tags-input'>
              {tags.map((tag, index) => (
                <div className='tag-item' key={index}>
                  {tag}
                  <span className='tag-close' onClick={() => handleRemoveTag(index)}>
                    &times;
                  </span>
                </div>
              ))}
              <input
                type='text'
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder='Add a tag and press Enter'
              />
            </div>
          </div>
          <button className='close-button' onClick={onCancel}>
            X
          </button>
        </div>
        <div className='modal-content'>
          <div className='display-row'>
            <div style={{ width: '40%' }}>
              <div className='title-group'>
                <label>Title</label>
                <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className='display-row'>
                <div className='overview'>
                  <label>Cover Color</label>
                  <div
                    className='color-swatch'
                    style={{ backgroundColor: coverColor || '#fff' }}
                    onClick={() => setDisplayColorPicker(!displayColorPicker)}
                  />
                  {displayColorPicker && (
                    <div className='popover'>
                      <div className='cover' onClick={() => setDisplayColorPicker(false)} />
                      <SketchPicker color={coverColor} onChangeComplete={(color) => setCoverColor(color.hex)} />
                    </div>
                  )}
                </div>
                <div>
                  <Book book={{ cover_color: coverColor, title: title }} handleBookClick={null} handleContextMenu={null} />
                </div>
              </div>
            </div>

            <div style={{ width: '40%' }}>
              <div className='display-column'>
                <label>Cover Image URL</label>
                <input type='text' value={coverImage} onChange={(e) => setCoverImage(e.target.value)} disabled />
              </div>

              <div className='display-column'>
                <label>Summary</label>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} style={{ height: '150px', maxHeight: '150px' }} />
              </div>
            </div>
          </div>

          <div className='button-group'>
            <p>
              <i>
                Created at {createdAt.toLocaleDateString()}, last update done at {updatedAt.toLocaleDateString()}. {pageLimit} pages limit.
              </i>
            </p>
            <button className='cancel-button' onClick={onCancel}>
              Cancel
            </button>
            <button className='save-button' onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookEditor
