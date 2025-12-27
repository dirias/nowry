import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Select, Option } from '@mui/joy'

const COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Black', value: '#000000' }
]

const TextColorPicker = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = useState('')

  const handleChange = (_, newValue) => {
    if (newValue === undefined) return

    setValue(newValue)

    editor.update(() => {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        // Aplica color al texto seleccionado
        $patchStyleText(selection, { color: newValue || null }) // `null` remueve el color
      }
    })
  }

  return (
    <Select size='sm' value={value} onChange={handleChange} sx={{ minWidth: 120 }} placeholder='Text Color'>
      {COLORS.map((color) => (
        <Option key={color.value} value={color.value}>
          {color.label}
        </Option>
      ))}
    </Select>
  )
}

export default TextColorPicker
