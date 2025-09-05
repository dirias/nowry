import { ElementNode } from 'lexical'

export class HorizontalRuleNode extends ElementNode {
  static getType() {
    return 'horizontalrule'
  }

  static clone(node) {
    return new HorizontalRuleNode(node.__key)
  }

  createDOM() {
    const dom = document.createElement('hr')
    return dom
  }

  updateDOM() {
    return false
  }

  static importJSON() {
    return new HorizontalRuleNode()
  }

  exportJSON() {
    return {
      type: 'horizontalrule',
      version: 1
    }
  }

  isInline() {
    return false
  }
}

export function $createHorizontalRuleNode() {
  return new HorizontalRuleNode()
}
