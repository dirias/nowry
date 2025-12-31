import React from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_ELEMENT_COMMAND } from 'lexical'
import { Dropdown, Menu, MenuItem, MenuButton, IconButton } from '@mui/joy'

import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'

const AlignDropdown = () => {
  const [editor] = useLexicalComposerContext()

  const setAlign = (alignment) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment)
  }

  return (
    <Dropdown>
      <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'outlined', color: 'neutral', size: 'sm' } }}>
        <AlignLeft size={16} />
      </MenuButton>
      <Menu>
        <MenuItem onClick={() => setAlign('left')}>
          <AlignLeft size={16} style={{ marginRight: 8 }} />
          Align Left
        </MenuItem>
        <MenuItem onClick={() => setAlign('center')}>
          <AlignCenter size={16} style={{ marginRight: 8 }} />
          Align Center
        </MenuItem>
        <MenuItem onClick={() => setAlign('right')}>
          <AlignRight size={16} style={{ marginRight: 8 }} />
          Align Right
        </MenuItem>
        <MenuItem onClick={() => setAlign('justify')}>
          <AlignJustify size={16} style={{ marginRight: 8 }} />
          Justify
        </MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default AlignDropdown
