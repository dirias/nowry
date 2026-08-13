import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getSelection, $isRangeSelection, $createRangeSelection, $getNearestNodeFromDOMNode } from 'lexical'
import { $generateHtmlFromNodes } from '@lexical/html'

/**
 * PaginationPlugin - Handles content overflow by moving excess nodes to the next page.
 * Immediately removes moved nodes from the editor to prevent duplication loops.
 */
export default function PaginationPlugin({ pageHeight = 1122, onOverflow }) {
  const [editor] = useLexicalComposerContext()
  const isProcessingRef = useRef(false)
  const lastProcessedContent = useRef(null)

  useEffect(() => {
    if (!onOverflow) return

    const checkOverflow = () => {
      // Prevent recursive loops or concurrent processing
      if (isProcessingRef.current) return

      // Use editor.update for solid context
      editor.update(() => {
        const rootElement = editor.getRootElement()
        if (!rootElement) return

        // Trigger immediately when content exceeds the printable area
        const buffer = 0
        if (rootElement.scrollHeight > pageHeight + buffer) {
          const root = $getRoot()
          const currentHtml = $generateHtmlFromNodes(editor, null)

          if (currentHtml === lastProcessedContent.current) return

          const rootRect = rootElement.getBoundingClientRect()
          const relativePageTop = rootRect.top

          const findFirstOverflowingElement = (container) => {
            const children = container.children
            for (let i = 0; i < children.length; i++) {
              const child = children[i]
              const rect = child.getBoundingClientRect()
              if (rect.bottom - relativePageTop > pageHeight) {
                if (
                  (child.classList.contains('editor-column-container') || child.classList.contains('editor-column')) &&
                  child.children.length > 0
                ) {
                  const deeper = findFirstOverflowingElement(child)
                  return deeper || child
                }
                return child
              }
            }
            return null
          }

          const firstOverflowingEl = findFirstOverflowingElement(rootElement)

          if (firstOverflowingEl) {
            const overflowingNode = $getNearestNodeFromDOMNode(firstOverflowingEl)
            if (!overflowingNode) return

            // Mark as processing
            isProcessingRef.current = true
            lastProcessedContent.current = currentHtml

            const allRootChildren = root.getChildren()
            const overflowingTopLevel = overflowingNode.getTopLevelElement()
            const splitIdx = allRootChildren.findIndex((n) => n.is(overflowingTopLevel))

            if (splitIdx === -1) {
              isProcessingRef.current = false
              return
            }

            // --- Capture Moved Content ---
            const lastNode = root.getLastChild()
            const moveRange = $createRangeSelection()
            moveRange.anchor.set(overflowingTopLevel.getKey(), 0, 'element')
            moveRange.focus.set(lastNode.getKey(), lastNode.getChildrenSize?.() || 0, 'element')
            const movedHtml = $generateHtmlFromNodes(editor, moveRange)

            // --- Capture Remaining Content ---
            const stayRange = $createRangeSelection()
            stayRange.anchor.set(allRootChildren[0].getKey(), 0, 'element')
            stayRange.focus.set(overflowingTopLevel.getKey(), 0, 'element')
            const remainingHtml = $generateHtmlFromNodes(editor, stayRange)

            // --- User Selection Logic ---
            let shouldSwitch = false
            const userSelection = $getSelection()
            if ($isRangeSelection(userSelection)) {
              const anchorTop = userSelection.anchor.getNode()?.getTopLevelElement()
              const focusTop = userSelection.focus.getNode()?.getTopLevelElement()
              const anchorIdx = allRootChildren.findIndex((n) => n.is(anchorTop))
              const focusIdx = allRootChildren.findIndex((n) => n.is(focusTop))

              if (anchorIdx >= splitIdx || focusIdx >= splitIdx) {
                shouldSwitch = true
              }
            }

            // --- IMMEDIATE REMOVAL ---
            for (let i = allRootChildren.length - 1; i >= splitIdx; i--) {
              allRootChildren[i].remove()
            }

            // Notify parent
            onOverflow(remainingHtml, movedHtml, shouldSwitch)

            // Seamless jump to next editor
            if (shouldSwitch) {
              setTimeout(() => {
                const root = editor.getRootElement()
                const currentContainer = root?.closest('.page-sheet-container')
                if (currentContainer) {
                  const allPages = Array.from(document.querySelectorAll('.page-sheet-container'))
                  const currentIndex = allPages.indexOf(currentContainer)
                  if (currentIndex !== -1 && currentIndex < allPages.length - 1) {
                    const nextEditor = allPages[currentIndex + 1].querySelector('.editor-content')
                    if (nextEditor) {
                      nextEditor.focus()
                    }
                  }
                }
              }, 50)
            }

            // Release lock
            setTimeout(() => {
              isProcessingRef.current = false
            }, 500)
          }
        }
      })
    }

    // Faster check for modern browsers
    const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyNodes }) => {
      // Use optional chaining to prevent "size of undefined" error
      if ((dirtyElements?.size || 0) > 0 || (dirtyNodes?.size || 0) > 0) {
        checkOverflow()
      }
    })

    return () => {
      unregister()
    }
  }, [editor, pageHeight, onOverflow])

  return null
}
