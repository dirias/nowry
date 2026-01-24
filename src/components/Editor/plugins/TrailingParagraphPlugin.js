import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $createParagraphNode, $isDecoratorNode, $getSelection, $isRangeSelection } from 'lexical'
import { $isCodeNode } from '@lexical/code'
import { $isTableNode } from '@lexical/table'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'

/**
 * TrailingParagraphPlugin
 *
 * Ensures users can always type after block elements (code, hr, images, etc.)
 * by automatically adding a trailing paragraph if needed.
 *
 * Fixes: "Can't type after code block" issue
 */

export default function TrailingParagraphPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const ensureTrailingParagraph = () => {
      editor.update(() => {
        try {
          // Skip if we're currently typing in a table
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode()
            let parent = anchorNode.getParent()

            // Walk up the tree to check if we're in a table
            while (parent) {
              if ($isTableNode(parent)) {
                // We're inside a table, skip trailing paragraph logic
                return
              }
              parent = parent.getParent()
            }
          }

          const root = $getRoot()
          const lastChild = root.getLastChild()

          // If last child is a code block, decorator, or other non-editable node
          if (
            lastChild &&
            ($isCodeNode(lastChild) || $isDecoratorNode(lastChild) || lastChild.getType() === 'horizontalrule' || $isTableNode(lastChild))
          ) {
            // Check if we can append after it
            const nextSibling = lastChild.getNextSibling()

            if (!nextSibling) {
              // No paragraph after block element - add one
              const paragraph = $createParagraphNode()
              root.append(paragraph)
            }
          }
        } catch (e) {
          // Silently ignore errors (likely from table cell nodes)
          console.debug('TrailingParagraphPlugin: skipped update', e.message)
        }
      })
    }

    // Run on every content change
    const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
        // Small delay to ensure DOM is settled
        setTimeout(ensureTrailingParagraph, 50)
      }
    })

    // Run initially
    ensureTrailingParagraph()

    return () => {
      unregister()
    }
  }, [editor])

  return null
}
