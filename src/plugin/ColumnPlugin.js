/**
 * Lexical plugin for multi-column layout support
 */

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createColumnContainerNode, $createColumnNode, $isColumnContainerNode, $isColumnNode } from '../nodes/ColumnNodes'
import { $createParagraphNode } from 'lexical'

// Commands
export const INSERT_COLUMN_LAYOUT_COMMAND = createCommand('INSERT_COLUMN_LAYOUT_COMMAND')
export const REMOVE_COLUMN_LAYOUT_COMMAND = createCommand('REMOVE_COLUMN_LAYOUT_COMMAND')

export default function ColumnPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Register command to insert column layout
    return editor.registerCommand(
      INSERT_COLUMN_LAYOUT_COMMAND,
      (columns = 2) => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const columnContainer = $createColumnContainerNode(columns)

          // Create columns
          for (let i = 0; i < columns; i++) {
            const column = $createColumnNode()
            const paragraph = $createParagraphNode()
            column.append(paragraph)
            columnContainer.append(column)
          }

          // Insert the column container
          selection.insertNodes([columnContainer])
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  useEffect(() => {
    // Register command to remove column layout
    return editor.registerCommand(
      REMOVE_COLUMN_LAYOUT_COMMAND,
      () => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const nodes = selection.getNodes()

          nodes.forEach((node) => {
            const parent = node.getParent()

            if ($isColumnNode(parent)) {
              const grandParent = parent.getParent()

              if ($isColumnContainerNode(grandParent)) {
                // Flatten columns - move all content out
                const children = grandParent.getChildren()
                children.forEach((column) => {
                  if ($isColumnNode(column)) {
                    const columnChildren = column.getChildren()
                    columnChildren.forEach((child) => {
                      grandParent.insertBefore(child)
                    })
                  }
                })
                grandParent.remove()
              }
            }
          })
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
