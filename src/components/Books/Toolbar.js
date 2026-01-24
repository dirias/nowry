import React from 'react'
import { Box, Divider, Tooltip, IconButton } from '@mui/joy'
import { Slash, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'

// Toolbar components
import UndoRedo from '../Editor/UndoRedo'
import TextFormatButtons from '../Editor/TextFormatButtons'
import BlockFormatDropdown from '../Editor/BlockFormatDropdown'
import FontFamilyDropdown from '../Editor/FontFamilyDropdown'
import TextColorPicker from '../Editor/TextColorPicker'
import BgColorPicker from '../Editor/BgColorPicker'
import AlignDropdown from '../Editor/AlignDropdown'

/**
 * Minimalistic Toolbar - Following DESIGN_GUIDELINES.md
 *
 * PHILOSOPHY: "Refined Minimalism" - Less is More
 * - Intuitive color pickers with visual swatches (like Word/Google Docs)
 * - Font family with actual font preview
 * - Background color for highlights
 * - Direct link and image buttons (minimal clicks)
 * - Slash commands hint for power users
 * - Keep only essentials: undo, format, font, colors, align, media
 *
 * WHY:
 * - Visual feedback on colors and fonts (no "Default" dropdown)
 * - Faster workflow for common tasks
 * - Less visual clutter = better focus on content
 */
const Toolbar = ({ onSave, disabled = false }) => {
  const [editor] = useLexicalComposerContext()

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url })
    }
  }

  const insertImage = () => {
    // Trigger the image upload flow if available
    if (editor?.triggerImageUpload) {
      editor.triggerImageUpload()
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'nowrap'
      }}
    >
      {/* Undo/Redo */}
      <UndoRedo />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Text Format (Bold, Italic, Underline, Strikethrough, Code) */}
      <TextFormatButtons />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Block Format (Paragraph, H1, H2, H3, Lists, Quote) */}
      <BlockFormatDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Font Family */}
      <FontFamilyDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Alignment */}
      <AlignDropdown />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Text Color */}
      <TextColorPicker />

      {/* Background Color (Highlight) */}
      <BgColorPicker />

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Link */}
      <Tooltip title='Insert link' placement='bottom'>
        <IconButton size='sm' variant='plain' onClick={insertLink} disabled={disabled} sx={{ minWidth: 32 }}>
          <LinkIcon size={16} />
        </IconButton>
      </Tooltip>

      {/* Image */}
      <Tooltip title='Insert image' placement='bottom'>
        <IconButton size='sm' variant='plain' onClick={insertImage} disabled={disabled} sx={{ minWidth: 32 }}>
          <ImageIcon size={16} />
        </IconButton>
      </Tooltip>

      <Divider orientation='vertical' sx={{ mx: 0.5, height: 24 }} />

      {/* Slash Commands Hint */}
      <Tooltip title='Type / for more: /table, /code, /hr, etc.' placement='bottom' variant='soft'>
        <IconButton
          size='sm'
          variant='plain'
          disabled
          sx={{
            minWidth: 32,
            opacity: 0.5,
            cursor: 'help',
            '&:hover': {
              opacity: 0.7
            }
          }}
        >
          <Slash size={16} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default Toolbar
