import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getNodeByKey, $isElementNode } from 'lexical'
import { $createPageNode, $isPageNode, PageNode } from '../../../nodes/PageNode'

const PAGE_HEIGHT_PX = 1123 // A4 at 96 DPI
// We subtract padding (96px * 2) roughly for content check, OR we check the wrapper height.
// PageNode dimensions: min-height 1123px.
// If actual height > 1123px, we overflow.

export default function ContinuousPaginationPlugin({ pageHeight = 1123 }) {
  const [editor] = useLexicalComposerContext()
  const isProcessing = useRef(false)

  // Trigger immediate repagination when pageHeight changes
  useEffect(() => {
    const triggerRepagination = () => {
      editor.update(() => {
        const root = $getRoot()
        const pages = root.getChildren().filter($isPageNode)
        // Touch each page to trigger reflow check
        pages.forEach((page) => {
          page.markDirty()
        })
      })
    }

    // Run multiple passes to ensure all content settles
    const timer1 = setTimeout(triggerRepagination, 50)
    const timer2 = setTimeout(triggerRepagination, 150)
    const timer3 = setTimeout(triggerRepagination, 300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [editor, pageHeight])

  useEffect(() => {
    if (!editor.hasNodes([PageNode])) {
      throw new Error('ContinuousPaginationPlugin: PageNode not registered on editor')
    }

    // Initial pagination
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (isProcessing.current) return

      const rootElement = editor.getRootElement()

      // Guard against null rootElement
      if (!rootElement) {
        console.warn('ContinuousPaginationPlugin: rootElement is null, skipping pagination')
        return
      }

      // Find all page nodes
      const pageElements = Array.from(rootElement.querySelectorAll('.editor-page'))

      // 5px buffer
      for (let i = 0; i < pageElements.length; i++) {
        const pageDiv = pageElements[i]
        // Check if page is overflowing the new height
        if (pageDiv.offsetHeight > pageHeight + 5) {
          // Logic to handle overflow...
        }
      }

      editor.update(() => {
        isProcessing.current = true
        try {
          const root = $getRoot()
          const pages = root.getChildren().filter($isPageNode)

          if (pages.length === 0) return

          let hasChanges = false

          for (let i = 0; i < pages.length; i++) {
            const page = pages[i]
            const pageKey = page.getKey()
            const pageElement = editor.getElementByKey(pageKey)

            if (!pageElement) continue

            // 1. CHECK OVERFLOW (Move Forward)
            if (pageElement.offsetHeight > pageHeight + 2) {
              const children = page.getChildren()
              if (children.length === 0) continue

              for (let j = children.length - 1; j >= 0; j--) {
                const child = children[j]
                const childElement = editor.getElementByKey(child.getKey())
                if (!childElement) continue

                const childRect = childElement.getBoundingClientRect()

                if (pageElement.offsetHeight > pageHeight + 2) {
                  // Move to next page
                  const nextPage = i + 1 < pages.length ? pages[i + 1] : $createPageNode()
                  if (i + 1 >= pages.length) {
                    root.append(nextPage)
                  }

                  const firstChild = nextPage.getFirstChild()
                  if (firstChild) {
                    firstChild.insertBefore(child)
                  } else {
                    nextPage.append(child)
                  }
                  hasChanges = true
                  return
                }
              }
            }

            // 2. CHECK UNDERFLOW (Move Backward / Pull)
            else {
              const nextPage = i + 1 < pages.length ? pages[i + 1] : null
              if (nextPage) {
                const nextChildren = nextPage.getChildren()
                if (nextChildren.length > 0) {
                  const firstChild = nextChildren[0]
                  const childElement = editor.getElementByKey(firstChild.getKey())
                  if (childElement) {
                    const pageChildren = pageElement.children
                    let usedHeight = 0
                    if (pageChildren.length > 0) {
                      const lastPageChild = pageChildren[pageChildren.length - 1]
                      const lastChildRect = lastPageChild.getBoundingClientRect()
                      const pageRect = pageElement.getBoundingClientRect()
                      usedHeight = lastChildRect.bottom - pageRect.top
                    } else {
                      usedHeight = 96 // Just top padding
                    }

                    const childHeight = childElement.offsetHeight

                    // Check fit against dynamic height
                    if (usedHeight + childHeight < pageHeight - 96 - 20) {
                      page.append(firstChild)
                      hasChanges = true
                      return
                    }
                  }
                } else {
                  if (pages.length > 1) {
                    nextPage.remove()
                    hasChanges = true
                    return
                  }
                }
              }
            }
          }
        } finally {
          isProcessing.current = false
        }
      })
    })
  }, [editor, pageHeight])

  return null
}
