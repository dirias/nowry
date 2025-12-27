import React, { forwardRef } from 'react'

const TextMenu = forwardRef(({ onOptionClick, style }, ref) => {
  const options = [
    { label: 'Create study card', value: 'create_study_card' },
    { label: 'Create questionnaire', value: 'create_questionnaire' },
    { label: 'Generate related text', value: 'generate_related_text' },
    { label: 'Reproduce text', value: 'reproduce_text' },
    { label: 'Create visual support content', value: 'create_visual_content' }
  ]

  return (
    <div className='text-menu' style={style} ref={ref}>
      <ul>
        {options.map((option) => (
          <li key={option.value} onClick={() => onOptionClick(option.value)}>
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  )
})

// Explicitly set the display name for the component
TextMenu.displayName = 'TextMenu'

export default TextMenu
