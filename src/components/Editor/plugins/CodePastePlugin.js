import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { PASTE_COMMAND, COMMAND_PRIORITY_HIGH, $getSelection, $isRangeSelection } from 'lexical'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { $setBlocksType } from '@lexical/selection'

/**
 * CodePastePlugin - Preserves code formatting when pasting
 * Detects code patterns and automatically converts to code blocks
 */
export default function CodePastePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData || window.clipboardData
        const pastedText = clipboardData.getData('text/plain')
        const pastedHtml = clipboardData.getData('text/html')

        // Detect if pasted content looks like code (can check synchronously)
        const codeIndicators = [
          /^```[\s\S]*```$/m, // Markdown code fences
          /^ {4}\S/m, // Indented code (4 spaces)
          /^\t\S/m, // Tab-indented code
          /[{}[\]();]/g, // Has brackets/braces (at least 3)
          /<pre[\s>]/i, // Has <pre> tag in HTML
          /<code[\s>]/i, // Has <code> tag in HTML
          /^\s*(?:function|const|let|var|if|for|while|class|def|import|from|return)\s/m // Programming keywords
        ]

        // Count code indicators
        let codeScore = 0
        if (codeIndicators[0].test(pastedText)) codeScore += 10 // Strong indicator
        if (codeIndicators[1].test(pastedText)) codeScore += 3
        if (codeIndicators[2].test(pastedText)) codeScore += 3
        const bracketCount = (pastedText.match(codeIndicators[3]) || []).length
        if (bracketCount >= 3) codeScore += 2
        if (codeIndicators[4].test(pastedHtml)) codeScore += 5
        if (codeIndicators[5].test(pastedHtml)) codeScore += 5
        if (codeIndicators[6].test(pastedText)) codeScore += 4

        // Also check for multiple lines with consistent indentation
        const lines = pastedText.split('\n')
        if (lines.length > 2) {
          const indentedLines = lines.filter((line) => /^\s{2,}/.test(line))
          if (indentedLines.length > lines.length * 0.5) {
            codeScore += 3
          }
        }

        // All selection checks and modifications must happen inside editor.update
        let shouldHandle = false

        editor.update(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return

          // Check if we're in a code block
          const anchorNode = selection.anchor.getNode()
          let parent = anchorNode.getParent()
          let isInCodeBlock = false

          while (parent) {
            if ($isCodeNode(parent)) {
              isInCodeBlock = true
              break
            }
            parent = parent.getParent()
          }

          // If already in a code block, insert as plain text
          if (isInCodeBlock) {
            event.preventDefault()
            selection.insertText(pastedText)
            shouldHandle = true
            return
          }

          // If it looks like code, convert to code block
          if (codeScore >= 5) {
            event.preventDefault()

            // Clean up markdown code fences if present
            let cleanedText = pastedText.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '')

            // Create a code node and insert the text
            $setBlocksType(selection, () => $createCodeNode())

            // Get fresh selection after block type change
            const newSelection = $getSelection()
            if ($isRangeSelection(newSelection)) {
              newSelection.insertText(cleanedText)
            }

            console.log('✓ Auto-detected code paste (score:', codeScore, ')')
            shouldHandle = true
            return
          }
        })

        return shouldHandle
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])

  return null
}
