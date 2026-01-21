import { useEffect, useRef, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $createParagraphNode } from 'lexical'

/**
 * FlatContentPaginationPlugin - Production-grade pagination
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Content is FLAT in Lexical (no PageNodes)
 * 2. Pages are VISUAL ONLY (CSS overlays)
 * 3. No patches needed - Lexical works naturally
 * 4. Scalable - Google Docs approach
 *
 * HOW IT WORKS:
 * - Content flows naturally in one ContentEditable
 * - Visual overlays create page appearance
 * - No structural containers that break Lexical
 * - All editing features work out of the box
 *
 * BENEFITS:
 * ✅ Natural click-to-focus (no PageClickPlugin needed)
 * ✅ Natural selection across pages
 * ✅ Natural copy/paste across pages
 * ✅ Natural keyboard navigation
 * ✅ No patches needed for Lexical features
 */

export default function FlatContentPaginationPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageDataChange
}) {
  const [editor] = useLexicalComposerContext()
  const debounceRef = useRef(null)
  const lastContentRef = useRef('')

  console.log('📐 FlatContentPaginationPlugin initialized:', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    availableContentHeight: `${pageHeight - paddingTop - paddingBottom}px`,
    architecture: 'Flat content + Visual pages (Google Docs approach)'
  })

  /**
   * Calculate page breaks from flat content
   */
  const calculatePageData = useCallback(() => {
    const editorElement = editor.getRootElement()
    if (!editorElement) return []

    const availableHeight = pageHeight - paddingTop - paddingBottom
    const pageData = []
    let currentPage = 0
    let currentHeight = 0
    let pageContent = []

    // Get all direct children (flat content)
    const elements = Array.from(editorElement.querySelectorAll('.editor-content > *'))

    elements.forEach((element, index) => {
      const elementHeight = element.getBoundingClientRect().height

      if (currentHeight + elementHeight > availableHeight && currentHeight > 0) {
        // Page break - save current page
        pageData.push({
          index: currentPage,
          content: pageContent.map((el) => el.outerHTML).join(''),
          height: currentHeight
        })

        currentPage++
        currentHeight = elementHeight
        pageContent = [element]
      } else {
        currentHeight += elementHeight
        pageContent.push(element)
      }
    })

    // Last page
    if (pageContent.length > 0) {
      pageData.push({
        index: currentPage,
        content: pageContent.map((el) => el.outerHTML).join(''),
        height: currentHeight
      })
    }

    // Ensure at least one page
    if (pageData.length === 0) {
      pageData.push({
        index: 0,
        content: '<p></p>',
        height: 0
      })
    }

    return pageData
  }, [editor, pageHeight, paddingTop, paddingBottom])

  /**
   * Update page data when content changes
   */
  const updatePageData = useCallback(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const pageData = calculatePageData()
      const contentSignature = JSON.stringify(pageData.map((p) => p.height))

      if (contentSignature !== lastContentRef.current) {
        lastContentRef.current = contentSignature
        if (onPageDataChange) {
          onPageDataChange(pageData)
        }
        console.log(`[FlatPagination] Calculated ${pageData.length} pages (no PageNodes)`)
      }
    }, 300)
  }, [calculatePageData, onPageDataChange])

  /**
   * Listen to content changes
   */
  useEffect(() => {
    // Initial update
    setTimeout(updatePageData, 100)

    // Listen to editor updates
    const unregister = editor.registerUpdateListener(() => {
      updatePageData()
    })

    return () => {
      unregister()
      clearTimeout(debounceRef.current)
    }
  }, [editor, updatePageData])

  /**
   * Ensure editor has initial content
   */
  useEffect(() => {
    editor.read(() => {
      const root = $getRoot()
      if (root.getChildrenSize() === 0) {
        editor.update(() => {
          const rootAgain = $getRoot()
          rootAgain.append($createParagraphNode())
          console.log('✓ Initialized empty editor with paragraph')
        })
      }
    })
  }, [editor])

  return null
}
