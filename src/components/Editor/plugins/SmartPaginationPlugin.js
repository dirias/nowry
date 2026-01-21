import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $createParagraphNode,
  $isElementNode,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW
} from 'lexical'
import { $createPageNode, $isPageNode } from '../../../nodes/PageNode'

/**
 * SmartPaginationPlugin - Production-grade pagination with PageNodes
 *
 * ARCHITECTURE:
 * - PageNodes are real containers in Lexical state
 * - Content flows between pages when overflow/underflow detected
 * - Uses proper guards to prevent infinite loops
 * - Handles cursor positioning correctly
 *
 * HOW IT WORKS:
 * 1. Monitor content changes
 * 2. Measure each page's actual vs. max height
 * 3. If overflow: move last nodes to next page
 * 4. If underflow: pull nodes from next page
 * 5. Update page count for overview
 */

export default function SmartPaginationPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [editor] = useLexicalComposerContext()
  const isProcessingRef = useRef(false)
  const debounceRef = useRef(null)
  const lastPageCountRef = useRef(0)
  const skipNextUpdate = useRef(false) // Skip update listener after Enter key

  console.log('📄 SmartPaginationPlugin initialized:', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingX: `${paddingX}px`
  })

  useEffect(() => {
    // Inject CSS variables for PageNode to use
    const editorElement = editor.getRootElement()
    if (editorElement) {
      editorElement.style.setProperty('--page-height', `${pageHeight}px`)
      editorElement.style.setProperty('--page-width', `${pageWidth}px`)
      editorElement.style.setProperty('--page-padding-top', `${paddingTop}px`)
      editorElement.style.setProperty('--page-padding-bottom', `${paddingBottom}px`)
      editorElement.style.setProperty('--page-px', `${paddingX}px`)
    }

    const availableHeight = pageHeight - paddingTop - paddingBottom

    console.log('📏 Available content height per page:', `${availableHeight}px`)

    // Initialize: Ensure we have at least one page
    const initializePages = () => {
      editor.update(() => {
        const root = $getRoot()
        const children = root.getChildren()

        // If no PageNodes exist, create first page with all content
        const hasPages = children.some((child) => $isPageNode(child))

        if (!hasPages) {
          console.log('🏗️ No pages found, initializing first page...')
          const firstPage = $createPageNode(pageHeight, pageWidth)

          // Move all existing content into first page
          const contentNodes = children.filter((node) => !$isPageNode(node))
          contentNodes.forEach((node) => {
            node.remove()
            firstPage.append(node)
          })

          // If page is empty, add a paragraph
          if (firstPage.getChildren().length === 0) {
            firstPage.append($createParagraphNode())
          }

          root.append(firstPage)
          console.log('✅ First page created with content')
        }
      })
    }

    // Pagination logic: Check for overflow/underflow and redistribute
    const paginate = () => {
      if (isProcessingRef.current) {
        console.log('⏳ Pagination already in progress, skipping...')
        return
      }

      isProcessingRef.current = true
      console.log('🔄 Starting pagination check...')

      let iterationCount = 0
      const MAX_ITERATIONS = 10

      try {
        editor.update(() => {
          const root = $getRoot()
          const pages = root.getChildren().filter((node) => $isPageNode(node))

          if (pages.length === 0) {
            console.warn('⚠️ No pages found during pagination')
            isProcessingRef.current = false
            return
          }

          console.log(`📊 Checking ${pages.length} pages for overflow/underflow...`)

          let pagesModified = false

          // Check each page for overflow/underflow (with iteration limit)
          for (let i = 0; i < pages.length && iterationCount < MAX_ITERATIONS; i++) {
            const currentPage = pages[i]
            const pageDOM = editor.getElementByKey(currentPage.getKey())

            if (!pageDOM) continue

            // Temporarily set overflow:hidden to measure clipping
            const originalOverflow = pageDOM.style.overflow
            pageDOM.style.overflow = 'hidden'

            // Force layout recalculation
            pageDOM.offsetHeight

            // Get computed styles to account for actual padding
            const computedStyle = window.getComputedStyle(pageDOM)
            const actualPaddingTop = parseFloat(computedStyle.paddingTop)
            const actualPaddingBottom = parseFloat(computedStyle.paddingBottom)

            // scrollHeight = full content height including overflow
            // clientHeight = visible area
            const contentHeight = pageDOM.scrollHeight
            const containerHeight = pageDOM.clientHeight

            // Restore overflow
            pageDOM.style.overflow = originalOverflow

            console.log(`📄 Page ${i + 1}:`, {
              containerHeight: `${containerHeight}px`,
              contentHeight: `${contentHeight}px`,
              paddingTop: `${actualPaddingTop}px`,
              paddingBottom: `${actualPaddingBottom}px`,
              overflow: contentHeight > containerHeight,
              diff: `${contentHeight - containerHeight}px`
            })

            // OVERFLOW: Move content to next page (even 1px overflow triggers)
            if (contentHeight > containerHeight) {
              iterationCount++
              console.log(`⬇️ Page ${i + 1} OVERFLOW detected (iteration ${iterationCount}/${MAX_ITERATIONS}), moving content...`)

              if (iterationCount >= MAX_ITERATIONS) {
                console.error('❌ Max iterations reached - stopping pagination to prevent infinite loop')
                break
              }

              const children = currentPage.getChildren()
              if (children.length === 0) {
                console.warn('⚠️ Page has overflow but no children')
                continue
              }

              // Check current selection BEFORE moving
              const selection = $getSelection()
              let cursorOffset = null
              let cursorNodeKey = null
              let shouldMoveCursor = false

              if ($isRangeSelection(selection)) {
                const anchorNode = selection.anchor.getNode()
                cursorOffset = selection.anchor.offset
                cursorNodeKey = anchorNode.getKey()
                console.log('🟢 Cursor BEFORE moving:', {
                  nodeKey: cursorNodeKey,
                  offset: cursorOffset,
                  nodeType: anchorNode.getType(),
                  textContent: anchorNode.getTextContent().substring(0, 20)
                })
              }

              // Calculate how much overflow we need to clear
              const overflowAmount = contentHeight - containerHeight
              console.log(`📏 Need to clear ${overflowAmount}px of overflow`)

              // REAL SOLUTION: Measure actual DOM heights to know exactly what to move
              const nodesToMove = []
              let accumulatedHeight = 0

              // Measure nodes from bottom up until we have enough height
              for (let j = children.length - 1; j >= 0; j--) {
                const node = children[j]
                const nodeDOM = editor.getElementByKey(node.getKey())

                if (!nodeDOM) {
                  console.warn(`⚠️ No DOM element for node ${j}`)
                  continue
                }

                // Get ACTUAL measured height
                const nodeHeight = nodeDOM.offsetHeight

                nodesToMove.unshift(node)
                accumulatedHeight += nodeHeight

                console.log(`🟡 Node ${j}:`, {
                  type: node.getType(),
                  textContent: node.getTextContent().substring(0, 30),
                  nodeKey: node.getKey(),
                  measuredHeight: `${nodeHeight}px`,
                  accumulatedHeight: `${accumulatedHeight}px`,
                  needsToClear: `${overflowAmount}px`
                })

                // Check if cursor is in this node
                if (cursorNodeKey) {
                  const checkNodeForCursor = (node) => {
                    if (node.getKey() === cursorNodeKey) {
                      shouldMoveCursor = true
                      console.log('🎯 CURSOR FOUND in node being moved!', {
                        nodeKey: node.getKey(),
                        nodeType: node.getType()
                      })
                      return true
                    }
                    if ($isElementNode(node)) {
                      const children = node.getChildren()
                      for (const child of children) {
                        if (checkNodeForCursor(child)) return true
                      }
                    }
                    return false
                  }
                  checkNodeForCursor(node)
                }

                // Stop when we've accumulated enough height to clear overflow
                if (accumulatedHeight >= overflowAmount) {
                  console.log(`✅ Accumulated ${accumulatedHeight}px (enough to clear ${overflowAmount}px overflow)`)
                  break
                }

                // Safety: keep at least one node on the page
                if (children.length - nodesToMove.length <= 1) {
                  console.log(`⚠️ Stopping - would leave page empty`)
                  break
                }
              }

              if (nodesToMove.length === 0 || children.length <= 1) {
                console.warn('⚠️ Cannot move nodes - would leave page empty or no nodes to move')
                continue
              }

              // Get or create next page
              let nextPage = pages[i + 1]
              if (!nextPage) {
                console.log(`➕ Creating new page ${i + 2}`)
                nextPage = $createPageNode(pageHeight, pageWidth)
                nextPage.append($createParagraphNode())
                currentPage.insertAfter(nextPage)
                pages.push(nextPage)
              }

              // Move all collected nodes to next page
              console.log(`🔴 Moving ${nodesToMove.length} nodes to next page...`)
              nodesToMove.forEach((node, idx) => {
                console.log(`  - Moving node ${idx}:`, {
                  type: node.getType(),
                  key: node.getKey(),
                  text: node.getTextContent().substring(0, 20)
                })
                node.remove()
                const firstChild = nextPage.getChildren()[0]
                if (firstChild) {
                  firstChild.insertBefore(node)
                } else {
                  nextPage.append(node)
                }
              })

              console.log(`✅ Moved ${nodesToMove.length} node(s) to page ${i + 2}`)

              // CRITICAL: Restore cursor position if it was in moved content
              if (shouldMoveCursor && cursorNodeKey && $isRangeSelection(selection)) {
                console.log('🔵 RESTORING CURSOR to moved content...')
                console.log('🔵 Looking for nodeKey:', cursorNodeKey)
                try {
                  // Get the moved node using $getNodeByKey
                  const movedNode = $getNodeByKey(cursorNodeKey)

                  if (movedNode) {
                    console.log('🟢 Found moved node:', {
                      key: movedNode.getKey(),
                      type: movedNode.getType(),
                      parent: movedNode.getParent()?.getType()
                    })

                    // Use the correct selection method based on node type
                    if ($isElementNode(movedNode)) {
                      // For element nodes (paragraphs, etc), use .select() or .selectStart()
                      if (cursorOffset === 0) {
                        movedNode.selectStart()
                        console.log('✅✅✅ CURSOR RESTORED to start of element node')
                      } else {
                        movedNode.selectEnd()
                        console.log('✅✅✅ CURSOR RESTORED to end of element node')
                      }
                    } else {
                      // For text nodes, we can set anchor/focus directly
                      movedNode.select(cursorOffset, cursorOffset)
                      console.log('✅✅✅ CURSOR RESTORED to text node at offset:', cursorOffset)
                    }

                    // Verify cursor was actually moved
                    const verifySelection = $getSelection()
                    if ($isRangeSelection(verifySelection)) {
                      console.log('🔍 Verification - cursor is now at:', {
                        nodeKey: verifySelection.anchor.getNode().getKey(),
                        offset: verifySelection.anchor.offset,
                        nodeType: verifySelection.anchor.getNode().getType()
                      })
                    }
                  } else {
                    console.error('❌ Moved node not found by key:', cursorNodeKey)
                  }
                } catch (e) {
                  console.error('❌ Could not restore cursor:', e)
                }
              } else {
                console.log('⚠️ Not restoring cursor:', { shouldMoveCursor, cursorNodeKey, hasSelection: $isRangeSelection(selection) })
              }

              pagesModified = true
              break // Re-measure after modification
            }

            // UNDERFLOW: Pull content from next page if exists (85% threshold for hysteresis)
            if (contentHeight < containerHeight * 0.85 && i < pages.length - 1) {
              const nextPage = pages[i + 1]
              const nextChildren = nextPage.getChildren()

              if (nextChildren.length > 1) {
                // Keep at least one element in next page
                console.log(`⬆️ Page ${i + 1} UNDERFLOW, pulling content from page ${i + 2}`)

                const firstChild = nextChildren[0]
                firstChild.remove()
                currentPage.append(firstChild)

                console.log(`✅ Pulled node from page ${i + 2}`)
                pagesModified = true
                break // Re-measure after modification
              }
            }
          }

          // Remove empty pages (except last one)
          for (let i = pages.length - 1; i > 0; i--) {
            const page = pages[i]
            const children = page.getChildren()

            if (children.length === 0 || (children.length === 1 && children[0].getTextContent().trim() === '')) {
              console.log(`🗑️ Removing empty page ${i + 1}`)
              page.remove()
              pages.splice(i, 1)
              pagesModified = true
            }
          }

          // Update page count for overview
          if (pages.length !== lastPageCountRef.current && onPageCountChange) {
            lastPageCountRef.current = pages.length

            const pageData = pages.map((page, index) => ({
              index,
              content: page.getTextContent(),
              height: pageHeight
            }))

            onPageCountChange(pageData)
            console.log(`📊 Updated overview: ${pages.length} pages`)
          }

          console.log(pagesModified ? '✅ Pagination complete (modified)' : '✅ Pagination complete (no changes)')

          // After pagination, scroll to cursor position if needed
          if (pagesModified) {
            console.log('📜 Pages were modified, scheduling scroll to cursor...')
            setTimeout(() => {
              editor.read(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                  const anchorNode = selection.anchor.getNode()
                  const anchorDOM = editor.getElementByKey(anchorNode.getKey())

                  console.log('📍 Final cursor position:', {
                    nodeKey: anchorNode.getKey(),
                    offset: selection.anchor.offset,
                    hasDOMElement: !!anchorDOM
                  })

                  if (anchorDOM) {
                    // Scroll into view if cursor is off-screen
                    anchorDOM.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    console.log('🎯 Scrolled to cursor position')
                  }
                }
              })
            }, 100) // Small delay to ensure DOM is updated
          }
        })
      } catch (error) {
        console.error('❌ Pagination error:', error)
      } finally {
        isProcessingRef.current = false
      }
    }

    // Debounced pagination to avoid rapid re-calculations
    const schedulePagination = (immediate = false) => {
      if (immediate) {
        // Run immediately without debounce (e.g., after Enter key)
        console.log('⚡ Immediate pagination triggered')
        clearTimeout(debounceRef.current)
        paginate()
      } else {
        // Normal debounced pagination
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          paginate()
        }, 100) // 100ms debounce - quick but not too aggressive
      }
    }

    // Listen for Enter key to trigger immediate pagination
    const unregisterEnterCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        console.log('🔵 ===== ENTER KEY PRESSED =====')

        // Log current cursor position
        editor.read(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode()
            const parent = anchorNode.getParent()
            console.log('🔵 Cursor before Enter:', {
              nodeKey: anchorNode.getKey(),
              nodeType: anchorNode.getType(),
              parentType: parent?.getType(),
              isInPage: $isPageNode(parent) || $isPageNode(parent?.getParent()),
              offset: selection.anchor.offset
            })
          }
        })

        skipNextUpdate.current = true // Skip the debounced update listener

        // Schedule immediate pagination after Enter creates the new paragraph
        setTimeout(() => {
          console.log('🔵 Running immediate pagination after Enter...')
          schedulePagination(true)
        }, 10) // Small delay to let Enter create the paragraph first

        return false // Don't prevent default Enter behavior
      },
      COMMAND_PRIORITY_LOW
    )

    // Initialize on mount
    setTimeout(initializePages, 100)

    // Register for editor updates (but skip if Enter key just fired)
    const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      // Skip if Enter key just triggered immediate pagination
      if (skipNextUpdate.current) {
        console.log('⏭️ Skipping debounced pagination (Enter key handled it)')
        skipNextUpdate.current = false
        return
      }

      // Only paginate if content actually changed
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
        schedulePagination(false) // Use debounced pagination for typing
      }
    })

    return () => {
      unregister()
      unregisterEnterCommand()
      clearTimeout(debounceRef.current)
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom, paddingX, onPageCountChange])

  return null
}
