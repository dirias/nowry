import React from 'react'

export default function Book({ book, handleBookClick, handleContextMenu }) {
  const { cover_color, cover_image, title, author, isbn } = book

  const bookStyle = {
    backgroundColor: cover_color || '#4CAF50', // Fallback to white if no cover_color
    backgroundImage: cover_image ? `url(${cover_image})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '20px',
    borderRadius: '8px',
    color: cover_image ? '#fff' : '#fff' // Use white text on image backgrounds for better readability
  }

  return (
    <div
      className='book'
      key={book._id}
      style={bookStyle}
      onClick={() => handleBookClick(book)}
      onContextMenu={(event) => handleContextMenu(event, book)}
    >
      <div>{title}</div>
      <div>{author}</div>
      <div>{isbn}</div>
    </div>
  )
}
