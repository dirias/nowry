import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getSelection, $setSelection, $createRangeSelection, $isRangeSelection } from 'lexical'
import { $isPageNode } from '../../../nodes/PageNode'

/**
 * PageClickPlugin - Ensures clicking on any page focuses that page correctly
 *
 * PROBLEM:
 * - Clicking empty space on Page 2 or 3 → cursor goes to Page 1
 * - Lexical treats PageNodes as containers but doesn't handle clicks inside them properly
 *
 * SOLUTION:
 * - Intercept click events on .editor-page elements
 * - Find the clicked page's last child node
 * - Focus at the end of that page's content
 */

export default function PageClickPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const handlePageClick = (event) => {
      // Only handle clicks on the page container itself (not its children)
      const pageElement = event.target.closest('.editor-page')
      if (!pageElement || event.target !== pageElement) {
        return // Let Lexical handle clicks on actual content
      }

      // Get all pages
      const pages = Array.from(document.querySelectorAll('.editor-page'))
      const clickedPageIndex = pages.indexOf(pageElement)

      if (clickedPageIndex === -1) return

      console.log(`[PageClick] Clicked on page ${clickedPageIndex + 1}`)

      // Focus the editor at the end of the clicked page
      editor.update(() => {
        const root = $getRoot()
        const pageNodes = root.getChildren().filter($isPageNode)

        if (pageNodes[clickedPageIndex]) {
          const clickedPage = pageNodes[clickedPageIndex]
          const lastChild = clickedPage.getLastChild()

          if (lastChild) {
            // Focus at the end of the last child in this page
            lastChild.selectEnd()
            console.log(`[PageClick] Focused at end of page ${clickedPageIndex + 1}`)
          }
        }
      })
    }

    // Attach click handler to the editor root
    const editorElement = editor.getRootElement()
    if (editorElement) {
      editorElement.addEventListener('click', handlePageClick, true) // Use capture phase
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener('click', handlePageClick, true)
      }
    }
  }, [editor])

  return null
}
