// src/plugin/RegisterHorizontalRulePlugin.js

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, createCommand } from 'lexical'
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
          const node = $createHorizontalRuleNode()
          $getRoot().append(node)
        })
        return true
      },
      0
    )
  }, [editor])

  return null
}
