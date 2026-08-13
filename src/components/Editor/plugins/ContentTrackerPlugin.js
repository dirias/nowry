import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

/**
 * ContentTrackerPlugin - Simple content tracking for page overview
 *
 * PRODUCTION-GRADE APPROACH:
 * - Does NOT manipulate DOM
 * - Does NOT create page containers
 * - Just tracks content for thumbnail previews
 * - CSS handles all visual styling
 *
 * This is the REAL production solution - simplicity wins.
 */

export default function ContentTrackerPlugin({
  pageHeight = 1123,
  pageWidth = 794,
  paddingTop = 96,
  paddingBottom = 96,
  paddingX = 96,
  onPageCountChange
}) {
  const [editor] = useLexicalComposerContext()
  const debounceRef = useRef(null)
  const lastContentRef = useRef('')

  console.log('📏 ContentTrackerPlugin - Page Size (Source of Truth):', {
    pageHeight: `${pageHeight}px`,
    pageWidth: `${pageWidth}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingX: `${paddingX}px`,
    availableContentHeight: `${pageHeight - paddingTop - paddingBottom}px`,
    note: 'Visual styling handled by CSS'
  })

  useEffect(() => {
    const trackContent = () => {
      const editorRoot = editor.getRootElement()
      if (!editorRoot) return

      const contentElement = editorRoot.querySelector('.editor-content-flat')
      if (!contentElement) return

      // Get content for preview
      const contentHTML = contentElement.innerHTML

      // Calculate estimated page count based on content height
      const contentHeight = contentElement.scrollHeight
      const availableHeight = pageHeight - paddingTop - paddingBottom
      const estimatedPages = Math.max(1, Math.ceil(contentHeight / availableHeight))

      // Only update if content changed
      const contentSignature = `${estimatedPages}:${contentHTML.length}`
      if (contentSignature === lastContentRef.current) return

      lastContentRef.current = contentSignature

      // Generate page data for overview
      if (onPageCountChange) {
        const pageData = Array.from({ length: estimatedPages }, (_, index) => ({
          index,
          content: contentHTML, // Same content for all (overview will slice it)
          height: pageHeight
        }))

        onPageCountChange(pageData)
        console.log(`[ContentTracker] Estimated ${estimatedPages} pages (based on content height)`)
      }
    }

    const scheduleTracking = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(trackContent, 300)
    }

    // Initial tracking
    setTimeout(scheduleTracking, 100)

    // Track on content changes
    const unregister = editor.registerUpdateListener(() => {
      scheduleTracking()
    })

    return () => {
      unregister()
      clearTimeout(debounceRef.current)
    }
  }, [editor, pageHeight, pageWidth, paddingTop, paddingBottom, paddingX, onPageCountChange])

  return null
}
