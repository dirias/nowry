import React, { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND
} from 'lexical'
import { $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection'
import { Select, Option, IconButton, Stack, Box } from '@mui/joy'
import { Minus, Plus } from 'lucide-react'

const FONT_SIZES = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px', '72px']

const FontSizeDropdown = () => {
  const [editor] = useLexicalComposerContext()
  const [value, setValue] = useState('16px')

  const updateFontSize = useCallback(
    (newSize) => {
      setValue(newSize)
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { 'font-size': newSize })
        }
      })
    },
    [editor]
  )

  const handleSelectionChange = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const styleValue = $getSelectionStyleValueForProperty(selection, 'font-size', '16px')
        setValue(styleValue)
      }
    })
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        handleSelectionChange()
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor, handleSelectionChange])

  const handleIncrement = (increment) => {
    const currentIndex = FONT_SIZES.indexOf(value)
    if (currentIndex === -1) return

    const nextIndex = currentIndex + increment
    if (nextIndex >= 0 && nextIndex < FONT_SIZES.length) {
      updateFontSize(FONT_SIZES[nextIndex])
    }
  }

  return (
    <Stack direction='row' alignItems='center' spacing={0.5} sx={{ px: 0.5 }}>
      <IconButton size='sm' variant='plain' color='neutral' onClick={() => handleIncrement(-1)} disabled={FONT_SIZES.indexOf(value) <= 0}>
        <Minus size={14} />
      </IconButton>

      <Select
        size='sm'
        value={value}
        onChange={(_, newValue) => updateFontSize(newValue)}
        sx={{
          minWidth: 70,
          boxShadow: 'none',
          bgcolor: 'transparent',
          '&:hover': { bgcolor: 'background.level1' },
          borderColor: 'transparent',
          '--Select-radius': '6px'
        }}
        slotProps={{
          listbox: {
            sx: {
              minWidth: 80,
              maxHeight: 300
            }
          }
        }}
      >
        {FONT_SIZES.map((size) => (
          <Option key={size} value={size}>
            {size.replace('px', '')}
          </Option>
        ))}
      </Select>

      <IconButton
        size='sm'
        variant='plain'
        color='neutral'
        onClick={() => handleIncrement(1)}
        disabled={FONT_SIZES.indexOf(value) >= FONT_SIZES.length - 1}
      >
        <Plus size={14} />
      </IconButton>
    </Stack>
  )
}

export default FontSizeDropdown
