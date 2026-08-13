import { $applyNodeReplacement, ElementNode } from 'lexical'

export class CalloutNode extends ElementNode {
  static getType() {
    return 'callout'
  }

  static clone(node) {
    return new CalloutNode(node.__calloutType, node.__key)
  }

  constructor(calloutType, key) {
    super(key)
    this.__calloutType = calloutType
  }

  createDOM(config) {
    const dom = document.createElement('div')
    const theme = config.theme
    const className = theme.callout
    dom.className = `${className} ${className}-${this.__calloutType}`
    dom.setAttribute('data-callout-type', this.__calloutType)
    return dom
  }

  updateDOM(prevNode, dom, config) {
    if (prevNode.__calloutType !== this.__calloutType) {
      const theme = config.theme
      const className = theme.callout
      dom.className = `${className} ${className}-${this.__calloutType}`
      dom.setAttribute('data-callout-type', this.__calloutType)
      return true
    }
    return false
  }

  static importJSON(serializedNode) {
    const node = $createCalloutNode(serializedNode.calloutType)
    return node
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      calloutType: this.__calloutType,
      type: 'callout',
      version: 1
    }
  }

  canBeEmpty() {
    return false
  }

  isInline() {
    return false
  }
}

export function $createCalloutNode(calloutType) {
  return $applyNodeReplacement(new CalloutNode(calloutType))
}

export function $isCalloutNode(node) {
  return node instanceof CalloutNode
}
