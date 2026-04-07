import React from 'react'
import { Modal, Sheet, List, ListItem, Box, Typography, IconButton } from '@mui/joy'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { $getSelection, $isRangeSelection, $createParagraphNode } from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '../../../plugin/RegisterHorizontalRulePlugin'
import { INSERT_TABLE_COMMAND } from './TablePlugin'
import { $createCalloutNode } from '../../../nodes/CalloutNode'
import { $createColumnContainerNode, $createColumnNode } from '../../../nodes/ColumnNodes'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Quote as QuoteIcon,
  Minus,
  Code2,
  Table,
  AlertTriangle,
  Info,
  Lightbulb,
  Columns
} from 'lucide-react'

export default function MobileSlashSheet({ open, onClose, editor }) {
  const { t } = useTranslation()

  const COMMANDS = [
    {
      key: 'paragraph',
      label: t('editor.slashCommands.paragraph', 'Text'),
      description: t('editor.slashCommands.paragraphDesc', 'Plain text paragraph'),
      icon: Type,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createParagraphNode())
        })
    },
    {
      key: 'h1',
      label: t('editor.slashCommands.heading1', 'Heading 1'),
      description: t('editor.slashCommands.heading1Desc', 'Large section heading'),
      icon: Heading1,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h1'))
        })
    },
    {
      key: 'h2',
      label: t('editor.slashCommands.heading2', 'Heading 2'),
      description: t('editor.slashCommands.heading2Desc', 'Medium section heading'),
      icon: Heading2,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h2'))
        })
    },
    {
      key: 'h3',
      label: t('editor.slashCommands.heading3', 'Heading 3'),
      description: t('editor.slashCommands.heading3Desc', 'Small section heading'),
      icon: Heading3,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h3'))
        })
    },
    {
      key: 'bullet',
      label: t('editor.slashCommands.bulletList', 'Bullet list'),
      description: t('editor.slashCommands.bulletListDesc', 'Unordered list'),
      icon: ListIcon,
      execute: (editor) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    },
    {
      key: 'number',
      label: t('editor.slashCommands.numberedList', 'Numbered list'),
      description: t('editor.slashCommands.numberedListDesc', 'Ordered list'),
      icon: ListOrdered,
      execute: (editor) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    },
    {
      key: 'quote',
      label: t('editor.slashCommands.quote', 'Quote'),
      description: t('editor.slashCommands.quoteDesc', 'Blockquote'),
      icon: QuoteIcon,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode())
        })
    },
    {
      key: 'code',
      label: t('editor.slashCommands.codeBlock', 'Code block'),
      description: t('editor.slashCommands.codeBlockDesc', 'Code with syntax highlighting'),
      icon: Code2,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createCodeNode())
        })
    },
    {
      key: 'table',
      label: t('editor.slashCommands.table', 'Table'),
      description: t('editor.slashCommands.tableDesc', 'Insert a table'),
      icon: Table,
      execute: (editor) => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '2', rows: '2' })
    },
    {
      key: 'hr',
      label: t('editor.slashCommands.divider', 'Divider'),
      description: t('editor.slashCommands.dividerDesc', 'Horizontal line'),
      icon: Minus,
      execute: (editor) => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
    },
    {
      key: 'note',
      label: t('editor.slashCommands.note', 'Note'),
      description: t('editor.slashCommands.noteDesc', 'Info callout'),
      icon: Info,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) {
            const callout = $createCalloutNode('note')
            callout.append($createParagraphNode())
            sel.insertNodes([callout])
          }
        })
    },
    {
      key: 'tip',
      label: t('editor.slashCommands.tip', 'Tip'),
      description: t('editor.slashCommands.tipDesc', 'Success tip'),
      icon: Lightbulb,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) {
            const callout = $createCalloutNode('tip')
            callout.append($createParagraphNode())
            sel.insertNodes([callout])
          }
        })
    },
    {
      key: 'warning',
      label: t('editor.slashCommands.warning', 'Warning'),
      description: t('editor.slashCommands.warningDesc', 'Warning callout'),
      icon: AlertTriangle,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) {
            const callout = $createCalloutNode('warning')
            callout.append($createParagraphNode())
            sel.insertNodes([callout])
          }
        })
    },
    {
      key: 'columns',
      label: t('editor.slashCommands.columns', '2 Columns'),
      description: t('editor.slashCommands.columnsDesc', 'Side-by-side layout'),
      icon: Columns,
      execute: (editor) =>
        editor.update(() => {
          const sel = $getSelection()
          if ($isRangeSelection(sel)) {
            const container = $createColumnContainerNode(2)
            const col1 = $createColumnNode()
            const col2 = $createColumnNode()
            col1.append($createParagraphNode())
            col2.append($createParagraphNode())
            container.append(col1, col2)
            sel.insertNodes([container])
          }
        })
    }
  ]

  const handleSelect = (cmd) => {
    cmd.execute(editor)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'flex-end', zIndex: 300 }}>
      <Sheet
        sx={{
          width: '100%',
          borderRadius: '16px 16px 0 0',
          maxHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pb: 'env(safe-area-inset-bottom)'
        }}
      >
        {/* Handle + header */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1.5, pb: 1, flexShrink: 0, position: 'relative' }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: 'neutral.300',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
          <Typography level='title-sm' sx={{ flex: 1, textAlign: 'center' }}>
            {t('editor.mobile.insertBlock', 'Insert block')}
          </Typography>
          <IconButton size='sm' variant='plain' color='neutral' onClick={onClose} aria-label={t('common.close', 'Close')}>
            <X size={18} />
          </IconButton>
        </Box>

        {/* Command list */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          <List sx={{ py: 0.5, px: 0 }}>
            {COMMANDS.map((cmd) => {
              const Icon = cmd.icon
              return (
                <ListItem
                  key={cmd.key}
                  onClick={() => handleSelect(cmd)}
                  sx={{
                    cursor: 'pointer',
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': { bgcolor: 'background.level1' },
                    '&:active': { bgcolor: 'background.level2' }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 'sm',
                      flexShrink: 0,
                      bgcolor: 'background.level1',
                      color: 'text.secondary'
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                  <Box>
                    <Typography level='body-sm' fontWeight={500}>
                      {cmd.label}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {cmd.description}
                    </Typography>
                  </Box>
                </ListItem>
              )
            })}
          </List>
        </Box>
      </Sheet>
    </Modal>
  )
}
