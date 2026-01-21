import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND
} from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { createPortal } from 'react-dom'
import { List, ListItem, Typography, Sheet, Box } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { Type, Heading1, Heading2, Heading3, List as ListIcon, ListOrdered, Quote as QuoteIcon, Minus, Code2 } from 'lucide-react'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '../../plugin/RegisterHorizontalRulePlugin'

/**
 * SlashCommandPlugin - Production-grade slash command menu
 *
 * FEATURES:
 * - Type "/" to trigger command menu
 * - Filter commands by typing after "/"
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Mouse click selection
 * - Auto-cleanup of slash character
 * - Theme-aware styling
 * - Fully internationalized
 * - Following DESIGN_GUIDELINES.md
 */

export default function SlashCommandPlugin() {
  const { t } = useTranslation()
  const [editor] = useLexicalComposerContext()
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [queryString, setQueryString] = useState('')
  const menuRef = useRef(null)

  // Use refs to hold current state for stable handlers
  const menuVisibleRef = useRef(menuVisible)
  const selectedIndexRef = useRef(selectedIndex)
  const filteredCommandsRef = useRef([])

  // Keep refs in sync with state
  useEffect(() => {
    menuVisibleRef.current = menuVisible
  }, [menuVisible])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // 📋 Available commands with icons and aliases
  const COMMANDS = [
    {
      key: 'paragraph',
      label: t('editor.slashCommands.paragraph', 'Text'),
      description: t('editor.slashCommands.paragraphDesc', 'Plain text paragraph'),
      icon: Type,
      aliases: ['p', 'text', 'normal', 'paragraph'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode())
          }
        })
      }
    },
    {
      key: 'h1',
      label: t('editor.slashCommands.heading1', 'Heading 1'),
      description: t('editor.slashCommands.heading1Desc', 'Large section heading'),
      icon: Heading1,
      aliases: ['h1', 'heading1', 'title', 'title1'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'))
          }
        })
      }
    },
    {
      key: 'h2',
      label: t('editor.slashCommands.heading2', 'Heading 2'),
      description: t('editor.slashCommands.heading2Desc', 'Medium section heading'),
      icon: Heading2,
      aliases: ['h2', 'heading2', 'title2', 'subtitle'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'))
          }
        })
      }
    },
    {
      key: 'h3',
      label: t('editor.slashCommands.heading3', 'Heading 3'),
      description: t('editor.slashCommands.heading3Desc', 'Small section heading'),
      icon: Heading3,
      aliases: ['h3', 'heading3', 'title3', 'subheading'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'))
          }
        })
      }
    },
    {
      key: 'bullet',
      label: t('editor.slashCommands.bulletList', 'Bullet list'),
      description: t('editor.slashCommands.bulletListDesc', 'Unordered list'),
      icon: ListIcon,
      aliases: ['ul', 'bullet', 'list', 'unordered'],
      execute: (editor) => {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
      }
    },
    {
      key: 'number',
      label: t('editor.slashCommands.numberedList', 'Numbered list'),
      description: t('editor.slashCommands.numberedListDesc', 'Ordered list'),
      icon: ListOrdered,
      aliases: ['ol', 'number', 'numbered', 'ordered', '1'],
      execute: (editor) => {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
      }
    },
    {
      key: 'quote',
      label: t('editor.slashCommands.quote', 'Quote'),
      description: t('editor.slashCommands.quoteDesc', 'Blockquote'),
      icon: QuoteIcon,
      aliases: ['quote', 'blockquote', 'citation'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode())
          }
        })
      }
    },
    {
      key: 'code',
      label: t('editor.slashCommands.codeBlock', 'Code block'),
      description: t('editor.slashCommands.codeBlockDesc', 'Code with syntax highlighting'),
      icon: Code2,
      aliases: ['code', 'codeblock', '```'],
      execute: (editor) => {
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createCodeNode())
          }
        })
      }
    },
    {
      key: 'hr',
      label: t('editor.slashCommands.divider', 'Divider'),
      description: t('editor.slashCommands.dividerDesc', 'Horizontal line'),
      icon: Minus,
      aliases: ['hr', 'divider', 'separator', 'line', '---'],
      execute: (editor) => {
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
      }
    }
  ]

  // Filter commands based on query string
  const filteredCommands =
    queryString.trim() === ''
      ? COMMANDS
      : COMMANDS.filter((cmd) => cmd.aliases.some((alias) => alias.toLowerCase().startsWith(queryString.toLowerCase())))

  // Keep ref in sync
  useEffect(() => {
    filteredCommandsRef.current = filteredCommands
  }, [filteredCommands])

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [queryString])

  // 🧠 Detect "/" and show menu
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          const textContent = anchorNode.getTextContent()
          const anchorOffset = selection.anchor.offset

          // Find the last "/" before cursor
          const textBeforeCursor = textContent.slice(0, anchorOffset)
          const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

          if (lastSlashIndex !== -1) {
            // Check if "/" is at start or preceded by whitespace
            const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1]
            const isValidTrigger = lastSlashIndex === 0 || /\s/.test(charBeforeSlash)

            if (isValidTrigger) {
              const query = textBeforeCursor.slice(lastSlashIndex + 1)
              setQueryString(query)

              // Position menu
              const domSelection = window.getSelection()
              if (domSelection && domSelection.rangeCount > 0) {
                const domRange = domSelection.getRangeAt(0)
                const rect = domRange.getBoundingClientRect()
                setMenuPosition({
                  top: rect.bottom + window.scrollY + 4,
                  left: rect.left + window.scrollX
                })
                setMenuVisible(true)
                return
              }
            }
          }
        }

        // Hide menu if conditions not met
        setMenuVisible(false)
        setQueryString('')
      })
    })
  }, [editor])

  // ⚙️ Execute selected command
  const executeCommand = useCallback(
    (command) => {
      // Execute command inside a single update transaction
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        // Get the text node that contains the selection
        const anchorNode = selection.anchor.getNode()
        const textContent = anchorNode.getTextContent()
        const anchorOffset = selection.anchor.offset

        // Find the slash character
        const textBeforeCursor = textContent.slice(0, anchorOffset)
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

        if (lastSlashIndex !== -1) {
          // Calculate how many characters to delete (slash + query)
          const charsToDelete = anchorOffset - lastSlashIndex

          // Move selection to start at the slash
          selection.anchor.set(anchorNode.getKey(), lastSlashIndex, 'text')
          selection.focus.set(anchorNode.getKey(), anchorOffset, 'text')

          // Delete the selected text (slash + query) using Lexical API
          selection.removeText()
        }
      })

      // Execute the formatting command in a separate update
      command.execute(editor)

      setMenuVisible(false)
      setQueryString('')
    },
    [editor]
  )

  // 🎹 Keyboard navigation - Intercept at DOM level BEFORE Lexical
  useEffect(() => {
    const editorElement = editor.getRootElement()
    if (!editorElement) return

    const handleKeyDown = (event) => {
      const isMenuVisible = menuVisibleRef.current
      const commands = filteredCommandsRef.current

      if (!isMenuVisible || commands.length === 0) {
        return // Let event propagate normally
      }

      // Menu is visible - intercept arrow keys, enter, and escape
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % commands.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = selectedIndexRef.current
        executeCommand(commands[currentIndex])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setMenuVisible(false)
        setQueryString('')
      }
    }

    // Attach to editor's root element with capture phase
    editorElement.addEventListener('keydown', handleKeyDown, true)

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, executeCommand])

  // 🎹 Lexical command handlers - Keep as backup/fallback
  useEffect(() => {
    const removeArrowDownCommand = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        const isMenuVisible = menuVisibleRef.current
        const commands = filteredCommandsRef.current

        if (!isMenuVisible || commands.length === 0) {
          return false
        }

        return true // Already handled by DOM listener
      },
      COMMAND_PRIORITY_HIGH
    )

    const removeArrowUpCommand = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        const isMenuVisible = menuVisibleRef.current
        const commands = filteredCommandsRef.current

        if (!isMenuVisible || commands.length === 0) {
          return false
        }

        return true // Already handled by DOM listener
      },
      COMMAND_PRIORITY_HIGH
    )

    const removeEnterCommand = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        const isMenuVisible = menuVisibleRef.current
        const commands = filteredCommandsRef.current

        if (!isMenuVisible || commands.length === 0) {
          return false
        }

        return true // Already handled by DOM listener
      },
      COMMAND_PRIORITY_HIGH
    )

    const removeEscapeCommand = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        const isMenuVisible = menuVisibleRef.current

        if (!isMenuVisible) {
          return false
        }

        return true // Already handled by DOM listener
      },
      COMMAND_PRIORITY_HIGH
    )

    return () => {
      removeArrowDownCommand()
      removeArrowUpCommand()
      removeEnterCommand()
      removeEscapeCommand()
    }
  }, [editor, executeCommand])

  // Don't render if menu not visible
  if (!menuVisible || filteredCommands.length === 0) return null

  return createPortal(
    <Sheet
      ref={menuRef}
      role='listbox'
      aria-label={t('editor.slashCommands.menuLabel', 'Formatting commands')}
      sx={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 9999,
        boxShadow: 'lg',
        borderRadius: 'md',
        minWidth: 280,
        maxWidth: 320,
        bgcolor: 'background.surface',
        border: '1px solid',
        borderColor: 'neutral.outlinedBorder',
        overflow: 'hidden'
      }}
    >
      <List sx={{ py: 0.5, px: 0 }}>
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon
          const isSelected = index === selectedIndex

          return (
            <ListItem
              key={cmd.key}
              role='option'
              aria-selected={isSelected}
              onClick={() => executeCommand(cmd)}
              sx={{
                cursor: 'pointer',
                px: 2,
                py: 1.5,
                bgcolor: isSelected ? 'neutral.softBg' : 'transparent',
                '&:hover': {
                  bgcolor: 'neutral.softHoverBg'
                },
                transition: 'background-color 0.1s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  mt: 0.25,
                  color: isSelected ? 'primary.500' : 'text.tertiary'
                }}
              >
                <Icon size={18} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  level='body-sm'
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'text.primary' : 'text.primary'
                  }}
                >
                  {cmd.label}
                </Typography>
                <Typography
                  level='body-xs'
                  sx={{
                    color: 'text.tertiary',
                    mt: 0.25
                  }}
                >
                  {cmd.description}
                </Typography>
              </Box>
            </ListItem>
          )
        })}
      </List>

      {/* Helper text at bottom */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: 'background.level1',
          borderTop: '1px solid',
          borderColor: 'neutral.outlinedBorder'
        }}
      >
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('editor.slashCommands.hint', '↑↓ to navigate, ↵ to select, esc to dismiss')}
        </Typography>
      </Box>
    </Sheet>,
    document.body
  )
}
