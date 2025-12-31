import React from 'react'

const WarningWindow = ({ title, error_msg, onClose, onConfirm }) => {
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
          <p className='modal-message'>{error_msg}</p>
          <div className='modal-actions'>
            <button className='confirm-button' onClick={onConfirm}>
              Yes
            </button>
            <button className='cancel-button' onClick={onClose}>
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WarningWindow
