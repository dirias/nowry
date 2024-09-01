import React from 'react'
import { Plus } from 'lucide-react'

export default function PageOverview({ pages, setActivePage, setContent, handleSavePage }) {
  const changeActivaPage = (page) => {
    setActivePage(page)
    setContent(page.content) // Update content when switching pages
    console.log('page from overview', page)
  }

  return (
    <div className='book-sidebar'>
      <h2>Overview</h2>
      <div className='pages-overview-container'>
        {pages.map((page, index) => (
          <div key={index} className='page-overview' onClick={() => changeActivaPage(page)}>
            <div className='page-number'>{index + 1}</div>
            <div className='page-content' dangerouslySetInnerHTML={{ __html: page.content }} />
          </div>
        ))}
        <div className='page-add' onClick={() => handleSavePage(null)}>
          <Plus />
        </div>
      </div>
    </div>
  )
}
