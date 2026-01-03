import React, { useState, useRef, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Dropdown, Menu, MenuItem, MenuButton, IconButton } from '@mui/joy'
import { Palette } from 'lucide-react'

const BG_COLORS = [
  { label: 'No Highlight', value: '' },
  { label: 'Yellow', value: '#fde047' },
  { label: 'Light Green', value: '#bbf7d0' },
  { label: 'Light Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fdba74' },
  { label: 'Gray', value: '#e5e7eb' }
]

const BgColorPicker = () => {
  const [editor] = useLexicalComposerContext()
  const savedSelectionRef = useRef(null)

  // Save selection when dropdown opens
  const handleDropdownOpen = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // Clone the selection to save it
        savedSelectionRef.current = {
          anchor: selection.anchor,
          focus: selection.focus
        }
      }
    })
  }, [editor])

  const applyBackgroundColor = useCallback(
    (color) => {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          $patchStyleText(selection, { 'background-color': color || null })
        }
      })

      // Refocus the editor
      setTimeout(() => {
        editor.focus()
      }, 0)
    },
    [editor]
  )

  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        slotProps={{ root: { variant: 'outlined', color: 'neutral', size: 'sm' } }}
        onMouseDown={(e) => {
          // Prevent default to try to preserve selection
          e.preventDefault()
          handleDropdownOpen()
        }}
      >
        <Palette size={16} />
      </MenuButton>
      <Menu>
        {BG_COLORS.map((bg) => (
          <MenuItem
            key={bg.value}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
            onClick={() => applyBackgroundColor(bg.value)}
            sx={{
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 16,
                height: 16,
                backgroundColor: bg.value || '#fff',
                border: '1px solid #ccc',
                borderRadius: '2px',
                marginRight: 1
              }
            }}
          >
            {bg.label}
          </MenuItem>
        ))}
      </Menu>
    </Dropdown>
  )
}

export default BgColorPicker
