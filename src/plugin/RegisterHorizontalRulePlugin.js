// src/plugin/RegisterHorizontalRulePlugin.js

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createParagraphNode, createCommand, COMMAND_PRIORITY_LOW } from 'lexical'
import { $createHorizontalRuleNode } from '../nodes/HorizontalRuleNode'

// ✅ Export the command here to avoid circular dependencies
export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand('INSERT_HORIZONTAL_RULE_COMMAND')

export default function RegisterHorizontalRulePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_HORIZONTAL_RULE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection()

          if (!$isRangeSelection(selection)) {
            return
          }

          const hrNode = $createHorizontalRuleNode()

          // Get the currently selected node
          const anchorNode = selection.anchor.getNode()

          // Get the top-level element (could be paragraph, heading, etc.)
          let topLevelNode = anchorNode

          // Navigate up to find the top-level element
          while (
            topLevelNode.getParent() !== null &&
            topLevelNode.getParent().getType() !== 'root' &&
            topLevelNode.getParent().getType() !== 'page'
          ) {
            topLevelNode = topLevelNode.getParent()
          }

          // Insert the HR after the current block
          topLevelNode.insertAfter(hrNode)

          // Create a new paragraph after the HR and move selection there
          const newParagraph = $createParagraphNode()
          hrNode.insertAfter(newParagraph)
          newParagraph.select()
        })
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  return null
}
