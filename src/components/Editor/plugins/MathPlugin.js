import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import { $getSelection, $isRangeSelection, $insertNodes, createCommand, TextNode } from 'lexical'
import { $createMathNode, MathNode } from '../../../nodes/MathNode'

// Dispatched by SlashCommandPlugin's "Math" entry to insert an empty math
// node (renders in Empty state, autofocused) at the current selection.
export const INSERT_MATH_COMMAND = createCommand()

// Matches inline math delimited by single dollar signs, e.g. "$\rightarrow$".
// No 'g'/'y' flag, so it's safe to reuse across calls (no lastIndex state).
const MATH_REGEX = /\$([^$\n]+)\$/

// NOTE: this is intentionally NOT built on @lexical/text's
// registerLexicalTextEntity, despite that being the standard primitive for
// this kind of "watch TextNodes for a pattern" plugin (see AutoLinkPlugin's
// use of a similar MATCHERS array in Editor.js). registerLexicalTextEntity's
// internal transform unconditionally does:
//   const replacementNode = createNode(nodeToReplace)
//   replacementNode.setFormat(nodeToReplace.getFormat())
// which assumes the target node is a TextNode subclass (like Lexical's own
// HashtagNode/AutoLinkNode). MathNode is a DecoratorNode (required so it can
// be a real inline widget, per MathNode.js), and DecoratorNode has no
// setFormat method — every call throws `TypeError: replacementNode.setFormat
// is not a function`. Lexical's update pipeline catches that, logs it via
// editor.onError, and silently reverts the ENTIRE in-flight update back to
// the previous committed state (see $beginUpdate's catch block in
// lexical/Lexical.dev.js) — so the conversion never actually happens, for
// newly typed text OR pre-existing saved content. This was verified with a
// headless repro against the real `lexical`/`@lexical/text` packages before
// writing the fix below.
//
// The fix: register our own plain TextNode transform that performs the same
// split-and-replace mechanics Lexical's internal algorithm uses, minus the
// setFormat call our node type can't support.
function $mathTextNodeTransform(node) {
  if (!node.isSimpleText()) {
    return
  }
  const text = node.getTextContent()
  const match = MATH_REGEX.exec(text)
  if (match === null) {
    return
  }
  const start = match.index
  const end = start + match[0].length
  const latex = match[1]

  let targetNode
  if (start === 0) {
    ;[targetNode] = node.splitText(end)
  } else {
    ;[, targetNode] = node.splitText(start, end)
  }
  targetNode.replace($createMathNode(latex))
  // Splitting leaves a remainder TextNode (if any) after the match, e.g. for
  // input like "$a$ and $b$" — that remainder is a newly created node and is
  // therefore already dirty, so Lexical will run this same transform on it
  // again on the next pass, converging on all matches in the original text
  // without any explicit loop here.
}

export default function MathPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([MathNode])) {
      throw new Error('MathPlugin: MathNode not registered on editor')
    }

    return mergeRegister(
      // editor.registerNodeTransform marks every existing node of the given
      // type dirty at the moment it's registered (see markNodesWithTypesAsDirty
      // in Lexical's core), which is exactly what makes this retroactively
      // convert "$...$" runs already present in a book that was saved before
      // this feature existed — not just newly typed/pasted text. No separate
      // one-time full-document walk is needed; this registration call *is*
      // that walk.
      editor.registerNodeTransform(TextNode, $mathTextNodeTransform),
      editor.registerCommand(
        INSERT_MATH_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $insertNodes([$createMathNode('')])
            }
          })
          return true
        },
        0
      )
    )
  }, [editor])

  return null
}
