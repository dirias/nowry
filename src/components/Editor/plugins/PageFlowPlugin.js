import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { KEY_BACKSPACE_COMMAND, COMMAND_PRIORITY_LOW, $getSelection, $isRangeSelection, $getRoot } from 'lexical'
import { useEffect } from 'react'

export default function PageFlowPlugin({ onMergeBack }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection()
        if ($isRangeSelection(selection) && selection.isCollapsed() && selection.anchor.offset === 0) {
          const anchorNode = selection.anchor.getNode()

          // Check if this is the very first position in the document
          let isAtStart = true
          let node = anchorNode
          const root = $getRoot()

          while (node !== null && node !== root) {
            if (node.getPreviousSibling() !== null) {
              isAtStart = false
              break
            }
            node = node.getParent()
          }

          if (isAtStart) {
            event.preventDefault()
            if (onMergeBack) onMergeBack()
            return true
          }
        }
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, onMergeBack])

  return null
}
