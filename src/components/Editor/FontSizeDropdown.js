import React from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $patchStyleText } from '@lexical/selection'
import { Select, Option } from '@mui/joy'

const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

const FontSizeDropdown = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = React.useState('16px')

  const handleChange = (_, newValue) => {
    setValue(newValue)
    editor.update(() => {
      $patchStyleText({ 'font-size': newValue })
    })
  }

  return (
    <Select size='sm' value={value} onChange={handleChange} sx={{ minWidth: 90 }}>
      {fontSizes.map((size) => (
        <Option key={size} value={size}>
          {size}
        </Option>
      ))}
    </Select>
  )
}

export default FontSizeDropdown
