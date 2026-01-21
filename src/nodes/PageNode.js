import { ElementNode } from 'lexical'

export class PageNode extends ElementNode {
  constructor(pageHeight, pageWidth, key) {
    super(key)
    this.__pageHeight = pageHeight
    this.__pageWidth = pageWidth
  }

  static getType() {
    return 'page'
  }

  static clone(node) {
    return new PageNode(node.__pageHeight, node.__pageWidth, node.__key)
  }

  createDOM(config) {
    const div = document.createElement('div')
    div.className = 'editor-page'
    // Styling is handled in CSS using theme variables
    div.style.position = 'relative'
    // NOTE: overflow:hidden prevents us from detecting actual content height
    // So we set it in CSS where we can measure before it's applied
    // div.style.overflow = 'hidden'

    // Responsive width and spacing
    const isMobile = window.innerWidth < 900

    // Use provided dimensions or fall back to CSS variables
    const pageHeight = this.__pageHeight || 'var(--page-height, 1123px)'
    const pageWidth = this.__pageWidth || 'var(--page-width, 794px)'

    // Ensure we have pixel values
    const heightPx = typeof pageHeight === 'number' ? `${pageHeight}px` : pageHeight
    const widthPx = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth

    if (isMobile) {
      // Mobile: honor selected page type dimensions; only adjust spacing
      div.style.minHeight = heightPx
      div.style.height = heightPx
      div.style.maxHeight = heightPx

      // Mobile: Comfortable margins with breathing room
      div.style.width = 'calc(100% - 16px)'
      div.style.maxWidth = 'calc(100vw - 32px)'
      div.style.margin = '12px auto' // 8px grid system
      div.style.padding = '24px 20px' // Compact padding for mobile
      div.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
      div.style.borderRadius = '8px'
      div.style.border = '1px solid rgba(0, 0, 0, 0.06)'
    } else {
      // Desktop: Standard print-like view with fixed height
      div.style.minHeight = heightPx
      div.style.height = heightPx
      div.style.maxHeight = heightPx
      div.style.width = widthPx
      div.style.margin = '20px auto'
      // Use separate top/bottom padding for accurate measurements
      div.style.paddingTop = 'var(--page-padding-top, 96px)'
      div.style.paddingBottom = 'var(--page-padding-bottom, 96px)'
      div.style.paddingLeft = 'var(--page-px, 96px)'
      div.style.paddingRight = 'var(--page-px, 96px)'
      div.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
    }

    div.style.willChange = 'transform' // GPU acceleration hint for smooth scrolling
    // Important: Pages shouldn't be editable themselves as a block, but their content is.
    // However, Lexical manages contenteditable on the root.
    return div
  }

  updateDOM(prevNode, dom) {
    return false
  }

  static importJSON(serializedNode) {
    return $createPageNode()
  }

  exportJSON() {
    return {
      type: 'page',
      version: 1,
      children: [] // Required for ElementNode
    }
  }

  isInline() {
    return false
  }
}

export function $createPageNode(pageHeight, pageWidth) {
  return new PageNode(pageHeight, pageWidth)
}

export function $isPageNode(node) {
  return node instanceof PageNode
}
