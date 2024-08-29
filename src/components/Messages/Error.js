import React from 'react'

const ErrorWindow = ({ title, error_msg, onClose }) => {
  return (
    <div className='error-window'>
      <div className='error-header'>
        <h3 className='error-title'>{title}</h3>
        <button className='close-button' onClick={onClose}>
          X
        </button>
      </div>
      <div className='error-content'>
        <p className='error-message'>{error_msg}</p>
      </div>
    </div>
  )
}

export default ErrorWindow
