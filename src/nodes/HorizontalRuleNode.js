import { DecoratorNode } from 'lexical'

export class HorizontalRuleNode extends DecoratorNode {
  static getType() {
    return 'horizontalrule'
  }

  static clone(node) {
    return new HorizontalRuleNode(node.__key)
  }

  createDOM() {
    const dom = document.createElement('hr')
    dom.style.border = 'none'
    dom.style.borderTop = '1px solid'
    dom.style.borderColor = 'var(--joy-palette-neutral-outlinedBorder)'
    dom.style.margin = '16px 0'
    return dom
  }

  updateDOM() {
    return false
  }

  static importJSON() {
    return $createHorizontalRuleNode()
  }

  exportJSON() {
    return {
      type: 'horizontalrule',
      version: 1
    }
  }

  // DecoratorNode requires this method
  decorate() {
    return null
  }

  isInline() {
    return false
  }

  isIsolated() {
    return true
  }

  isKeyboardSelectable() {
    return true
  }
}

export function $createHorizontalRuleNode() {
  return new HorizontalRuleNode()
}
