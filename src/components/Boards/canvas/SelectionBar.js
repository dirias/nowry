import React from 'react'
import { useTranslation } from 'react-i18next'
import { NodeToolbar, Position } from '@xyflow/react'
import { Box, Button, IconButton, Sheet, Tooltip } from '@mui/joy'
import CropFreeRounded from '@mui/icons-material/CropFreeRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { TEXT_SIZES } from '@nowry/core/domain/board'
import { BOARD_NOTE_COLORS, noteVar } from './noteColors'
import { focusRing, segment, segmentedGroup } from '../../Common/Form/formStyles'

const Rule = () => <Box aria-hidden='true' sx={{ width: '1px', height: 20, mx: 0.25, bgcolor: 'divider' }} />

/**
 * The bar over a selection (canvas board 2, PRD D7): the five colours for
 * notes (sizes for a text block), Frame and Delete. `actions` is the slot the
 * study and planning paths fill — Make cards (BOARD-006) and Make items
 * (BOARD-005) render there; nothing renders today.
 */
export default function SelectionBar({ nodes, visible, onColor, onSize, onFrame, onDelete, actions = null }) {
  const { t } = useTranslation()
  if (!nodes.length) return null
  const notes = nodes.filter((n) => n.kind === 'note')
  const onlyText = nodes.every((n) => n.kind === 'text')
  const framable = nodes.some((n) => n.kind !== 'frame')
  const colorOf =
    notes.length && notes.every((n) => (n.color ?? 'yellow') === (notes[0].color ?? 'yellow')) ? (notes[0].color ?? 'yellow') : null
  const sizeOf = onlyText && nodes.every((n) => (n.size ?? 'lg') === (nodes[0].size ?? 'lg')) ? (nodes[0].size ?? 'lg') : null

  return (
    <NodeToolbar nodeId={nodes.map((n) => n.id)} isVisible={visible} position={Position.Top} offset={16}>
      <Sheet
        role='toolbar'
        aria-label={t('boards.selection.label')}
        className='nodrag nopan'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minHeight: 40,
          px: 0.75,
          borderRadius: 'md',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'md'
        }}
      >
        {notes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.25, px: 0.25 }}>
            {BOARD_NOTE_COLORS.map((color) => (
              <Tooltip key={color} title={t(`boards.selection.colors.${color}`)} size='sm'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t(`boards.selection.colors.${color}`)}
                  aria-pressed={colorOf === color}
                  onClick={() => onColor(color)}
                  sx={{ '--IconButton-size': '28px', borderRadius: 'md', ...focusRing }}
                >
                  <Box
                    aria-hidden='true'
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: 'full',
                      bgcolor: noteVar(color, 'bg'),
                      border: '1px solid',
                      borderColor: noteVar(color, 'border'),
                      outline: colorOf === color ? '2px solid' : 'none',
                      outlineColor: 'primary.solidBg',
                      outlineOffset: '1px'
                    }}
                  />
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        )}
        {onlyText && (
          <Box role='group' aria-label={t('boards.selection.sizeLabel')} sx={{ ...segmentedGroup, my: 0.5 }}>
            {TEXT_SIZES.map((size, index) => (
              <Button
                key={size}
                size='sm'
                variant='plain'
                color='neutral'
                aria-pressed={sizeOf === size}
                onClick={() => onSize(size)}
                sx={{ ...segment(sizeOf === size, index === 0), minHeight: 32 }}
              >
                {t(`boards.selection.size.${size}`)}
              </Button>
            ))}
          </Box>
        )}
        {(notes.length > 0 || onlyText) && <Rule />}
        {actions}
        {framable && (
          <Button size='sm' variant='plain' color='neutral' startDecorator={<CropFreeRounded />} onClick={onFrame} sx={focusRing}>
            {t('boards.selection.frame')}
          </Button>
        )}
        <Tooltip title={t('boards.selection.delete')} size='sm'>
          <IconButton size='sm' variant='plain' color='neutral' aria-label={t('boards.selection.delete')} onClick={onDelete} sx={focusRing}>
            <DeleteOutlineRounded />
          </IconButton>
        </Tooltip>
      </Sheet>
    </NodeToolbar>
  )
}
