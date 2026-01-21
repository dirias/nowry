import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $insertNodes, createCommand } from 'lexical'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { useEffect } from 'react'

// Command that can be imported and triggered from the toolbar
export const INSERT_TABLE_COMMAND = createCommand()

// Plugin that registers the command and inserts a basic 3x3 table
export default function TablePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_TABLE_COMMAND,
      (payload) => {
        editor.update(() => {
          const rows = payload?.rows || 3
          const columns = payload?.columns || 3

          const table = new TableNode()
          for (let i = 0; i < rows; i++) {
            const row = new TableRowNode()
            for (let j = 0; j < columns; j++) {
              const cell = new TableCellNode()
              row.append(cell)
            }
            table.append(row)
          }

          const selection = $getSelection()
          if (selection) {
            $insertNodes([table])
          }
        })
        return true
      },
      0
    )
  }, [editor])

  return null
}
