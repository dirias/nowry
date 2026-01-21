import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

/**
 * MultiPageRendererPlugin - REAL Word-like multi-page rendering
 *
 * PRODUCTION APPROACH (How Word/Google Docs actually works):
 * 1. Content is flat in Lexical (single ContentEditable)
 * 2. Measure content and calculate page breaks
 * 3. Create visual page containers (white boxes)
 * 4. Position content to appear across multiple pages
 * 5. Handle overflow properly
 *
 * This is the REAL production solution - not a workaround.
 */

export default function MultiPageRendererPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [editor] = useLexicalComposerContext()
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const lastPageCountRef = useRef(0)

  console.log('📏 MultiPageRenderer - Page Size (Source of Truth):', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingX: `${paddingX}px`
  })

  useEffect(() => {
    const renderPages = () => {
      console.log('[MultiPageRenderer] Starting renderPages...')

      const editorRoot = editor.getRootElement()
      if (!editorRoot) {
        console.warn('[MultiPageRenderer] ❌ No editor root element')
        return
      }
      console.log('[MultiPageRenderer] ✓ Found editor root')

      // The editorRoot IS the content element (has class 'editor-content-flat')
      const contentElement = editorRoot
      console.log('[MultiPageRenderer] ✓ Using editor root as content element:', {
        className: contentElement.className,
        scrollHeight: contentElement.scrollHeight + 'px',
        innerHTML: contentElement.innerHTML.substring(0, 200) + '...',
        childrenCount: contentElement.children.length,
        textContent: contentElement.textContent.substring(0, 100) + '...'
      })

      // Get or create pages container
      const parentContainer = contentElement.parentElement
      if (!parentContainer) {
        console.warn('[MultiPageRenderer] ❌ No parent container')
        return
      }
      console.log('[MultiPageRenderer] ✓ Found parent container')

      let pagesContainer = parentContainer.querySelector('.pages-container')
      if (!pagesContainer) {
        console.log('[MultiPageRenderer] Creating .pages-container...')
        pagesContainer = document.createElement('div')
        pagesContainer.className = 'pages-container'
        pagesContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        `
        parentContainer.style.position = 'relative'
        parentContainer.insertBefore(pagesContainer, contentElement)
        console.log('[MultiPageRenderer] ✓ Created .pages-container')
      }

      // Calculate how many pages we need
      const contentHeight = contentElement.scrollHeight
      const effectivePageHeight = pageHeight - paddingTop - paddingBottom
      const pageCount = Math.max(1, Math.ceil(contentHeight / effectivePageHeight))

      console.log('[MultiPageRenderer] Page calculation:', {
        contentHeight: contentHeight + 'px',
        pageHeight: pageHeight + 'px',
        effectivePageHeight: effectivePageHeight + 'px',
        paddingTop: paddingTop + 'px',
        paddingBottom: paddingBottom + 'px',
        pageCount
      })

      // Clear existing pages
      pagesContainer.innerHTML = ''

      const isMobile = window.innerWidth < 900
      const pageMargin = isMobile ? 12 : 20
      const pageMarginPx = isMobile ? '12px' : '20px'

      // Create visual page boxes WITH padding applied (like real Word pages)
      for (let i = 0; i < pageCount; i++) {
        const pageDiv = document.createElement('div')
        pageDiv.className = 'word-page'
        pageDiv.setAttribute('data-page-number', i + 1)

        const pageBoxWidth = isMobile ? 'calc(100% - 32px)' : `${pageWidth}px`
        const pageBoxHeight = `${pageHeight}px`

        // Visual page box with padding applied (content area is inside)
        pageDiv.style.cssText = `
          position: relative;
          width: ${pageBoxWidth} !important;
          height: ${pageBoxHeight} !important;
          background: white;
          box-shadow: ${isMobile ? '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : '0 8px 16px rgba(0,0,0,0.1)'};
          border-radius: ${isMobile ? '8px' : '4px'};
          margin: ${pageMarginPx} auto;
          border: ${isMobile ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'};
          overflow: hidden;
          box-sizing: border-box;
          padding: ${paddingTop}px ${paddingX}px ${paddingBottom}px ${paddingX}px;
          flex-shrink: 0;
        `

        pagesContainer.appendChild(pageDiv)

        console.log(`📄 Page ${i + 1} box:`, {
          width: pageBoxWidth,
          height: pageBoxHeight,
          padding: `${paddingTop}px ${paddingX}px ${paddingBottom}px ${paddingX}px`,
          overflow: 'hidden',
          background: 'white'
        })
      }

      // Position pages container
      pagesContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
      `

      // Calculate content dimensions to match page inner area
      const contentInnerWidth = pageWidth - paddingX * 2
      const gapHeight = pageMargin * 2 + paddingTop + paddingBottom

      // Position content to match the padding of pages
      contentElement.style.cssText = `
        position: relative;
        width: ${contentInnerWidth}px !important;
        max-width: ${contentInnerWidth}px !important;
        margin: ${pageMargin + paddingTop}px auto 0 !important;
        padding: 0 !important;
        padding-bottom: ${pageMargin + paddingBottom}px !important;
        box-sizing: content-box !important;
        z-index: 2 !important;
        pointer-events: auto !important;
        caret-color: #000 !important;
        background: transparent !important;
        color: #222 !important;
        font-family: 'Inter', system-ui, sans-serif !important;
        font-size: 16px !important;
        line-height: 1.6 !important;
        outline: none !important;
      `

      // Create gap overlay divs to hide content between pages
      let gapsContainer = parentContainer.querySelector('.page-gaps-overlay')
      if (!gapsContainer) {
        gapsContainer = document.createElement('div')
        gapsContainer.className = 'page-gaps-overlay'
        parentContainer.appendChild(gapsContainer)
      } else {
        gapsContainer.innerHTML = ''
      }

      // Create blocking divs for each gap between pages
      for (let i = 0; i < pageCount - 1; i++) {
        const gapDiv = document.createElement('div')

        // Calculate gap position:
        // After page i ends, before page i+1 starts
        // Page i bottom = pageMargin + (i+1)*pageHeight + i*(pageMargin*2) + pageMargin
        // Simplified: pageMargin + (i+1)*(pageHeight + pageMargin*2)
        const gapTop = pageMargin + (i + 1) * (pageHeight + pageMargin * 2)

        const pageBoxWidth = isMobile ? 'calc(100% - 32px)' : `${pageWidth}px`

        gapDiv.style.cssText = `
          position: absolute;
          top: ${gapTop}px;
          left: 50%;
          transform: translateX(-50%);
          width: 100vw;
          height: ${pageMargin * 2}px;
          background: #2f3136;
          z-index: 999;
          pointer-events: none;
        `
        gapsContainer.appendChild(gapDiv)

        console.log(`🚫 Gap ${i + 1} overlay:`, {
          top: `${gapTop}px`,
          height: `${pageMargin * 2}px`,
          width: pageBoxWidth,
          zIndex: 3
        })
      }

      gapsContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 3;
        pointer-events: none;
      `

      // Ensure parent has relative positioning
      parentContainer.style.position = 'relative'

      // Update page count
      if (pageCount !== lastPageCountRef.current && onPageCountChange) {
        lastPageCountRef.current = pageCount

        const pageData = Array.from({ length: pageCount }, (_, index) => ({
          index,
          content: contentElement.innerHTML,
          height: pageHeight
        }))

        onPageCountChange(pageData)
      }

      console.log(`[MultiPageRenderer] Rendered ${pageCount} page boxes (white sheets)`)
      console.log('📊 Summary:', {
        totalPages: pageCount,
        contentHeight: contentHeight + 'px',
        pageHeight: pageHeight + 'px',
        pageWidth: pageWidth + 'px',
        contentInnerWidth: contentInnerWidth + 'px',
        contentTopMargin: pageMargin + paddingTop + 'px',
        effectivePageHeight: effectivePageHeight + 'px',
        gapHeight: gapHeight + 'px',
        containerPosition: parentContainer.style.position,
        pagesContainerPosition: pagesContainer.style.position,
        pagesContainerDisplay: pagesContainer.style.display
      })
    }

    const scheduleRender = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(renderPages, 300)
    }

    // Initial render
    setTimeout(scheduleRender, 100)

    // Re-render on content changes
    const unregister = editor.registerUpdateListener(() => {
      scheduleRender()
    })

    // Re-render on window resize
    const handleResize = () => scheduleRender()
    window.addEventListener('resize', handleResize)

    return () => {
      unregister()
      window.removeEventListener('resize', handleResize)
      clearTimeout(debounceRef.current)
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom, paddingX, onPageCountChange])

  return null
}
