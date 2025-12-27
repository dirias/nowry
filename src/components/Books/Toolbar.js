import React from 'react'
import { Box, Divider, IconButton } from '@mui/joy'
import { Save } from 'lucide-react'

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

const Toolbar = ({ onSave }) => {
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

      {/* Insert */}
      <InsertDropdown />

      {onSave && (
        <>
          <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

          {/* Save Button */}
          <IconButton variant='soft' color='success' size='sm' onClick={onSave}>
            <Save size={18} />
          </IconButton>
        </>
      )}
    </Box>
  )
}

export default Toolbar
