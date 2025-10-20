import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $patchStyleText } from '@lexical/selection'
import { Select, Option } from '@mui/joy'

const fontFamilies = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' }
]

const FontFamilyDropdown = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = useState('')

  const handleChange = (_, newValue) => {
    setValue(newValue)
    editor.update(() => {
      $patchStyleText({
        'font-family': newValue
      })
    })
  }

  return (
    <Select size='sm' value={value} onChange={handleChange} sx={{ minWidth: 150 }}>
      {fontFamilies.map((font) => (
        <Option key={font.value} value={font.value}>
          {font.label}
        </Option>
      ))}
    </Select>
  )
}

export default FontFamilyDropdown
