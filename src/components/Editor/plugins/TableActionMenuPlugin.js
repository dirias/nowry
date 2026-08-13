import React, { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, SELECTION_CHANGE_COMMAND, $getNodeByKey } from 'lexical'
import {
  $isTableNode,
  $isTableCellNode,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $mergeCells,
  $unmergeCell,
  $isTableSelection,
  $computeTableMapSkipCellCheck
} from '@lexical/table'
import { createPortal } from 'react-dom'
import { Box, IconButton, Tooltip, Sheet, Divider, Typography, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Minus,
  ArrowDown,
  ArrowRight,
  Trash2,
  ChevronDown,
  ChevronRight,
  Table,
  PaintBucket,
  Layout,
  Maximize2,
  Merge,
  Split
} from 'lucide-react'

/**
 * TableActionMenuPlugin - Smart floating toolbar for table operations
 *
 * FEATURES:
 * - Appears on table hover (minimalistic, non-intrusive)
 * - Small trigger button in top-right corner of table
 * - Click to open full menu
 * - Add/remove rows and columns
 * - Delete entire table
 * - Theme-aware, minimalistic design
 * - Following DESIGN_GUIDELINES.md: "Refined Minimalism"
 */
export default function TableActionMenuPlugin() {
  const { t } = useTranslation()
  const [editor] = useLexicalComposerContext()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [tableNode, setTableNode] = useState(null)
  const [tableCellNode, setTableCellNode] = useState(null)
  const menuRef = useRef(null)
  const colorMenuRef = useRef(null)
  const buttonRef = useRef(null)
  const colorButtonRef = useRef(null)

  // Detect when user is in a table
  useEffect(() => {
    const updateTableState = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection) && !$isTableSelection(selection)) {
          setIsHovering(false)
          setIsMenuOpen(false)
          return
        }

        // Hide table controls if editor is in read-only mode
        if (!editor.isEditable()) {
          setIsHovering(false)
          setIsMenuOpen(false)
          return
        }

        let cellNode = null
        try {
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor
            if (anchor) {
              const anchorNode = anchor.getNode()
              if (anchorNode) {
                cellNode = $getTableCellNodeFromLexicalNode(anchorNode)
              }
            }
          } else if ($isTableSelection(selection)) {
            const nodes = selection.getNodes()
            for (const node of nodes) {
              let curr = node
              while (curr) {
                if ($isTableCellNode(curr)) {
                  cellNode = curr
                  break
                }
                curr = curr.getParent()
              }
              if (cellNode) break
            }
          }
        } catch (e) {
          // Selection might be in a transient state during deletion
          return
        }

        if (cellNode) {
          try {
            const table = $getTableNodeFromLexicalNodeOrThrow(cellNode)
            setTableNode(table)
            setTableCellNode(cellNode)

            // Centered top position
            const editorElement = editor.getRootElement()
            if (editorElement) {
              const domNode = editor.getElementByKey(table.getKey())

              if (domNode) {
                const tableRect = domNode.getBoundingClientRect()
                setPosition({
                  top: tableRect.top - 45, // Above the table, viewport-relative for fixed positioning
                  left: tableRect.left + tableRect.width / 2 - 80 // Centered, viewport-relative
                })
                setIsHovering(true)
                return
              }
            }
          } catch (e) {
            /* ignored */
          }
        }

        setIsHovering(false)
        setIsMenuOpen(false)
      })
    }

    const unregisterListener = editor.registerUpdateListener(({ editorState }) => {
      updateTableState()
    })

    updateTableState()
    return unregisterListener
  }, [editor])

  // Action handlers
  const insertRowBelow = () => {
    editor.update(() => {
      if (tableCellNode) {
        $insertTableRow__EXPERIMENTAL(true) // true = below
      }
    })
  }

  const insertColumnRight = () => {
    editor.update(() => {
      if (tableCellNode) {
        $insertTableColumn__EXPERIMENTAL(true) // true = after (right)
      }
    })
  }

  const setCellColor = (color) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        const nodes = selection.getNodes()
        const uniqueCells = new Set()

        nodes.forEach((node) => {
          const cell = $getTableCellNodeFromLexicalNode(node)
          if (cell) {
            uniqueCells.add(cell.getKey())
          }
        })

        uniqueCells.forEach((key) => {
          const cell = $getNodeByKey(key)
          if ($isTableCellNode(cell)) {
            cell.setBackgroundColor(color)
          }
        })
      }
    })
    setIsMenuOpen(false)
    setIsColorMenuOpen(false)
  }

  const deleteRow = () => {
    editor.update(() => {
      if (tableCellNode) {
        $deleteTableRow__EXPERIMENTAL()
      }
    })
  }

  const deleteColumn = () => {
    editor.update(() => {
      if (tableCellNode) {
        $deleteTableColumn__EXPERIMENTAL()
      }
    })
  }

  const handleDelete = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isTableSelection(selection)) {
        const anchor = selection.anchor
        if (!anchor) return
        const anchorNode = anchor.getNode()
        if (!anchorNode) return

        const table = $getTableNodeFromLexicalNodeOrThrow(anchorNode)
        const [grid] = $computeTableMapSkipCellCheck(table, null, null)

        const height = grid.length
        const width = grid[0] ? grid[0].length : 0

        const nodes = selection.getNodes()
        const selectedRowIndices = new Set()
        const selectedColIndices = new Set()

        const cellToPos = new Map()
        grid.forEach((row, rowIndex) => {
          row.forEach((cellInfo, colIndex) => {
            if (cellInfo && cellInfo.cell) {
              cellToPos.set(cellInfo.cell.getKey(), { r: rowIndex, c: colIndex })
            }
          })
        })

        nodes.forEach((node) => {
          const cell = $getTableCellNodeFromLexicalNode(node)
          if (cell) {
            const pos = cellToPos.get(cell.getKey())
            if (pos) {
              selectedRowIndices.add(pos.r)
              selectedColIndices.add(pos.c)
            }
          }
        })

        // Smart heuristic: If selection covers all rows but not all columns -> Delete Columns
        // Otherwise (default for table selection) -> Delete Rows
        if (selectedRowIndices.size === height && selectedColIndices.size < width) {
          $deleteTableColumn__EXPERIMENTAL()
        } else {
          $deleteTableRow__EXPERIMENTAL()
        }
      } else if ($isRangeSelection(selection)) {
        $deleteTableRow__EXPERIMENTAL()
      }
    })
  }

  const deleteTable = () => {
    editor.update(() => {
      if (tableNode) {
        tableNode.remove()
        setIsHovering(false)
        setIsMenuOpen(false)
      }
    })
  }

  const mergeCells = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isTableSelection(selection) || $isRangeSelection(selection)) {
        const nodes = selection.getNodes()
        const cellNodes = new Set()

        nodes.forEach((node) => {
          const cell = $getTableCellNodeFromLexicalNode(node)
          if (cell && $isTableCellNode(cell)) {
            cellNodes.add(cell)
          }
        })

        if (cellNodes.size > 1) {
          $mergeCells(Array.from(cellNodes))
        }
      }
    })
  }

  const unmergeCells = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isTableSelection(selection) || $isRangeSelection(selection)) {
        $unmergeCell()
      }
    })
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
      if (
        colorMenuRef.current &&
        !colorMenuRef.current.contains(event.target) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(event.target)
      ) {
        setIsColorMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isHovering) return null

  const editorElement = editor.getRootElement()
  if (!editorElement) return null

  return createPortal(
    <>
      {/* Modern Horizontal Contextual Bar */}
      <Sheet
        variant='plain'
        sx={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 0.5,
          borderRadius: 'md',
          boxShadow: 'md',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'neutral.outlinedBorder',
          backdropFilter: 'blur(8px)',
          animation: 'fadeInUp 0.2s ease-out'
        }}
      >
        <Tooltip title='Table Operations' variant='soft'>
          <IconButton size='sm' variant='plain' onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Table size={18} color='var(--joy-palette-primary-500)' />
            <ChevronDown size={14} />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' sx={{ mx: 0.5 }} />

        <Tooltip title='Merge Cells' variant='soft'>
          <IconButton size='sm' variant='plain' color='neutral' onClick={mergeCells}>
            <Merge size={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title='Unmerge Cells' variant='soft'>
          <IconButton size='sm' variant='plain' color='neutral' onClick={unmergeCells}>
            <Split size={18} />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' sx={{ mx: 0.5 }} />

        <Tooltip title='Cell Color' variant='soft'>
          <IconButton
            ref={colorButtonRef}
            size='sm'
            variant='plain'
            color={isColorMenuOpen ? 'primary' : 'neutral'}
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
          >
            <PaintBucket size={18} />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' sx={{ mx: 0.5 }} />

        <Tooltip title='Add Row' variant='soft'>
          <IconButton size='sm' variant='plain' onClick={() => insertRowBelow()}>
            <ArrowDown size={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title='Add Column' variant='soft'>
          <IconButton size='sm' variant='plain' onClick={() => insertColumnRight()}>
            <ArrowRight size={18} />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' sx={{ mx: 0.5 }} />

        <Tooltip title='Delete' variant='soft'>
          <IconButton size='sm' variant='plain' color='danger' onClick={handleDelete}>
            <Trash2 size={18} />
          </IconButton>
        </Tooltip>
      </Sheet>

      {/* Main Operations Menu */}
      {isMenuOpen && (
        <Sheet
          ref={menuRef}
          sx={{
            position: 'fixed',
            top: position.top + 50,
            left: position.left,
            zIndex: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            p: 1,
            borderRadius: 'sm',
            boxShadow: 'lg',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            minWidth: 200
          }}
        >
          <Stack direction='column' spacing={0.5}>
            <IconButton
              size='sm'
              variant='plain'
              onClick={() => {
                editor.update(() => $insertTableRow__EXPERIMENTAL(false))
                setIsMenuOpen(false)
              }}
              sx={{ justifyContent: 'flex-start', px: 1 }}
            >
              <Plus size={14} sx={{ mr: 1 }} /> Row Above
            </IconButton>
            <IconButton
              size='sm'
              variant='plain'
              onClick={() => {
                editor.update(() => $insertTableRow__EXPERIMENTAL(true))
                setIsMenuOpen(false)
              }}
              sx={{ justifyContent: 'flex-start', px: 1 }}
            >
              <Plus size={14} sx={{ mr: 1 }} /> Row Below
            </IconButton>
            <Divider sx={{ my: 0.5 }} />
            <IconButton
              size='sm'
              variant='plain'
              onClick={() => {
                editor.update(() => $insertTableColumn__EXPERIMENTAL(false))
                setIsMenuOpen(false)
              }}
              sx={{ justifyContent: 'flex-start', px: 1 }}
            >
              <Plus size={14} sx={{ mr: 1 }} /> Column Left
            </IconButton>
            <IconButton
              size='sm'
              variant='plain'
              onClick={() => {
                editor.update(() => $insertTableColumn__EXPERIMENTAL(true))
                setIsMenuOpen(false)
              }}
              sx={{ justifyContent: 'flex-start', px: 1 }}
            >
              <Plus size={14} sx={{ mr: 1 }} /> Column Right
            </IconButton>
          </Stack>

          <Divider sx={{ my: 1 }} />

          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => {
              deleteRow()
              setIsMenuOpen(false)
            }}
            sx={{ justifyContent: 'flex-start', px: 1 }}
          >
            <Minus size={14} sx={{ mr: 1 }} /> Delete Selected Rows
          </IconButton>
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => {
              deleteColumn()
              setIsMenuOpen(false)
            }}
            sx={{ justifyContent: 'flex-start', px: 1 }}
          >
            <Minus size={14} sx={{ mr: 1, transform: 'rotate(90deg)' }} /> Delete Selected Columns
          </IconButton>
          <IconButton size='sm' variant='plain' color='danger' onClick={() => deleteTable()} sx={{ justifyContent: 'flex-start', px: 1 }}>
            <Trash2 size={14} sx={{ mr: 1 }} /> Delete Table
          </IconButton>
        </Sheet>
      )}

      {/* Color Picker Menu */}
      {isColorMenuOpen && (
        <Sheet
          ref={colorMenuRef}
          sx={{
            position: 'fixed',
            top: position.top + 50,
            left: position.left + 80, // Offset to appear under bucket
            zIndex: 12,
            p: 1,
            borderRadius: 'sm',
            boxShadow: 'lg',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder'
          }}
        >
          <Typography level='body-xs' fontWeight='bold' sx={{ px: 1, py: 0.5, textTransform: 'uppercase', mb: 0.5 }}>
            Cell Color
          </Typography>
          <Stack direction='row' spacing={1}>
            {['#f8f9fa', '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', '#fedddd'].map((color) => (
              <Box
                key={color}
                onClick={() => setCellColor(color)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'neutral.outlinedBorder',
                  '&:hover': { transform: 'scale(1.1)', boxShadow: 'sm' },
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </Stack>
        </Sheet>
      )}
    </>,
    document.body
  )
}
