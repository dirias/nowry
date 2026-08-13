import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { createPortal } from 'react-dom'
import { Sheet, IconButton, Tooltip, Stack, Divider } from '@mui/joy'
import { ExternalLink, Edit2, Link2Off } from 'lucide-react'

export default function LinkPreviewPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isLink, setIsLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)

  const updatePreview = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection) && selection.isCollapsed()) {
      const node = selection.getNodes()[0]
      const parent = node?.getParent()

      if ($isLinkNode(parent) || $isLinkNode(node)) {
        const linkNode = $isLinkNode(parent) ? parent : node
        const url = linkNode.getURL()
        setLinkUrl(url)

        // Get DOM position
        const nativeSelection = window.getSelection()
        if (nativeSelection && nativeSelection.rangeCount > 0) {
          const range = nativeSelection.getRangeAt(0)
          const rect = range.getBoundingClientRect()

          setPosition({
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2
          })
          setIsLink(true)
          return
        }
      }
    }
    setIsLink(false)
  }, [])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updatePreview()
      })
    })
  }, [editor, updatePreview])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updatePreview()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updatePreview])

  const openLink = useCallback(() => {
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer')
    }
  }, [linkUrl])

  const editLink = () => {
    // We'll let the FloatingToolbarPlugin handle the edit part if needed,
    // or we can select the text to trigger the toolbar.
    // For now, let just make it easy to select the whole link.
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const node = selection.getNodes()[0]
        const parent = node?.getParent()
        const linkNode = $isLinkNode(parent) ? parent : node
        if ($isLinkNode(linkNode)) {
          linkNode.select()
        }
      }
    })
  }

  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
  }

  if (!isLink) return null

  return createPortal(
    <Sheet
      ref={menuRef}
      variant='elevated'
      sx={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        p: 0.5,
        borderRadius: 'lg',
        boxShadow: 'md',
        border: '1px solid',
        borderColor: 'neutral.outlinedBorder',
        bgcolor: 'background.surface',
        backdropFilter: 'blur(8px)',
        animation: 'fadeInUp 0.2s ease-out'
      }}
    >
      <Stack direction='row' spacing={0.5} sx={{ px: 0.5 }}>
        <Tooltip title='Open Link' variant='soft' size='sm'>
          <IconButton size='sm' variant='plain' color='primary' onClick={openLink}>
            <ExternalLink size={16} />
          </IconButton>
        </Tooltip>

        {editor.isEditable() && (
          <>
            <Divider orientation='vertical' sx={{ mx: 0.5 }} />

            <Tooltip title='Edit Link' variant='soft' size='sm'>
              <IconButton size='sm' variant='plain' color='neutral' onClick={editLink}>
                <Edit2 size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title='Remove Link' variant='soft' size='sm'>
              <IconButton size='sm' variant='plain' color='danger' onClick={removeLink}>
                <Link2Off size={16} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Sheet>,
    document.body
  )
}
