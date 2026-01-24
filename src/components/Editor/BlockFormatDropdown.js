import React, { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createParagraphNode, $isElementNode } from 'lexical'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, ListNode } from '@lexical/list'
import { $isTableCellNode } from '@lexical/table'
import { $setBlocksType } from '@lexical/selection'
import { Select, Option } from '@mui/joy'
import { Type, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react'

const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote'
}

const BlockFormatDropdown = () => {
  const [editor] = useLexicalComposerContext()
  const [blockType, setBlockType] = useState('paragraph')

  const updateBlockType = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()

      // Check if we're in a table cell - if so, skip formatting dropdown
      let parent = $isElementNode(anchorNode) ? anchorNode : anchorNode.getParent()
      if (parent && $isTableCellNode(parent)) {
        setBlockType('paragraph')
        return
      }

      // Try to get top-level element, but handle table cells gracefully
      let element
      try {
        element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      } catch (e) {
        // If we can't get top-level element (e.g., inside table), default to paragraph
        setBlockType('paragraph')
        return
      }

      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode)
          const type = parentList ? parentList.getListType() : element.getListType()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType()

          if (type in blockTypeToBlockName) {
            setBlockType(type)
          }

          if ($isQuoteNode(element)) {
            setBlockType('quote')
          }
        }
      }
    }
  }, [editor])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateBlockType()
      })
    })
  }, [editor, updateBlockType])

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatHeading = (headingSize) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      })
    }
  }

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode())
        }
      })
    }
  }

  const handleChange = (_, newValue) => {
    switch (newValue) {
      case 'paragraph':
        formatParagraph()
        break
      case 'h1':
        formatHeading('h1')
        break
      case 'h2':
        formatHeading('h2')
        break
      case 'h3':
        formatHeading('h3')
        break
      case 'bullet':
        formatBulletList()
        break
      case 'number':
        formatNumberedList()
        break
      case 'quote':
        formatQuote()
        break
      default:
        formatParagraph()
    }
  }

  return (
    <Select size='sm' value={blockType} onChange={handleChange} sx={{ minWidth: 140 }} startDecorator={getIconForBlockType(blockType)}>
      <Option value='paragraph'>
        <Type size={16} style={{ marginRight: 8 }} />
        Normal
      </Option>
      <Option value='h1'>
        <Heading1 size={16} style={{ marginRight: 8 }} />
        Heading 1
      </Option>
      <Option value='h2'>
        <Heading2 size={16} style={{ marginRight: 8 }} />
        Heading 2
      </Option>
      <Option value='h3'>
        <Heading3 size={16} style={{ marginRight: 8 }} />
        Heading 3
      </Option>
      <Option value='bullet'>
        <List size={16} style={{ marginRight: 8 }} />
        Bulleted List
      </Option>
      <Option value='number'>
        <ListOrdered size={16} style={{ marginRight: 8 }} />
        Numbered List
      </Option>
      <Option value='quote'>
        <Quote size={16} style={{ marginRight: 8 }} />
        Quote
      </Option>
    </Select>
  )
}

// Helper function to get nearest node of type
function $getNearestNodeOfType(node, klass) {
  let parent = node
  while (parent != null) {
    if (parent instanceof klass) {
      return parent
    }
    parent = parent.getParent()
  }
  return null
}

// Helper function to get icon for current block type
function getIconForBlockType(blockType) {
  switch (blockType) {
    case 'h1':
      return <Heading1 size={16} />
    case 'h2':
      return <Heading2 size={16} />
    case 'h3':
      return <Heading3 size={16} />
    case 'bullet':
      return <List size={16} />
    case 'number':
      return <ListOrdered size={16} />
    case 'quote':
      return <Quote size={16} />
    default:
      return <Type size={16} />
  }
}

export default BlockFormatDropdown
