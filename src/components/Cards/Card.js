import React from 'react'

const StudyCard = ({ cards, onCancel }) => {
  return (
    <div className='backdrop'>
      <div className='modal-window' style={{ boxSizing: 'unset' }}>
        <div className='modal-header '>
          <h3 className='modal-title'>New Studycards</h3>
          <button className='close-button' onClick={onCancel}>
            X
          </button>
        </div>
        <div className='display-column'>
          <h5>The selected card will be added to the - deck.</h5>
          <div className='display-row'>
            {cards.map((card, index) => (
              <div key={index} className='card-container'>
                <div className='title-container'>
                  <h2 className='title'>{card.title}</h2>
                </div>
                <div className='content-container'>
                  <p className='content'>{card.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudyCard
