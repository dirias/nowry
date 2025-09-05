import React, { useEffect, useState } from 'react'
import { Box } from '@mui/joy'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'

// Subcomponentes
import BlockFormatDropdown from '../Editor/BlockFormatDropdown'
import FontSizeDropdown from '../Editor/FontSizeDropdown'
import FontFamilyDropdown from '../Editor/FontFamilyDropdown'
import TextColorPicker from '../Editor/TextColorPicker'
import BgColorPicker from '../Editor/BgColorPicker'
import InsertDropdown from '../Editor/InsertDropdown'
import AlignDropdown from '../Editor/AlignDropdown'
import UndoRedo from '../Editor/UndoRedo'

const Toolbar = () => {
  const [editor] = useLexicalComposerContext()

  const [selectionInfo, setSelectionInfo] = useState({
    isBold: false,
    isItalic: false,
    blockType: 'paragraph',
    fontSize: '16px',
    fontFamily: 'Arial',
    textColor: '#000000',
    bgColor: '#ffffff',
    alignment: 'left'
  })

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          // Aquí puedes usar helpers propios para detectar estado de selección
          // Puedes usar tu lógica actual o futura aquí
          setSelectionInfo((prev) => ({
            ...prev
            // valores reales de selección según el estado
          }))
        }
      })
    })
  }, [editor])

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.level1',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <UndoRedo />
      <BlockFormatDropdown />
    </Box>
  )
}

export default Toolbar
