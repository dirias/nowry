import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { $isHeadingNode } from '@lexical/rich-text'

/**
 * FlowContentPlugin - Generates TOC and tracks reading progress
 *
 * No pagination, just beautiful flowing content with smart navigation
 */

export default function FlowContentPlugin({ onTOCChange, onProgressChange }) {
  const [editor] = useLexicalComposerContext()
  const [updateCounter, setUpdateCounter] = useState(0)

  useEffect(() => {
    console.log('📚 FlowContentPlugin initialized - No pagination, just flow!')

    const generateTOC = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const toc = []
        const children = root.getChildren()

        children.forEach((node) => {
          if ($isHeadingNode(node)) {
            const tag = node.getTag() // 'h1', 'h2', 'h3'
            const text = node.getTextContent()
            const key = node.getKey()

            if (text.trim()) {
              toc.push({
                id: key,
                level: tag,
                text: text,
                indent: tag === 'h1' ? 0 : tag === 'h2' ? 1 : 2
              })
            }
          }
        })

        if (onTOCChange) {
          onTOCChange(toc)
        }

        console.log('📑 TOC Generated:', toc.length, 'sections')
      })
    }

    const calculateProgress = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const totalContent = root.getTextContent()
        const wordCount = totalContent.trim().split(/\s+/).length
        const readingTime = Math.ceil(wordCount / 200) // 200 words per minute

        if (onProgressChange) {
          onProgressChange({
            wordCount,
            readingTime,
            characterCount: totalContent.length
          })
        }
      })
    }

    // Generate TOC and progress on mount and updates
    generateTOC()
    calculateProgress()

    // Listen for content changes
    const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
        // Debounce updates
        setTimeout(() => {
          generateTOC()
          calculateProgress()
        }, 300)
      }
    })

    return () => {
      unregister()
    }
  }, [editor, onTOCChange, onProgressChange, updateCounter])

  return null
}
