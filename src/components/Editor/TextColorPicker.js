import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Dropdown, Menu, MenuItem, MenuButton, IconButton, Box } from '@mui/joy'
import { Type } from 'lucide-react'

const COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' }
]

/**
 * TextColorPicker - Intuitive color picker with color swatches
 * Following Word/Google Docs pattern - shows actual colors, not "Default"
 */
const TextColorPicker = () => {
  const [editor] = useLexicalComposerContext()
  const [selectedColor, setSelectedColor] = useState('#000000')

  const handleChange = (color) => {
    setSelectedColor(color)

    editor.update(() => {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color: color || null })
      }
    })
  }

  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        slotProps={{
          root: {
            variant: 'plain',
            size: 'sm',
            sx: {
              minWidth: 32,
              position: 'relative'
            }
          }
        }}
      >
        <Type size={16} />
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 16,
            height: 3,
            bgcolor: selectedColor,
            borderRadius: '2px'
          }}
        />
      </MenuButton>
      <Menu sx={{ minWidth: 160 }}>
        {COLORS.map((color) => (
          <MenuItem
            key={color.value}
            onClick={() => handleChange(color.value)}
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'center'
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: color.value,
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'neutral.outlinedBorder'
              }}
            />
            {color.label}
          </MenuItem>
        ))}
      </Menu>
    </Dropdown>
  )
}

export default TextColorPicker
