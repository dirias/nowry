// src/components/Editor/SlashCommandPlugin.js

import React, { useEffect, useRef, useState } from 'react'
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { createPortal } from 'react-dom'
import { List, ListItem, Typography, Sheet } from '@mui/joy'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '../../plugin/RegisterHorizontalRulePlugin'

// 📋 Available commands
const COMMANDS = [
  { label: 'Heading 1', command: 'heading1' },
  { label: 'Heading 2', command: 'heading2' },
  { label: 'Ordered list', command: 'ordered-list' },
  { label: 'Unordered list', command: 'unordered-list' },
  { label: 'Quote', command: 'quote' },
  { label: 'Code', command: 'code' },
  { label: 'Separator (line)', command: 'hr' }
]

export default function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext()
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef(null)

  // 🧠 Detect "/" and show menu
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const text = selection.getTextContent()
          if (text.endsWith('/')) {
            const domSelection = window.getSelection()
            if (!domSelection || domSelection.rangeCount === 0) return
            const domRange = domSelection.getRangeAt(0)
            const rect = domRange.getBoundingClientRect()
            setMenuPosition({
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX
            })
            setMenuVisible(true)
          } else {
            setMenuVisible(false)
          }
        }
      })
    })
  }, [editor])

  // ⚙️ Execute selected command
  const executeCommand = (command) => {
    editor.update(() => {
      switch (command) {
        case 'heading1':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'h1')
          break
        case 'heading2':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'h2')
          break
        case 'ordered-list':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'ol')
          break
        case 'unordered-list':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'ul')
          break
        case 'quote':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'quote')
          break
        case 'code':
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'code')
          break
        case 'hr':
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
          break
        default:
          break
      }

      // 🧹 Clean up the "/"
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const node = selection.anchor.getNode()
        const text = node.getTextContent()
        if (text.endsWith('/')) node.setTextContent('')
      }

      setMenuVisible(false)
    })
  }

  // 🎹 Keyboard navigation
  const handleKeyDown = (event) => {
    if (!menuVisible) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % COMMANDS.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + COMMANDS.length) % COMMANDS.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      executeCommand(COMMANDS[selectedIndex].command)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setMenuVisible(false)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuVisible, selectedIndex])

  if (!menuVisible) return null

  return createPortal(
    <Sheet
      ref={menuRef}
      sx={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 9999,
        boxShadow: 'md',
        p: 1,
        minWidth: 200,
        bgcolor: 'background.surface',
        borderRadius: 'sm'
      }}
    >
      <List>
        {COMMANDS.map((cmd, index) => (
          <ListItem
            key={cmd.label}
            selected={index === selectedIndex}
            onClick={() => executeCommand(cmd.command)}
            sx={{
              cursor: 'pointer',
              bgcolor: index === selectedIndex ? 'neutral.softBg' : 'transparent'
            }}
          >
            <Typography level='body-sm'>{cmd.label}</Typography>
          </ListItem>
        ))}
      </List>
    </Sheet>,
    document.body
  )
}
