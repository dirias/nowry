import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $insertNodes, $createParagraphNode, createCommand } from 'lexical'
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
          const rows = payload?.rows || 2
          const columns = payload?.columns || 2

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
            // Insert table and a paragraph after it for continued editing
            const paragraph = $createParagraphNode()
            $insertNodes([table, paragraph])

            // Move cursor to the first cell
            setTimeout(() => {
              editor.update(() => {
                const firstCell = table.getFirstChild()?.getFirstChild()
                if (firstCell) {
                  firstCell.selectStart()
                }
              })
            }, 0)
          }
        })
        return true
      },
      0
    )
  }, [editor])

  return null
}
