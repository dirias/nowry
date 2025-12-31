/**
 * Custom Lexical nodes for multi-column layouts
 * Supports 1, 2, 3, or more columns
 */

import { ElementNode, $applyNodeReplacement } from 'lexical'

/**
 * ColumnContainerNode - Container for multiple columns
 */
export class ColumnContainerNode extends ElementNode {
  constructor(columns = 2, key) {
    super(key)
    this.__columns = columns
  }

  static getType() {
    return 'column-container'
  }

  static clone(node) {
    return new ColumnContainerNode(node.__columns, node.__key)
  }

  createDOM(config) {
    const dom = document.createElement('div')
    dom.className = 'editor-column-container'
    dom.style.display = 'grid'
    dom.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`
    dom.style.gap = '1.5rem'
    dom.style.margin = '1rem 0'
    dom.setAttribute('data-columns', this.__columns)
    return dom
  }

  updateDOM(prevNode, dom) {
    const prevColumns = prevNode.__columns
    const currentColumns = this.__columns

    if (prevColumns !== currentColumns) {
      dom.style.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`
      dom.setAttribute('data-columns', currentColumns)
      return true
    }
    return false
  }

  static importDOM() {
    return {
      div: (domNode) => {
        if (domNode.hasAttribute('data-columns') || domNode.style.gridTemplateColumns) {
          return {
            conversion: convertColumnContainerElement,
            priority: 1
          }
        }
        return null
      }
    }
  }

  exportDOM() {
    const element = document.createElement('div')
    element.className = 'editor-column-container'
    element.setAttribute('data-columns', this.__columns.toString())
    // Essential for support in other environments
    element.style.display = 'grid'
    element.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`
    element.style.gap = '1.5rem'
    element.style.margin = '1rem 0'
    return { element }
  }

  static importJSON(serializedNode) {
    const node = $createColumnContainerNode(serializedNode.columns)
    return node
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      columns: this.__columns,
      type: 'column-container',
      version: 1
    }
  }

  getColumns() {
    return this.__columns
  }

  setColumns(columns) {
    const writable = this.getWritable()
    writable.__columns = columns
  }

  canBeEmpty() {
    return false
  }

  isShadowRoot() {
    return false
  }
}

/**
 * ColumnNode - Individual column within container
 */
export class ColumnNode extends ElementNode {
  static getType() {
    return 'column'
  }

  static clone(node) {
    return new ColumnNode(node.__key)
  }

  createDOM(config) {
    const dom = document.createElement('div')
    dom.className = 'editor-column'
    dom.style.minHeight = '100px'
    dom.style.borderRight = '1px solid #e5e7eb'
    dom.style.paddingRight = '0.75rem'
    return dom
  }

  updateDOM() {
    return false
  }

  static importDOM() {
    return {
      div: (domNode) => {
        if (
          domNode.classList.contains('column-left') ||
          domNode.classList.contains('column-right') ||
          domNode.classList.contains('editor-column')
        ) {
          return {
            conversion: convertColumnElement,
            priority: 1
          }
        }
        return null
      }
    }
  }

  exportDOM() {
    const element = document.createElement('div')
    element.className = 'editor-column'
    element.style.minHeight = '100px'
    element.style.borderRight = '1px solid #e5e7eb'
    element.style.paddingRight = '0.75rem'
    return { element }
  }

  static importJSON(serializedNode) {
    const node = $createColumnNode()
    return node
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'column',
      version: 1
    }
  }

  canBeEmpty() {
    return false
  }

  isShadowRoot() {
    return false
  }
}

/**
 * Conversion functions for importing HTML
 */
function convertColumnContainerElement(domNode) {
  let columns = parseInt(domNode.getAttribute('data-columns'))

  if (!columns && domNode.style.gridTemplateColumns) {
    const template = domNode.style.gridTemplateColumns
    // approximate count by splitting spaces (e.g. "1fr 1fr" -> 2)
    columns = template.split(/\s+/).filter((t) => t.trim()).length
  }

  const node = $createColumnContainerNode(columns || 2)
  return { node }
}

function convertColumnElement(domNode) {
  const node = $createColumnNode()
  return { node }
}

/**
 * Helper functions to create nodes
 */
export function $createColumnContainerNode(columns = 2) {
  return $applyNodeReplacement(new ColumnContainerNode(columns))
}

export function $createColumnNode() {
  return $applyNodeReplacement(new ColumnNode())
}

export function $isColumnContainerNode(node) {
  return node instanceof ColumnContainerNode
}

export function $isColumnNode(node) {
  return node instanceof ColumnNode
}
