import React from 'react'
import { DecoratorNode } from 'lexical'

export class ImageNode extends DecoratorNode {
  constructor(src, altText, key) {
    super(key)
    this.__src = src
    this.__altText = altText
  }

  static getType() {
    return 'image'
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__altText, node.__key)
  }

  createDOM() {
    const img = document.createElement('img')
    img.src = this.__src
    img.alt = this.__altText
    img.style.maxWidth = '100%'
    return img
  }

  static importJSON(serializedNode) {
    return new ImageNode(serializedNode.src, serializedNode.altText)
  }

  exportJSON() {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText
    }
  }

  decorate() {
    return <img src={this.__src} alt={this.__altText} style={{ maxWidth: '100%' }} />
  }
}

export function $createImageNode({ src, altText }) {
  return new ImageNode(src, altText)
}
