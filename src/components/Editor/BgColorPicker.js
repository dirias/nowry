import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $patchStyleText } from '@lexical/selection'
import { Select, Option } from '@mui/joy'

const BG_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Yellow', value: '#fde047' },
  { label: 'Light Green', value: '#bbf7d0' },
  { label: 'Light Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fdba74' },
  { label: 'Gray', value: '#e5e7eb' }
]

const BgColorPicker = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = useState('')

  const handleChange = (_, newValue) => {
    setValue(newValue)
    editor.update(() => {
      $patchStyleText({
        'background-color': newValue
      })
    })
  }

  return (
    <Select size='sm' value={value} onChange={handleChange} sx={{ minWidth: 140 }}>
      {BG_COLORS.map((bg) => (
        <Option key={bg.value} value={bg.value}>
          {bg.label}
        </Option>
      ))}
    </Select>
  )
}

export default BgColorPicker
