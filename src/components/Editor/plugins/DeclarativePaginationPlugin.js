import { useEffect, useRef, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $createParagraphNode } from 'lexical'
import { $createPageNode, $isPageNode, PageNode } from '../../../nodes/PageNode'
import { calculatePageBreaks, applyPageBreaksToEditor } from './PageCalculator'

/**
 * DeclarativePaginationPlugin - Scalable, single-pass pagination
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Content-First: Content stored flat, no PageNodes in storage
 * 2. Calculated: Pages calculated from content, not iterated
 * 3. Declarative: Pure function calculates breaks, applies once
 * 4. Scalable: O(n) complexity, handles 1000+ pages
 *
 * HOW IT WORKS:
 * 1. User edits content
 * 2. Debounced trigger waits for edits to settle
 * 3. Calculate ALL page breaks in ONE PASS (pure function)
 * 4. Apply breaks in ONE UPDATE
 * 5. Done. No iterations.
 *
 * vs OLD APPROACH (IncrementalPaginationPlugin):
 * - OLD: while(hasOverflow) { move1Element(); checkAgain(); } // O(n²)
 * - NEW: breaks = calculate(content); apply(breaks); // O(n)
 */

export default function DeclarativePaginationPlugin({ pageHeight = 1123, pageWidth = 794, paddingTop = 96, paddingBottom = 96 }) {
  const [editor] = useLexicalComposerContext()
  const isProcessing = useRef(false)
  const rafId = useRef(null)

  console.log('📐 DeclarativePaginationPlugin initialized:', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    availableContentHeight: `${pageHeight - paddingTop - paddingBottom}px`
  })

  /**
   * Main pagination function - Single pass, no iterations
   */
  const paginate = useCallback(async () => {
    if (isProcessing.current) {
      console.log('[DeclarativePagination] Already processing, skipping...')
      return
    }

    isProcessing.current = true
    console.log('[DeclarativePagination] Starting pagination...')

    try {
      // Step 1: Get content container from DOM
      const editorElement = editor.getRootElement()
      if (!editorElement) {
        console.warn('[DeclarativePagination] No editor element found')
        return
      }

      // Step 2: Check if we need to initialize
      let needsInit = false
      editor.read(() => {
        const root = $getRoot()
        const pages = root.getChildren().filter($isPageNode)
        needsInit = pages.length === 0
      })

      if (needsInit) {
        console.log('[DeclarativePagination] Initializing first page...')
        await new Promise((resolve) => {
          editor.update(
            () => {
              const root = $getRoot()
              const firstPage = $createPageNode(pageHeight, pageWidth)
              const allContent = root.getChildren().filter((node) => !$isPageNode(node))

              allContent.forEach((node) => firstPage.append(node))

              if (firstPage.getChildrenSize() === 0) {
                firstPage.append($createParagraphNode())
              }

              root.append(firstPage)
              console.log('✓ First page initialized')
              resolve(true)
            },
            { tag: 'pagination-update' }
          )
        })
        return
      }

      // Step 3: Get content nodes from Lexical
      let contentNodes = []
      editor.read(() => {
        const root = $getRoot()
        contentNodes = root.getChildren().filter((node) => !$isPageNode(node))

        // If content is in pages, extract it (handles legacy/initial load)
        if (contentNodes.length === 0) {
          const pages = root.getChildren().filter($isPageNode)
          pages.forEach((page) => {
            contentNodes.push(...page.getChildren())
          })
        }

        console.log(`[DeclarativePagination] Found ${contentNodes.length} content nodes to paginate`)
      })

      if (contentNodes.length === 0) {
        console.warn('[DeclarativePagination] No content to paginate')
        return
      }

      // Step 4: Create temp container and clone nodes with their DOM
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.visibility = 'hidden'
      tempContainer.style.width = `${pageWidth}px`
      tempContainer.style.padding = `${paddingTop}px 0 ${paddingBottom}px 0`
      tempContainer.style.fontSize = getComputedStyle(editorElement).fontSize
      tempContainer.style.lineHeight = getComputedStyle(editorElement).lineHeight
      tempContainer.style.fontFamily = getComputedStyle(editorElement).fontFamily

      // Clone each node's DOM representation for measurement
      contentNodes.forEach((node) => {
        const domNode = editor.getElementByKey(node.getKey())
        if (domNode) {
          tempContainer.appendChild(domNode.cloneNode(true))
        }
      })

      document.body.appendChild(tempContainer)

      // Wait for layout
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      // Step 5: Calculate page breaks (pure function, no iterations)
      const pageBreaks = calculatePageBreaks(tempContainer, pageHeight, paddingTop, paddingBottom)

      // Step 6: Clean up temp container
      document.body.removeChild(tempContainer)

      // Step 7: Apply breaks to editor (single update)
      await applyPageBreaksToEditor(editor, pageBreaks, contentNodes, () => $createPageNode(pageHeight, pageWidth), $isPageNode, $getRoot)

      // Step 7: Page content will be captured by Editor.js's MutationObserver
      // No need to call onPageUpdate here - content capture handles it

      console.log(`✅ Pagination complete: ${pageBreaks.length} pages created`)
    } catch (error) {
      console.error('[DeclarativePagination] Error:', error)
    } finally {
      isProcessing.current = false
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom])

  /**
   * Listen to content changes and trigger pagination
   */
  useEffect(() => {
    if (!editor.hasNodes([PageNode])) {
      throw new Error('DeclarativePaginationPlugin: PageNode not registered')
    }

    let debounceTimer = null

    // Apply .paginated class to prevent visual overflow
    const applyPaginatedClass = () => {
      const pages = editor.getRootElement()?.querySelectorAll('.editor-page')
      if (pages) {
        pages.forEach((page) => page.classList.add('paginated'))
      }
    }

    // Apply on mount
    setTimeout(applyPaginatedClass, 0)

    // Listen for content changes
    const unregister = editor.registerUpdateListener(({ tags }) => {
      // Skip our own updates
      if (tags.has('pagination-update')) return

      // Cancel previous timer
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // Debounce: Wait for editing to settle (300ms)
      debounceTimer = setTimeout(() => {
        rafId.current = requestAnimationFrame(() => {
          paginate()
        })
      }, 300)
    })

    // Initial pagination
    setTimeout(() => {
      paginate()
    }, 100)

    return () => {
      unregister()
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [editor, paginate])

  return null
}
