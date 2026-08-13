import React, { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Dropdown, Menu, MenuButton, MenuItem, Box, Typography, IconButton, Tooltip } from '@mui/joy'
import { Table as TableIcon } from 'lucide-react'
import { INSERT_TABLE_COMMAND } from './plugins/TablePlugin'

const GRID_SIZE = 10

const TableGridPicker = () => {
  const [editor] = useLexicalComposerContext()
  const [hoveredSize, setHoveredSize] = useState({ rows: 0, cols: 0 })

  const handleCellClick = (rows, cols) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows, columns: cols })
  }

  return (
    <Dropdown>
      <Tooltip title='Insert Table' variant='soft'>
        <MenuButton
          slots={{ root: IconButton }}
          slotProps={{
            root: {
              variant: 'plain',
              size: 'sm',
              sx: { minWidth: 32 }
            }
          }}
        >
          <TableIcon size={16} />
        </MenuButton>
      </Tooltip>
      <Menu
        sx={{
          p: 1.5,
          minWidth: 'auto',
          boxShadow: 'md',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: 'neutral.outlinedBorder',
          bgcolor: 'background.surface'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography level='body-xs' fontWeight='bold' textAlign='center' textColor='primary.plainColor'>
            {hoveredSize.rows > 0 ? `${hoveredSize.rows} x ${hoveredSize.cols} Table` : 'Select size'}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gap: '4px',
              p: 0.5
            }}
            onMouseLeave={() => setHoveredSize({ rows: 0, cols: 0 })}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const r = Math.floor(idx / GRID_SIZE) + 1
              const c = (idx % GRID_SIZE) + 1
              const isHighlighted = r <= hoveredSize.rows && c <= hoveredSize.cols

              return (
                <Box
                  key={idx}
                  onMouseEnter={() => setHoveredSize({ rows: r, cols: c })}
                  onClick={() => handleCellClick(r, c)}
                  sx={{
                    width: 16,
                    height: 16,
                    border: '1px solid',
                    borderColor: isHighlighted ? 'primary.solidBg' : 'neutral.outlinedBorder',
                    bgcolor: isHighlighted ? 'primary.softHoverBg' : 'transparent',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    '&:hover': {
                      borderColor: 'primary.solidBg',
                      bgcolor: 'primary.softActiveBg'
                    }
                  }}
                />
              )
            })}
          </Box>
        </Box>
      </Menu>
    </Dropdown>
  )
}

export default TableGridPicker
