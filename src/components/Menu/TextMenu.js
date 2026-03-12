import React, { forwardRef, useState, useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { Sheet, IconButton, Divider, Stack, Box, Dropdown, Menu, MenuButton, MenuItem, Tooltip, Input } from '@mui/joy'
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  ScrollText,
  Image as ImageIcon,
  Wand2,
  ChevronDown,
  Check,
  X
} from 'lucide-react'

const TextMenu = forwardRef(({ onOptionClick, style, activeFormats = {}, onLinkEdit }, ref) => {
  const [editor] = useLexicalComposerContext()
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const inputRef = useRef(null)

  const toggleFormat = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const toggleLink = () => {
    setIsEditingLink(true)
    onLinkEdit?.(true)
  }

  const confirmLink = () => {
    if (linkUrl) {
      // Basic URL validation/prefixing
      let finalUrl = linkUrl.trim()
      if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl
      }
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: finalUrl })
    }
    setIsEditingLink(false)
    setLinkUrl('')
    onLinkEdit?.(false)
  }

  const cancelLink = () => {
    setIsEditingLink(false)
    setLinkUrl('')
    onLinkEdit?.(false)
  }

  const aiOptions = [
    { label: 'Create Study Card', value: 'create_study_card', icon: <StickyNote size={16} /> },
    { label: 'Create Questionnaire', value: 'create_questionnaire', icon: <ScrollText size={16} /> },
    { label: 'Imagine Scene', value: 'create_visual_content', icon: <ImageIcon size={16} /> },
    { label: 'Extract Vocabulary', value: 'extract_vocabulary', icon: <Wand2 size={16} /> },
    { label: 'Insert Link', value: 'insert_link', icon: <LinkIcon size={16} /> }
  ]

  return (
    <Sheet
      ref={ref}
      variant='elevated'
      sx={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        borderRadius: 'xl',
        boxShadow: 'xl',
        border: '1px solid',
        borderColor: 'neutral.outlinedBorder',
        bgcolor: 'background.surface',
        backdropFilter: 'blur(8px)',
        height: 40,
        ...style
      }}
    >
      {isEditingLink ? (
        <Stack direction='row' spacing={0.5} sx={{ px: 1, width: '100%', alignItems: 'center' }}>
          <Input
            autoFocus
            size='sm'
            variant='plain'
            placeholder='Paste or type a link...'
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmLink()
              if (e.key === 'Escape') cancelLink()
            }}
            sx={{
              minWidth: 180,
              '--Input-focusedHighlight': 'transparent',
              '&:hover': { bgcolor: 'transparent' },
              fontSize: 'xs'
            }}
          />
          <IconButton size='sm' variant='soft' color='primary' onClick={confirmLink}>
            <Check size={16} />
          </IconButton>
          <IconButton size='sm' variant='plain' color='neutral' onClick={cancelLink}>
            <X size={16} />
          </IconButton>
        </Stack>
      ) : (
        <>
          <Stack direction='row' spacing={0.5} sx={{ px: 0.5 }}>
            <Tooltip title='Bold' variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.bold ? 'soft' : 'plain'}
                color={activeFormats.bold ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('bold')}
              >
                <Bold size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title='Italic' variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.italic ? 'soft' : 'plain'}
                color={activeFormats.italic ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('italic')}
              >
                <Italic size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title='Underline' variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.underline ? 'soft' : 'plain'}
                color={activeFormats.underline ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('underline')}
              >
                <Underline size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title='Link' variant='soft' size='sm'>
              <IconButton size='sm' variant='plain' color='neutral' onClick={toggleLink}>
                <LinkIcon size={16} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider orientation='vertical' sx={{ mx: 0.5 }} />

          <Dropdown>
            <MenuButton
              size='sm'
              variant='plain'
              color='primary'
              endDecorator={<ChevronDown size={14} />}
              sx={{
                fontWeight: 'bold',
                fontSize: 'sm',
                '--Button-gap': '4px',
                '&:hover': { bgcolor: 'primary.softHoverBg' }
              }}
            >
              <Sparkles size={16} style={{ marginRight: 4 }} />
              Magic
            </MenuButton>
            <Menu
              placement='bottom-start'
              size='sm'
              sx={{
                zIndex: 10000,
                borderRadius: 'md',
                boxShadow: 'md',
                '--ListItem-radius': '4px',
                minWidth: 180
              }}
            >
              {aiOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() => {
                    if (option.value === 'insert_link') {
                      toggleLink()
                    } else {
                      onOptionClick(option.value)
                    }
                  }}
                >
                  <Box component='span' sx={{ display: 'flex', color: 'primary.500' }}>
                    {option.icon}
                  </Box>
                  <Box sx={{ ml: 1 }}>{option.label}</Box>
                </MenuItem>
              ))}
            </Menu>
          </Dropdown>
        </>
      )}
    </Sheet>
  )
})

TextMenu.displayName = 'TextMenu'

export default TextMenu
