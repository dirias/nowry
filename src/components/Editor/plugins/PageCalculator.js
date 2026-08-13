/**
 * PageCalculator - Pure function for calculating page breaks
 *
 * ARCHITECTURE:
 * - Content-First: Content is stored flat, no PageNodes
 * - Pages are calculated dynamically from content
 * - Single-pass algorithm: O(n) complexity
 * - No iterations, no DOM mutations during calculation
 *
 * APPROACH:
 * 1. Measure all elements once
 * 2. Calculate optimal breaks (pure math)
 * 3. Return break points (no DOM mutation)
 *
 * This is how Google Docs and Notion work.
 */

import { $createParagraphNode } from 'lexical'

/**
 * Measure element height without modifying DOM
 */
export function measureElementHeight(element, context = {}) {
  if (!element) return 0

  // Use cached measurements if available
  const cacheKey = element.dataset?.measureId
  if (cacheKey && context.cache?.[cacheKey]) {
    return context.cache[cacheKey]
  }

  // Get actual rendered height
  const rect = element.getBoundingClientRect()
  const height = rect.height

  // Cache for reuse
  if (cacheKey && context.cache) {
    context.cache[cacheKey] = height
  }

  return height
}

/**
 * Check if element should avoid page breaks
 */
export function shouldAvoidBreak(element) {
  if (!element) return false

  const tag = element.tagName?.toLowerCase()

  // Elements that should never split
  const noBreakTags = ['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'pre', 'code']
  if (noBreakTags.includes(tag)) return true

  // Check CSS properties
  const style = window.getComputedStyle(element)
  if (style.breakInside === 'avoid') return true
  if (style.pageBreakInside === 'avoid') return true

  // List items
  if (tag === 'li') return true

  // Images and figures
  if (element.classList?.contains('editor-image')) return true
  if (element.classList?.contains('image-wrapper')) return true

  return false
}

/**
 * Calculate optimal page breaks for content
 *
 * @param {HTMLElement} contentContainer - Container with all content
 * @param {number} pageHeight - Available height per page (excludes padding)
 * @param {number} paddingTop - Top padding
 * @param {number} paddingBottom - Bottom padding
 * @returns {Array} Array of page break points with element indices
 */
export function calculatePageBreaks(contentContainer, pageHeight, paddingTop = 0, paddingBottom = 0) {
  if (!contentContainer) return []

  const elements = Array.from(contentContainer.children)
  const availableHeight = pageHeight - paddingTop - paddingBottom

  const breaks = []
  let currentPageStart = 0
  let currentHeight = 0
  let pageNumber = 0

  console.log('[PageCalculator] Starting calculation:', {
    totalElements: elements.length,
    pageHeight,
    availableHeight,
    paddingTop,
    paddingBottom
  })

  elements.forEach((element, index) => {
    const elementHeight = measureElementHeight(element)
    const avoidBreak = shouldAvoidBreak(element)

    // Will this element fit on current page?
    const fitsOnPage = currentHeight + elementHeight <= availableHeight

    if (fitsOnPage) {
      // Element fits, add to current page
      currentHeight += elementHeight
    } else {
      // Element doesn't fit
      if (avoidBreak) {
        // Must keep element intact, start new page
        if (currentPageStart < index) {
          breaks.push({
            pageNumber,
            startIndex: currentPageStart,
            endIndex: index,
            height: currentHeight
          })
          pageNumber++
        }
        currentPageStart = index
        currentHeight = elementHeight
      } else {
        // Element can break, but for simplicity, start new page
        // (Future: implement text-level breaking)
        if (currentPageStart < index) {
          breaks.push({
            pageNumber,
            startIndex: currentPageStart,
            endIndex: index,
            height: currentHeight
          })
          pageNumber++
        }
        currentPageStart = index
        currentHeight = elementHeight
      }
    }
  })

  // Add final page
  if (currentPageStart < elements.length) {
    breaks.push({
      pageNumber,
      startIndex: currentPageStart,
      endIndex: elements.length,
      height: currentHeight
    })
  }

  console.log('[PageCalculator] Calculation complete:', {
    totalPages: breaks.length,
    breaks: breaks.map((b) => `Page ${b.pageNumber + 1}: elements ${b.startIndex}-${b.endIndex} (${Math.round(b.height)}px)`)
  })

  return breaks
}

/**
 * Apply calculated breaks to Lexical editor
 * This is the ONLY place we modify the editor structure
 *
 * @param {LexicalEditor} editor - Lexical editor instance
 * @param {Array} pageBreaks - Calculated page breaks
 * @param {Array} contentNodes - Original Lexical nodes (in order)
 * @param {Function} $createPageNode - Page node factory
 * @param {Function} $isPageNode - Page node check
 * @param {Function} $getRoot - Get root node
 */
export function applyPageBreaksToEditor(editor, pageBreaks, contentNodes, $createPageNode, $isPageNode, $getRoot) {
  return new Promise((resolve) => {
    editor.update(
      () => {
        const root = $getRoot()

        // Remove all existing pages (if any from previous pagination)
        root
          .getChildren()
          .filter($isPageNode)
          .forEach((page) => page.remove())

        // Create pages based on calculated breaks
        pageBreaks.forEach((breakPoint) => {
          const page = $createPageNode()

          // Move content nodes to this page (using the SAME nodes we measured)
          for (let i = breakPoint.startIndex; i < breakPoint.endIndex; i++) {
            if (contentNodes[i]) {
              page.append(contentNodes[i])
            }
          }

          // Ensure page has at least one paragraph if empty
          if (page.getChildrenSize() === 0) {
            page.append($createParagraphNode())
          }

          root.append(page)
        })

        console.log(`✓ Applied ${pageBreaks.length} pages to editor`)
        resolve(true)
      },
      { tag: 'pagination-update' }
    )
  })
}
