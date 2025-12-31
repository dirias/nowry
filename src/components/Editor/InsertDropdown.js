import React from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $insertNodes } from 'lexical'
import { $createHorizontalRuleNode } from '../../nodes/HorizontalRuleNode'
import { Box, Dropdown, Menu, MenuItem, MenuButton, IconButton } from '@mui/joy'
import { Plus } from 'lucide-react'
import { $createImageNode } from '../../nodes/ImageNode'
import { INSERT_COLUMN_LAYOUT_COMMAND } from '../../plugin/ColumnPlugin'

const InsertDropdown = () => {
  const [editor] = useLexicalComposerContext()

  const insertLink = () => {
    const url = prompt('Enter a URL')
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url })
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL')
    if (url) {
      editor.update(() => {
        const imageNode = $createImageNode({ src: url, altText: 'Image' })
        $insertNodes([imageNode])
      })
    }
  }

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: 3, rows: 3 })
  }

  const insertLine = () => {
    editor.update(() => {
      const hrNode = $createHorizontalRuleNode()
      $insertNodes([hrNode])
    })
  }

  const insertColumns = (columns) => {
    editor.dispatchCommand(INSERT_COLUMN_LAYOUT_COMMAND, columns)
  }

  return (
    <Dropdown>
      <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'outlined', color: 'neutral', size: 'sm' } }}>
        <Plus size={16} />
      </MenuButton>
      <Menu>
        <MenuItem onClick={insertLink}>Insert Link</MenuItem>
        <MenuItem onClick={insertImage}>Insert Image</MenuItem>
        <MenuItem onClick={insertTable}>Insert Table</MenuItem>
        <MenuItem onClick={() => insertColumns(2)}>Insert 2 Columns</MenuItem>
        <MenuItem onClick={() => insertColumns(3)}>Insert 3 Columns</MenuItem>
        <MenuItem onClick={insertLine}>Insert Horizontal Line</MenuItem>
      </Menu>
    </Dropdown>
  )
}

export default InsertDropdown
