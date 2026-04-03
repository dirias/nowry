import React, { forwardRef, useState, useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { Sheet, IconButton, Divider, Stack, Box, Dropdown, Menu, MenuButton, MenuItem, Tooltip, Input, Typography } from '@mui/joy'
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
  Check,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const TextMenu = forwardRef(({ onOptionClick, style, activeFormats = {}, onLinkEdit }, ref) => {
  const [editor] = useLexicalComposerContext()
  const { t } = useTranslation()
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
    { label: t('editor.ai.questionnaire', 'Questionnaire'), value: 'create_questionnaire', icon: <ScrollText size={15} /> },
    { label: t('editor.ai.visual', 'Imagine scene'), value: 'create_visual_content', icon: <ImageIcon size={15} /> },
    { label: t('editor.ai.vocabulary', 'Extract vocabulary'), value: 'extract_vocabulary', icon: <Wand2 size={15} /> }
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
        height: 38,
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
            <Tooltip title={t('editor.format.bold', 'Bold')} variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.bold ? 'soft' : 'plain'}
                color={activeFormats.bold ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('bold')}
              >
                <Bold size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('editor.format.italic', 'Italic')} variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.italic ? 'soft' : 'plain'}
                color={activeFormats.italic ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('italic')}
              >
                <Italic size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('editor.format.underline', 'Underline')} variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant={activeFormats.underline ? 'soft' : 'plain'}
                color={activeFormats.underline ? 'primary' : 'neutral'}
                onClick={() => toggleFormat('underline')}
              >
                <Underline size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('editor.format.link', 'Link')} variant='soft' size='sm'>
              <IconButton size='sm' variant='plain' color='neutral' onClick={toggleLink}>
                <LinkIcon size={16} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider orientation='vertical' sx={{ mx: 0.5 }} />

          {/* Create Card — primary action, always visible */}
          <Tooltip title={t('editor.ai.createCardHint', 'Generate a study card from this selection')} variant='soft' size='sm'>
            <IconButton
              size='sm'
              variant='soft'
              color='primary'
              onClick={() => onOptionClick('create_study_card')}
              aria-label={t('editor.ai.card', 'Card')}
              sx={{
                borderRadius: 'sm',
                gap: 0.5,
                px: 1,
                fontWeight: 600,
                fontSize: '0.75rem',
                minWidth: 'auto'
              }}
            >
              <StickyNote size={14} />
              <Typography level='body-xs' sx={{ fontWeight: 600, color: 'inherit' }}>
                {t('editor.ai.card', 'Card')}
              </Typography>
            </IconButton>
          </Tooltip>

          <Divider orientation='vertical' sx={{ mx: 0.5 }} />

          {/* Secondary AI actions — icon-only overflow */}
          <Dropdown>
            <Tooltip title={t('editor.ai.more', 'More AI actions')} variant='soft' size='sm'>
              <MenuButton
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('editor.ai.more', 'More AI actions')}
                sx={{ minWidth: 28, px: 0.5 }}
              >
                <Sparkles size={15} />
              </MenuButton>
            </Tooltip>
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
                <MenuItem key={option.value} onClick={() => onOptionClick(option.value)}>
                  <Box component='span' sx={{ display: 'flex', color: 'primary.plainColor' }}>
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
