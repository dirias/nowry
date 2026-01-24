import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Select, Option } from '@mui/joy'

const fontFamilies = [
  { label: 'Sans Serif', value: '', display: 'system-ui, -apple-system, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif', display: 'Georgia, serif' },
  { label: 'Monospace', value: '"Courier New", monospace', display: '"Courier New", monospace' },
  { label: 'Arial', value: 'Arial, sans-serif', display: 'Arial, sans-serif' },
  { label: 'Times', value: '"Times New Roman", serif', display: '"Times New Roman", serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif', display: 'Verdana, sans-serif' }
]

/**
 * FontFamilyDropdown - Minimal font picker with preview
 * Shows actual fonts, not just names
 */
const FontFamilyDropdown = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = useState('')

  const handleChange = (_, newValue) => {
    setValue(newValue)
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-family': newValue || null })
      }
    })
  }

  return (
    <Select
      size='sm'
      value={value}
      onChange={handleChange}
      sx={{
        minWidth: 120,
        fontFamily: fontFamilies.find((f) => f.value === value)?.display || 'inherit'
      }}
      placeholder='Font'
    >
      {fontFamilies.map((font) => (
        <Option
          key={font.value || 'default'}
          value={font.value}
          sx={{
            fontFamily: font.display
          }}
        >
          {font.label}
        </Option>
      ))}
    </Select>
  )
}

export default FontFamilyDropdown
