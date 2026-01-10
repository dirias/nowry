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
  const debounceTimer = useRef(null)
  const lastMoveTracker = useRef(new Map()) // Track recent moves to prevent ping-pong
  const iterationCount = useRef(0)
  const MAX_ITERATIONS = 50 // Prevent infinite loops
  const isPaginating = useRef(false) // Track if we are actively paginating

  // Trigger immediate repagination when pageHeight changes
  useEffect(() => {
    const triggerRepagination = () => {
      iterationCount.current = 0 // Reset counter on manual trigger
      lastMoveTracker.current.clear()
      isPaginating.current = true // Force fast pagination match

      editor.update(() => {
        const root = $getRoot()
        const pages = root.getChildren().filter($isPageNode)
        pages.forEach((page) => {
          page.markDirty()
        })
      })
    }

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

    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (isProcessing.current) return

      // Debounce pagination checks to avoid excessive recalculations
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      // Dynamic debounce: fast when actively paginating, slow when stable
      const delay = isPaginating.current ? 10 : 200

      debounceTimer.current = setTimeout(() => {
        const rootElement = editor.getRootElement()

        if (!rootElement) {
          console.warn('ContinuousPaginationPlugin: rootElement is null, skipping pagination')
          return
        }

        // Check iteration limit to prevent infinite loops
        if (iterationCount.current >= MAX_ITERATIONS) {
          console.warn('ContinuousPaginationPlugin: Max iterations reached, stopping pagination to prevent freeze')
          iterationCount.current = 0
          lastMoveTracker.current.clear()
          isPaginating.current = false
          return
        }

        editor.update(() => {
          isProcessing.current = true
          try {
            const root = $getRoot()
            const pages = root.getChildren().filter($isPageNode)

            if (pages.length === 0) return

            iterationCount.current++
            let madeChange = false

            // Process pages in order
            for (let i = 0; i < pages.length; i++) {
              const page = pages[i]
              const pageKey = page.getKey()
              const pageElement = editor.getElementByKey(pageKey)

              if (!pageElement) continue

              // 1. CHECK OVERFLOW (Move content forward to next page)
              if (pageElement.offsetHeight > pageHeight + 10) {
                const children = page.getChildren()
                if (children.length === 0) continue

                // Move last child to next page
                const lastChild = children[children.length - 1]
                const childKey = lastChild.getKey()

                // Check if we recently moved this exact node in the opposite direction
                const moveSignature = `${childKey}-forward`
                const reverseSignature = `${childKey}-backward`

                if (lastMoveTracker.current.get(reverseSignature) === i + 1) {
                  // This would create a ping-pong, skip this element
                  console.warn('ContinuousPaginationPlugin: Detected potential ping-pong, skipping element')
                  continue
                }

                const childElement = editor.getElementByKey(childKey)
                if (!childElement) continue

                // Don't move if child alone is bigger than page (e.g., large image)
                const childHeight = childElement.offsetHeight
                if (childHeight > pageHeight - 192 - 20) {
                  // This element is too large to ever fit - allow overflow
                  console.warn('ContinuousPaginationPlugin: Element too large for page, allowing overflow')
                  continue
                }

                // Create or get next page
                let nextPage = i + 1 < pages.length ? pages[i + 1] : null
                if (!nextPage) {
                  nextPage = $createPageNode()
                  root.append(nextPage)
                }

                // Move child to next page
                const firstChild = nextPage.getFirstChild()
                if (firstChild) {
                  firstChild.insertBefore(lastChild)
                } else {
                  nextPage.append(lastChild)
                }

                // Track this move
                lastMoveTracker.current.set(moveSignature, i + 1)
                madeChange = true
                break // Process one move at a time
              }

              // 2. CHECK UNDERFLOW (Pull content from next page)
              else if (i + 1 < pages.length) {
                const nextPage = pages[i + 1]
                const nextChildren = nextPage.getChildren()

                if (nextChildren.length > 0) {
                  const firstChild = nextChildren[0]
                  const childKey = firstChild.getKey()
                  const childElement = editor.getElementByKey(childKey)

                  if (childElement) {
                    // Calculate available space on current page
                    const pageChildren = pageElement.children
                    let usedHeight = 96 // Top padding

                    if (pageChildren.length > 0) {
                      const lastPageChild = pageChildren[pageChildren.length - 1]
                      const pageRect = pageElement.getBoundingClientRect()
                      const lastChildRect = lastPageChild.getBoundingClientRect()
                      usedHeight = lastChildRect.bottom - pageRect.top
                    }

                    const childHeight = childElement.offsetHeight
                    const availableHeight = pageHeight - 96 - 20 // Bottom padding + buffer

                    // Check ping-pong
                    const moveSignature = `${childKey}-backward`
                    const reverseSignature = `${childKey}-forward`

                    if (lastMoveTracker.current.get(reverseSignature) === i) {
                      // Would create ping-pong
                      continue
                    }

                    if (usedHeight + childHeight < availableHeight) {
                      page.append(firstChild)
                      lastMoveTracker.current.set(moveSignature, i)
                      madeChange = true
                      break
                    }
                  }
                } else if (pages.length > 1) {
                  // Remove empty pages (except last one)
                  nextPage.remove()
                  madeChange = true
                  break
                }
              }
            }

            // Update paginating state for next pass
            isPaginating.current = madeChange

            // Reset iteration counter if no changes (stable state)
            if (!madeChange) {
              iterationCount.current = 0
              // Clean up old moves from tracker
              if (lastMoveTracker.current.size > 100) {
                lastMoveTracker.current.clear()
              }
            }
          } finally {
            isProcessing.current = false
          }
        })
      }, delay)
    })
  }, [editor, pageHeight])

  return null
}
