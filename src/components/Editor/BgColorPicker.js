import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Dropdown, Menu, MenuItem, MenuButton, IconButton, Box } from '@mui/joy'
import { Highlighter } from 'lucide-react'

const BG_COLORS = [
  { label: 'No highlight', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bae6fd' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' }
]

/**
 * BgColorPicker - Intuitive highlight color picker
 * Following Word/Google Docs pattern - shows actual colors
 */
const BgColorPicker = () => {
  const [editor] = useLexicalComposerContext()
  const [selectedColor, setSelectedColor] = useState('')

  const handleChange = (color) => {
    setSelectedColor(color)

    editor.update(() => {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': color || null })
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
        <Highlighter size={16} />
        {selectedColor && (
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
        )}
      </MenuButton>
      <Menu sx={{ minWidth: 160 }}>
        {BG_COLORS.map((color) => (
          <MenuItem
            key={color.value || 'none'}
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
                bgcolor: color.value || 'transparent',
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

export default BgColorPicker
