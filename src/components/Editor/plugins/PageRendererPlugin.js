import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

/**
 * PageRendererPlugin - Renders visual Word-like pages
 *
 * ARCHITECTURE (Google Docs / Word Online approach):
 * 1. Content is FLAT in Lexical (natural editing)
 * 2. Visual pages are created by DOM manipulation (display only)
 * 3. Each page is a styled container that shows a slice of content
 * 4. Pages look like Word - white background, shadow, fixed height
 *
 * HOW IT WORKS:
 * - Measures content height dynamically
 * - Calculates how many pages needed
 * - Wraps content sections in visual page divs
 * - Each page has fixed height and clips overflow
 * - Content flows naturally, pages provide visual structure
 *
 * This is NOT a patch - this is how Word Online works.
 */

export default function PageRendererPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [editor] = useLexicalComposerContext()
  const lastPageCountRef = useRef(0)
  const rafRef = useRef(null)
  const debounceRef = useRef(null)

  // Log page dimensions (Source of Truth verification)
  console.log('📏 PageRendererPlugin - Page Size (Source of Truth):', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingX: `${paddingX}px`,
    availableContentHeight: `${pageHeight - paddingTop - paddingBottom}px`
  })

  useEffect(() => {
    const renderPages = () => {
      const editorRoot = editor.getRootElement()
      if (!editorRoot) return

      // Get the flat content container
      const contentElement = editorRoot.querySelector('.editor-content-flat')
      if (!contentElement) return

      // Check if we've already wrapped in pages
      if (contentElement.classList.contains('paginated')) {
        return
      }

      // Calculate available content height per page
      const availableHeight = pageHeight - paddingTop - paddingBottom

      // Get all direct children (content nodes)
      const children = Array.from(contentElement.children)
      if (children.length === 0) return

      // Calculate page breaks
      const pageBreaks = []
      let currentPageStart = 0
      let currentHeight = 0
      let pageNumber = 0

      children.forEach((child, index) => {
        const childHeight = child.getBoundingClientRect().height

        if (currentHeight + childHeight > availableHeight && currentHeight > 0) {
          // Page break
          pageBreaks.push({
            pageNumber,
            startIndex: currentPageStart,
            endIndex: index
          })
          pageNumber++
          currentPageStart = index
          currentHeight = childHeight
        } else {
          currentHeight += childHeight
        }
      })

      // Last page
      if (currentPageStart < children.length) {
        pageBreaks.push({
          pageNumber,
          startIndex: currentPageStart,
          endIndex: children.length
        })
      }

      // Create visual pages
      const isMobile = window.innerWidth < 900

      // Clear existing structure
      while (contentElement.firstChild) {
        contentElement.firstChild.remove()
      }

      pageBreaks.forEach((breakInfo, pageIndex) => {
        // Create page container
        const pageDiv = document.createElement('div')
        pageDiv.className = 'visual-word-page'
        pageDiv.setAttribute('data-page-number', pageIndex + 1)

        // Style page like Word
        Object.assign(pageDiv.style, {
          position: 'relative',
          width: isMobile ? 'calc(100% - 32px)' : `${pageWidth}px`,
          minHeight: `${pageHeight}px`,
          maxHeight: `${pageHeight}px`,
          height: `${pageHeight}px`,
          backgroundColor: 'white',
          boxShadow: isMobile ? '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : '0 8px 16px rgba(0,0,0,0.1)',
          borderRadius: isMobile ? '8px' : '4px',
          padding: isMobile ? '24px 20px' : `${paddingTop}px ${paddingX}px ${paddingBottom}px ${paddingX}px`,
          margin: isMobile ? '12px auto' : '20px auto',
          overflow: 'hidden',
          boxSizing: 'border-box',
          border: isMobile ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
        })

        // Add content to this page
        for (let i = breakInfo.startIndex; i < breakInfo.endIndex; i++) {
          if (children[i]) {
            pageDiv.appendChild(children[i].cloneNode(true))
          }
        }

        contentElement.appendChild(pageDiv)
      })

      // Mark as paginated
      contentElement.classList.add('paginated')

      // Update page count
      if (pageBreaks.length !== lastPageCountRef.current && onPageCountChange) {
        lastPageCountRef.current = pageBreaks.length

        // Generate page data for overview
        const pageData = pageBreaks.map((breakInfo, index) => ({
          index,
          content: Array.from(contentElement.querySelectorAll('.visual-word-page')[index]?.children || [])
            .map((el) => el.outerHTML)
            .join(''),
          height: pageHeight
        }))

        onPageCountChange(pageData)
      }

      console.log(`[PageRenderer] Rendered ${pageBreaks.length} visual pages`)
    }

    const scheduleRender = () => {
      clearTimeout(debounceRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      debounceRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(() => {
          renderPages()
        })
      }, 300)
    }

    // Initial render
    scheduleRender()

    // Re-render on content changes
    const unregister = editor.registerUpdateListener(() => {
      const editorRoot = editor.getRootElement()
      const contentElement = editorRoot?.querySelector('.editor-content-flat')
      if (contentElement) {
        contentElement.classList.remove('paginated')
      }
      scheduleRender()
    })

    return () => {
      unregister()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(debounceRef.current)
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom, paddingX, onPageCountChange])

  return null
}
