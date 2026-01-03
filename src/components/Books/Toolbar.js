import React from 'react'
import { Box, Divider, IconButton } from '@mui/joy'
import { Save, Image as ImageIcon } from 'lucide-react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

// Toolbar components
import UndoRedo from '../Editor/UndoRedo'
import TextFormatButtons from '../Editor/TextFormatButtons'
import BlockFormatDropdown from '../Editor/BlockFormatDropdown'
import FontSizeDropdown from '../Editor/FontSizeDropdown'
import FontFamilyDropdown from '../Editor/FontFamilyDropdown'
import TextColorPicker from '../Editor/TextColorPicker'
import BgColorPicker from '../Editor/BgColorPicker'
import AlignDropdown from '../Editor/AlignDropdown'
import InsertDropdown from '../Editor/InsertDropdown'

import PageSizeDropdown from '../Editor/PageSizeDropdown'

const Toolbar = ({ onSave, pageSize, setPageSize, disabled = false }) => {
  const [editor] = useLexicalComposerContext()
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'nowrap'
      }}
    >
      {/* Undo/Redo */}
      <UndoRedo />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Page Size */}
      <PageSizeDropdown pageSize={pageSize} setPageSize={setPageSize} />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Text Format Buttons */}
      <TextFormatButtons />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Font Settings */}
      <FontFamilyDropdown />
      <FontSizeDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Block Format */}
      <BlockFormatDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Alignment */}
      <AlignDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Colors */}
      <TextColorPicker />
      <BgColorPicker />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Insert Image */}
      <IconButton size='sm' variant='plain' disabled={disabled} onClick={() => editor?.triggerImageUpload?.()} sx={{ minWidth: 32 }}>
        <ImageIcon size={16} />
      </IconButton>

      {/* Insert */}
      <InsertDropdown />
    </Box>
  )
}

export default Toolbar
