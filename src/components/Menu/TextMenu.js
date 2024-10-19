import React, { forwardRef } from 'react'

const TextMenu = forwardRef(({ onOptionClick, style }, ref) => {
  return (
    <div className='text-menu' style={style} ref={ref}>
      <ul>
        <li onClick={() => onOptionClick('create_study_card')}>Create study card</li>
        <li onClick={() => onOptionClick('create_questionary')}>Create questionnaire</li>
        <li onClick={() => onOptionClick('generate_related_text')}>Generate related text</li>
        <li onClick={() => onOptionClick('reproduce_text')}>Reproduce text</li>
        <li onClick={() => onOptionClick('create_visual_support')}>Create visual support content</li>
      </ul>
    </div>
  )
})

// Explicitly set the display name for the component
TextMenu.displayName = 'TextMenu'

export default TextMenu
