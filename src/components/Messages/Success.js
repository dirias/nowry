import React from 'react'

const SuccessWindow = ({ title, success_msg, onClose }) => {
  return (
    <div className='backdrop'>
      <div className='modal-window'>
        <div className='modal-header'>
          <h3 className='modal-title'>{title}</h3>
          <button className='close-button' onClick={onClose}>
            X
          </button>
        </div>
        <div className='modal-content'>
          <p className='modal-message'>{success_msg}</p>
        </div>
      </div>
    </div>
  )
}

export default SuccessWindow
