import React, { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, SELECTION_CHANGE_COMMAND } from 'lexical'
import {
  $isTableNode,
  $isTableCellNode,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL
} from '@lexical/table'
import { createPortal } from 'react-dom'
import { Box, IconButton, Tooltip, Sheet, Divider } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, ArrowDown, ArrowRight, Trash2, ChevronDown, ChevronRight, Table } from 'lucide-react'

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
  const [isHovering, setIsHovering] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [tableNode, setTableNode] = useState(null)
  const [tableCellNode, setTableCellNode] = useState(null)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  // Detect when user is in a table
  useEffect(() => {
    const updateTableState = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection)) {
          setIsHovering(false)
          setIsMenuOpen(false)
          return
        }

        const anchorNode = selection.anchor.getNode()
        const cellNode = $getTableCellNodeFromLexicalNode(anchorNode)

        if (cellNode) {
          try {
            const table = $getTableNodeFromLexicalNodeOrThrow(cellNode)
            setTableNode(table)
            setTableCellNode(cellNode)

            // Position button on the LEFT side of table
            const editorElement = editor.getRootElement()
            if (editorElement) {
              const editorRect = editorElement.getBoundingClientRect()
              const domNode = editor.getElementByKey(table.getKey())

              if (domNode) {
                const tableRect = domNode.getBoundingClientRect()
                setPosition({
                  top: tableRect.top - editorRect.top,
                  left: tableRect.left - editorRect.left - 40 // 40px to the LEFT of table
                })
                setIsHovering(true)
                return
              }
            }
          } catch (e) {
            // Not in a table
          }
        }

        setIsHovering(false)
      })
    }

    // Update on selection change
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateTableState()
        return false
      },
      COMMAND_PRIORITY_HIGH
    )

    // Initial check
    updateTableState()

    return unregister
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

  const deleteTable = () => {
    editor.update(() => {
      if (tableNode) {
        tableNode.remove()
        setIsHovering(false)
        setIsMenuOpen(false)
      }
    })
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false)
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
      {/* Small trigger button - only visible when hovering table */}
      <IconButton
        ref={buttonRef}
        size='sm'
        variant='soft'
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        sx={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 10,
          minWidth: 32,
          minHeight: 32,
          opacity: 0.7,
          transition: 'opacity 0.2s',
          '&:hover': {
            opacity: 1
          }
        }}
      >
        <Table size={16} />
      </IconButton>

      {/* Full menu - only when button clicked */}
      {isMenuOpen && (
        <Sheet
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: position.top + 40,
            left: position.left,
            zIndex: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            p: 1,
            borderRadius: 'sm',
            boxShadow: 'lg',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            minWidth: 160
          }}
        >
          {/* Add Row Below */}
          <IconButton
            size='sm'
            variant='plain'
            onClick={() => {
              insertRowBelow()
              setIsMenuOpen(false)
            }}
            sx={{
              justifyContent: 'flex-start',
              gap: 1,
              '&:hover': {
                bgcolor: 'background.level1'
              }
            }}
          >
            <Plus size={16} />
            <ChevronDown size={14} />
            <Box component='span' sx={{ fontSize: 'sm', ml: 'auto' }}>
              Row
            </Box>
          </IconButton>

          {/* Add Column Right */}
          <IconButton
            size='sm'
            variant='plain'
            onClick={() => {
              insertColumnRight()
              setIsMenuOpen(false)
            }}
            sx={{
              justifyContent: 'flex-start',
              gap: 1,
              '&:hover': {
                bgcolor: 'background.level1'
              }
            }}
          >
            <Plus size={16} />
            <ChevronRight size={14} />
            <Box component='span' sx={{ fontSize: 'sm', ml: 'auto' }}>
              Column
            </Box>
          </IconButton>

          <Divider sx={{ my: 0.5 }} />

          {/* Delete Row */}
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => {
              deleteRow()
              setIsMenuOpen(false)
            }}
            sx={{
              justifyContent: 'flex-start',
              gap: 1,
              '&:hover': {
                bgcolor: 'danger.softBg'
              }
            }}
          >
            <Minus size={16} />
            <ChevronDown size={14} />
            <Box component='span' sx={{ fontSize: 'sm', ml: 'auto' }}>
              Row
            </Box>
          </IconButton>

          {/* Delete Column */}
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => {
              deleteColumn()
              setIsMenuOpen(false)
            }}
            sx={{
              justifyContent: 'flex-start',
              gap: 1,
              '&:hover': {
                bgcolor: 'danger.softBg'
              }
            }}
          >
            <Minus size={16} />
            <ChevronRight size={14} />
            <Box component='span' sx={{ fontSize: 'sm', ml: 'auto' }}>
              Column
            </Box>
          </IconButton>

          <Divider sx={{ my: 0.5 }} />

          {/* Delete Table */}
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => {
              deleteTable()
            }}
            sx={{
              justifyContent: 'flex-start',
              gap: 1,
              '&:hover': {
                bgcolor: 'danger.softBg'
              }
            }}
          >
            <Trash2 size={16} />
            <Box component='span' sx={{ fontSize: 'sm', ml: 'auto' }}>
              Delete Table
            </Box>
          </IconButton>
        </Sheet>
      )}
    </>,
    editorElement.parentElement
  )
}
