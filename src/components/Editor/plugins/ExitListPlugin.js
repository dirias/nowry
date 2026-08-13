import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createParagraphNode, $isElementNode, KEY_ENTER_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical'
import { $isListNode, $isListItemNode } from '@lexical/list'
import { $isTableCellNode } from '@lexical/table'
import { $setBlocksType } from '@lexical/selection'

/**
 * ExitListPlugin - Exit list on double Enter
 *
 * BEHAVIOR:
 * - Press Enter once on empty list item → Create new list item (default behavior continues)
 * - Press Enter twice (on empty list item) → Exit list, return to paragraph
 *
 * This is standard behavior in Word, Google Docs, Notion, etc.
 *
 * IMPLEMENTATION:
 * - Tracks the key of the last empty list item where Enter was pressed
 * - Only exits if Enter is pressed again on the same empty item
 * - Resets tracking when user types or moves cursor
 * - Handles table cells properly to avoid errors
 */

export default function ExitListPlugin() {
  const [editor] = useLexicalComposerContext()
  const lastEmptyListItemKey = useRef(null)

  useEffect(() => {
    // Reset tracking when content changes (user typed something)
    const removeUpdateListener = editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection)) {
          lastEmptyListItemKey.current = null
          return
        }

        try {
          const anchorNode = selection.anchor.getNode()
          let parent = $isElementNode(anchorNode) ? anchorNode : anchorNode.getParent()

          // Skip if we're in a table cell (different context)
          if (parent && $isTableCellNode(parent)) {
            lastEmptyListItemKey.current = null
            return
          }

          if ($isListItemNode(parent)) {
            const textContent = parent.getTextContent().trim()

            // If the current item has content, reset tracking
            if (textContent !== '') {
              lastEmptyListItemKey.current = null
            }
          } else {
            // Not in a list anymore, reset tracking
            lastEmptyListItemKey.current = null
          }
        } catch (e) {
          // Ignore errors from nodes that don't have proper parent structure
          lastEmptyListItemKey.current = null
        }
      })
    })

    const removeEnterCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection)) {
          return false
        }

        try {
          const anchorNode = selection.anchor.getNode()
          let parent = $isElementNode(anchorNode) ? anchorNode : anchorNode.getParent()

          // Skip if we're in a table cell
          if (parent && $isTableCellNode(parent)) {
            return false
          }

          if (!$isListItemNode(parent)) {
            lastEmptyListItemKey.current = null
            return false // Not in a list
          }

          // Check if the list item is empty
          const textContent = parent.getTextContent().trim()
          const currentItemKey = parent.getKey()

          if (textContent === '') {
            // Empty list item

            if (lastEmptyListItemKey.current === currentItemKey) {
              // This is the SECOND Enter on the same empty item - EXIT LIST
              console.log('🔄 Second Enter on empty list item, exiting list...')

              editor.update(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                  // Convert the empty list item to a paragraph
                  $setBlocksType(selection, () => $createParagraphNode())
                  console.log('✅ Exited list')
                }
              })

              // Reset tracking
              lastEmptyListItemKey.current = null

              return true // Prevent default Enter behavior
            } else {
              // This is the FIRST Enter on this empty item - TRACK IT
              console.log('📝 First Enter on empty list item, tracking...')
              lastEmptyListItemKey.current = currentItemKey

              // Let default behavior create a new list item
              return false
            }
          } else {
            // List item has content, reset tracking
            lastEmptyListItemKey.current = null
            return false
          }
        } catch (e) {
          // Ignore errors from nodes without proper parent structure
          lastEmptyListItemKey.current = null
          return false
        }
      },
      COMMAND_PRIORITY_LOW
    )

    return () => {
      removeUpdateListener()
      removeEnterCommand()
    }
  }, [editor])

  return null
}
