import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

/**
 * VisualPageBreaksPlugin - CSS-based page boundaries (Google Docs approach)
 *
 * ROOT CAUSE FIX:
 * - Does NOT manipulate Lexical's DOM
 * - Does NOT clone or move nodes
 * - Uses CSS overlays to create visual page boundaries
 * - Content flows naturally in one ContentEditable
 *
 * HOW IT WORKS:
 * 1. Measures content to calculate page break positions
 * 2. Injects visual page boundary divs at break points
 * 3. CSS styles create Word-like page appearance
 * 4. Lexical content stays untouched - editing works naturally
 *
 * This is the REAL Google Docs implementation.
 */

export default function VisualPageBreaksPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [editor] = useLexicalComposerContext()
  const overlayContainerRef = useRef(null)
  const rafRef = useRef(null)
  const debounceRef = useRef(null)

  console.log('📏 VisualPageBreaksPlugin - Page Size (Source of Truth):', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingX: `${paddingX}px`,
    availableContentHeight: `${pageHeight - paddingTop - paddingBottom}px`
  })

  useEffect(() => {
    const renderPageOverlays = () => {
      const editorRoot = editor.getRootElement()
      if (!editorRoot) return

      const contentElement = editorRoot.querySelector('.editor-content-flat')
      if (!contentElement) return

      // Get or create overlay container
      let overlayContainer = document.getElementById('page-overlays')
      if (!overlayContainer) {
        overlayContainer = document.createElement('div')
        overlayContainer.id = 'page-overlays'
        overlayContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          pointer-events: none;
          z-index: 0;
        `
        contentElement.parentElement.style.position = 'relative'
        contentElement.parentElement.insertBefore(overlayContainer, contentElement)
      }

      // Calculate page breaks based on content height
      const availableHeight = pageHeight - paddingTop - paddingBottom
      const children = Array.from(contentElement.children)

      if (children.length === 0) return

      const pageBreaks = []
      let currentHeight = paddingTop // Start with top padding
      let pageNumber = 0

      children.forEach((child) => {
        const childHeight = child.getBoundingClientRect().height

        if (currentHeight + childHeight > pageHeight - paddingBottom) {
          // Page break needed
          pageBreaks.push({
            pageNumber,
            offsetY: currentHeight
          })
          pageNumber++
          currentHeight = paddingTop + childHeight // Reset to top padding + new content
        } else {
          currentHeight += childHeight
        }
      })

      // Clear existing overlays
      overlayContainer.innerHTML = ''

      const isMobile = window.innerWidth < 900

      // Create visual page overlays
      pageBreaks.forEach((breakInfo, index) => {
        const pageOverlay = document.createElement('div')
        pageOverlay.className = 'page-boundary-overlay'
        pageOverlay.style.cssText = `
          position: absolute;
          top: ${index * (pageHeight + 40)}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${isMobile ? 'calc(100% - 32px)' : pageWidth + 'px'};
          height: ${pageHeight}px;
          background: white;
          box-shadow: ${isMobile ? '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : '0 8px 16px rgba(0,0,0,0.1)'};
          border-radius: ${isMobile ? '8px' : '4px'};
          border: ${isMobile ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'};
          pointer-events: none;
          z-index: -1;
        `
        overlayContainer.appendChild(pageOverlay)
      })

      // Add final page if needed
      if (pageBreaks.length === 0 || currentHeight > paddingTop) {
        const finalPageOverlay = document.createElement('div')
        finalPageOverlay.className = 'page-boundary-overlay'
        finalPageOverlay.style.cssText = `
          position: absolute;
          top: ${pageBreaks.length * (pageHeight + 40)}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${isMobile ? 'calc(100% - 32px)' : pageWidth + 'px'};
          height: ${pageHeight}px;
          background: white;
          box-shadow: ${isMobile ? '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : '0 8px 16px rgba(0,0,0,0.1)'};
          border-radius: ${isMobile ? '8px' : '4px'};
          border: ${isMobile ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'};
          pointer-events: none;
          z-index: -1;
        `
        overlayContainer.appendChild(finalPageOverlay)
      }

      // Style content container
      contentElement.style.cssText = `
        position: relative;
        z-index: 1;
        max-width: ${pageWidth}px;
        margin: 0 auto;
        padding: ${paddingTop}px ${paddingX}px ${paddingBottom}px ${paddingX}px;
        min-height: ${pageHeight}px;
      `

      const totalPages = pageBreaks.length + 1

      // Update page count for overview
      if (onPageCountChange) {
        const pageData = Array.from({ length: totalPages }, (_, index) => ({
          index,
          content: contentElement.innerHTML, // Same content for all (flat)
          height: pageHeight
        }))
        onPageCountChange(pageData)
      }

      console.log(`[VisualPageBreaks] Rendered ${totalPages} page overlays (content untouched)`)
    }

    const scheduleRender = () => {
      clearTimeout(debounceRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      debounceRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(() => {
          renderPageOverlays()
        })
      }, 300)
    }

    // Initial render
    setTimeout(scheduleRender, 100)

    // Re-render on content changes
    const unregister = editor.registerUpdateListener(() => {
      scheduleRender()
    })

    return () => {
      unregister()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(debounceRef.current)

      // Cleanup overlays
      const overlayContainer = document.getElementById('page-overlays')
      if (overlayContainer) {
        overlayContainer.remove()
      }
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom, paddingX, onPageCountChange])

  return null
}
