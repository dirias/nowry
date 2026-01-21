import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/joy'

/**
 * VisualPaginationOverlay - CSS-based visual pagination
 *
 * ARCHITECTURE:
 * - Content in Lexical is FLAT (no PageNodes)
 * - This component creates VISUAL page containers
 * - Pages are pure CSS - no impact on Lexical state
 * - Content flows naturally, clipped to page boundaries
 *
 * HOW IT WORKS:
 * 1. Lexical renders content flat in one ContentEditable
 * 2. We calculate page breaks (same as before)
 * 3. We create visual page divs that "window" the content
 * 4. CSS clips content to page bounds
 * 5. All editing works naturally (no patches needed)
 *
 * This is how Google Docs works.
 */

export default function VisualPaginationOverlay({
  contentRef,
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [pageBreaks, setPageBreaks] = useState([])
  const observerRef = useRef(null)
  const debounceRef = useRef(null)

  // Calculate page breaks from flat content
  const calculateBreaks = () => {
    if (!contentRef.current) return []

    const availableHeight = pageHeight - paddingTop - paddingBottom
    const breaks = []
    let currentPageStart = 0
    let currentHeight = 0
    let pageNumber = 0

    const elements = Array.from(contentRef.current.children)

    elements.forEach((element, index) => {
      const elementHeight = element.getBoundingClientRect().height

      if (currentHeight + elementHeight > availableHeight && currentHeight > 0) {
        // Page break needed
        breaks.push({
          pageNumber,
          startIndex: currentPageStart,
          endIndex: index,
          offsetY: currentHeight
        })
        pageNumber++
        currentPageStart = index
        currentHeight = elementHeight
      } else {
        currentHeight += elementHeight
      }
    })

    // Last page
    if (currentPageStart < elements.length) {
      breaks.push({
        pageNumber,
        startIndex: currentPageStart,
        endIndex: elements.length,
        offsetY: currentHeight
      })
    }

    return breaks
  }

  // Recalculate on content change
  useEffect(() => {
    if (!contentRef.current) return

    const recalculate = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const breaks = calculateBreaks()
        setPageBreaks(breaks)

        if (onPageCountChange) {
          onPageCountChange(breaks.length)
        }

        console.log(`[VisualPagination] Calculated ${breaks.length} pages`)
      }, 300)
    }

    // Initial calculation
    recalculate()

    // Observe content changes
    observerRef.current = new MutationObserver(recalculate)
    observerRef.current.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      clearTimeout(debounceRef.current)
    }
  }, [contentRef, pageHeight, paddingTop, paddingBottom, onPageCountChange])

  return (
    <>
      {pageBreaks.map((pageBreak, index) => (
        <Box
          key={`page-${index}`}
          className='visual-page'
          sx={{
            position: 'absolute',
            top: `${index * (pageHeight + 40)}px`, // 40px gap between pages
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            backgroundColor: 'white',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            pointerEvents: 'none', // Don't interfere with editing
            zIndex: -1, // Behind content

            // Visual page boundary marker
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              pointerEvents: 'none'
            }
          }}
        />
      ))}
    </>
  )
}
