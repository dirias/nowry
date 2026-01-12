import { ElementNode } from 'lexical'

export class PageNode extends ElementNode {
  static getType() {
    return 'page'
  }

  static clone(node) {
    return new PageNode(node.__key)
  }

  createDOM(config) {
    const div = document.createElement('div')
    div.className = 'editor-page'
    // Styling is handled in CSS, but fundamental dimensions can be enforced here too if needed
    div.style.position = 'relative'
    div.style.backgroundColor = 'white'
    div.style.minHeight = 'var(--page-height, 1123px)'
    div.style.height = 'var(--page-height, 1123px)'
    div.style.maxHeight = 'var(--page-height, 1123px)'
    div.style.width = 'var(--page-width, 794px)'
    div.style.margin = '20px auto'
    // Split padding to support Mobile (Narrow X, Standard Y) vs Print (Standard X, Standard Y)
    div.style.padding = 'var(--page-py, 96px) var(--page-px, 96px)'
    div.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
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
      version: 1
    }
  }

  isInline() {
    return false
  }
}

export function $createPageNode() {
  return new PageNode()
}

export function $isPageNode(node) {
  return node instanceof PageNode
}
