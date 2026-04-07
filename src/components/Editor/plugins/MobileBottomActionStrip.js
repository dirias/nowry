import React, { useEffect, useState } from 'react'
import { Sheet, IconButton, Divider, Stack } from '@mui/joy'
import { Bold, Italic, Underline, Link as LinkIcon } from 'lucide-react'
import { FORMAT_TEXT_COMMAND, $getSelection, $isRangeSelection } from 'lexical'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useTranslation } from 'react-i18next'
import MobileSlashSheet from './MobileSlashSheet'

export default function MobileBottomActionStrip({ editor }) {
  const { t } = useTranslation()
  const [bottomOffset, setBottomOffset] = useState(0)
  const [slashOpen, setSlashOpen] = useState(false)
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })

  // Track active formats
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          setActiveFormats({
            bold: selection.hasFormat('bold'),
            italic: selection.hasFormat('italic'),
            underline: selection.hasFormat('underline')
          })
        }
      })
    })
  }, [editor])

  // Stick above soft keyboard via visualViewport
  useEffect(() => {
    if (!window.visualViewport) return
    const handleViewportResize = () => {
      const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
      setBottomOffset(Math.max(0, offset))
    }
    window.visualViewport.addEventListener('resize', handleViewportResize)
    window.visualViewport.addEventListener('scroll', handleViewportResize)
    return () => {
      window.visualViewport.removeEventListener('resize', handleViewportResize)
      window.visualViewport.removeEventListener('scroll', handleViewportResize)
    }
  }, [])

  const handleLink = () => {
    const url = prompt('Enter URL:')
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url })
  }

  return (
    <>
      <Sheet
        variant='outlined'
        sx={{
          position: 'fixed',
          bottom: bottomOffset,
          left: 0,
          right: 0,
          zIndex: 150,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          px: 1,
          py: 0.75,
          borderTop: '1px solid',
          borderColor: 'divider',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: 0,
          bgcolor: 'background.surface',
          gap: 0.5
        }}
      >
        <Stack direction='row' spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
          <IconButton
            size='sm'
            variant={activeFormats.bold ? 'soft' : 'plain'}
            color={activeFormats.bold ? 'primary' : 'neutral'}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
            aria-label={t('editor.format.bold', 'Bold')}
          >
            <Bold size={18} />
          </IconButton>
          <IconButton
            size='sm'
            variant={activeFormats.italic ? 'soft' : 'plain'}
            color={activeFormats.italic ? 'primary' : 'neutral'}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
            aria-label={t('editor.format.italic', 'Italic')}
          >
            <Italic size={18} />
          </IconButton>
          <IconButton
            size='sm'
            variant={activeFormats.underline ? 'soft' : 'plain'}
            color={activeFormats.underline ? 'primary' : 'neutral'}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
            aria-label={t('editor.format.underline', 'Underline')}
          >
            <Underline size={18} />
          </IconButton>
          <IconButton size='sm' variant='plain' color='neutral' onClick={handleLink} aria-label={t('editor.format.link', 'Link')}>
            <LinkIcon size={18} />
          </IconButton>
        </Stack>

        <Divider orientation='vertical' sx={{ height: 20, mx: 0.5 }} />

        <IconButton
          size='sm'
          variant='soft'
          color='neutral'
          onClick={() => setSlashOpen(true)}
          aria-label={t('editor.mobile.insertBlock', 'Insert block')}
          sx={{ borderRadius: 'sm', px: 1.5, fontWeight: 600, fontSize: 'sm' }}
        >
          /
        </IconButton>
      </Sheet>

      <MobileSlashSheet open={slashOpen} onClose={() => setSlashOpen(false)} editor={editor} />
    </>
  )
}
