import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DecoratorNode,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import ImageToolbar from '../components/Editor/ImageToolbar'
import ResizeHandles from '../components/Editor/ResizeHandles'

const FALLBACK_IMAGE = 'https://placehold.co/600x400?text=Image+Not+Found'

function ImageComponent({ src, altText, width, height, alignment, maxWidth, nodeKey }) {
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)
  const [imgSrc, setImgSrc] = useState(src)
  const [currentWidth, setCurrentWidth] = useState(width)
  const [currentHeight, setCurrentHeight] = useState(height)
  const imageRef = useRef(null)

  const handleError = () => {
    setImgSrc(FALLBACK_IMAGE)
  }

  const onDelete = useCallback(
    (payload) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event = payload
        event.preventDefault()
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.remove()
          return true
        }
      }
      return false
    },
    [isSelected, nodeKey]
  )

  useEffect(() => {
    let isMounted = true
    const unregister = mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          // Check if editor is readonly
          if (!editor.isEditable()) return false

          if (event.target === imageRef.current) {
            if (event.shiftKey) {
              setSelected(!isSelected)
            } else {
              clearSelection()
              setSelected(true)
            }
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW)
    )

    return () => {
      isMounted = false
      unregister()
    }
  }, [clearSelection, editor, isSelected, onDelete, setSelected])

  // ... handlers ...
  const handleAlignmentChange = (newAlignment) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.setAlignment(newAlignment)
      }
    })
  }

  const handleDelete = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.remove()
      }
    })
  }

  const handleResize = (newWidth, newHeight, isFinished) => {
    setCurrentWidth(newWidth)
    setCurrentHeight(newHeight)

    if (isFinished) {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setWidthAndHeight(newWidth, newHeight)
        }
      })
    }
  }

  // Only show controls if editable
  const isEditable = editor.isEditable()

  return (
    <div className={`image-wrapper alignment-${alignment}`} style={{ width: alignment === 'center' ? 'fit-content' : 'auto' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imageRef}
          src={imgSrc}
          alt={altText}
          onError={handleError}
          className={`editor-image alignment-${alignment} ${isSelected && isEditable ? 'selected' : ''}`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            cursor: isEditable ? 'pointer' : 'default',
            outline: isSelected && isEditable ? '2px solid var(--joy-palette-primary-500)' : 'none',
            outlineOffset: '2px',
            borderRadius: '4px'
          }}
          width={currentWidth}
          height={currentHeight}
        />
        {isSelected && isEditable && (
          <>
            <ImageToolbar alignment={alignment} onAlignmentChange={handleAlignmentChange} onDelete={handleDelete} />
            <ResizeHandles width={currentWidth} height={currentHeight} onResize={handleResize} />
          </>
        )}
      </div>
    </div>
  )
}

export class ImageNode extends DecoratorNode {
  constructor(src, altText, width, height, alignment, maxWidth, key) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__width = width
    this.__height = height
    this.__alignment = alignment || 'center'
    this.__maxWidth = maxWidth || 600
  }

  static getType() {
    return 'image'
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.__alignment, node.__maxWidth, node.__key)
  }

  createDOM(config) {
    const span = document.createElement('span')
    const theme = config.theme
    const className = theme.image
    if (className !== undefined) {
      span.className = className
    }
    if (this.__alignment === 'inline') {
      span.style.display = 'inline-block'
    } else {
      span.style.display = 'block'
    }
    return span
  }

  updateDOM(prevNode, dom, config) {
    const alignment = this.__alignment
    if (alignment === 'inline') {
      dom.style.display = 'inline-block'
    } else {
      dom.style.display = 'block'
    }
    return false
  }

  exportDOM() {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText)
    element.setAttribute('width', this.__width.toString())
    element.setAttribute('height', this.__height.toString())
    element.setAttribute('data-alignment', this.__alignment)
    return { element }
  }

  static importDOM() {
    return {
      img: (node) => ({
        conversion: (domNode) => {
          if (domNode instanceof HTMLImageElement) {
            const src = domNode.getAttribute('src')
            const altText = domNode.getAttribute('alt')
            const width = parseInt(domNode.getAttribute('width'), 10)
            const height = parseInt(domNode.getAttribute('height'), 10)
            const alignment = domNode.getAttribute('data-alignment') || 'center'

            // Create the node with the parsed values
            // We use the simpler constructor via $createImageNode
            const node = $createImageNode({ src, altText, width, height, alignment })
            return { node }
          }
          return null
        },
        priority: 0
      })
    }
  }

  static importJSON(serializedNode) {
    return new ImageNode(
      serializedNode.src,
      serializedNode.altText,
      serializedNode.width,
      serializedNode.height,
      serializedNode.alignment,
      serializedNode.maxWidth
    )
  }

  exportJSON() {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      alignment: this.__alignment,
      maxWidth: this.__maxWidth
    }
  }

  decorate() {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        alignment={this.__alignment}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
      />
    )
  }

  setAlignment(alignment) {
    const writable = this.getWritable()
    writable.__alignment = alignment
  }

  getAlignment() {
    return this.__alignment
  }

  setWidthAndHeight(width, height) {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  isInline() {
    return this.__alignment === 'inline'
  }
}

export function $createImageNode({ src, altText, width, height, alignment, maxWidth }) {
  // Dimensions are now calculated by the backend smart sizing logic
  // We simply use what is provided.
  return new ImageNode(src, altText, width, height, alignment, maxWidth)
}

export function $isImageNode(node) {
  return node instanceof ImageNode
}
