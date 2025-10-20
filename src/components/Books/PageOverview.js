// PageOverview.jsx
import React, { memo, useMemo, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Box, Typography, Sheet, Stack, IconButton } from '@mui/joy'

const keyOf = (p) => String(p?._id ?? p?.clientKey ?? p?.page_number ?? '')

export default function PageOverview({
  pages,
  activeKey,
  setActivePage,
  setContent,
  handleSavePage,
  liveContent = '',
  liveKey = null,
  thumbW = 220, // ↑ larger than 180
  thumbH = 310,
  pageW = 816, // Letter (8.5" * 96dpi)
  pageH = 1056, // 11" * 96dpi
  pagePadding = 40 // ↓ smaller than 64 to gain usable area
}) {
  const changeActivePage = (page) => {
    setActivePage(page)
    setContent(page.content || '')
  }

  return (
    <Sheet
      variant='outlined'
      sx={{
        p: 2,
        borderRadius: 'md',
        width: 320,
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'background.level1'
      }}
    >
      <Typography level='title-md' sx={{ mb: 2 }}>
        Pages (Overview)
      </Typography>

      <Stack spacing={2} alignItems='center'>
        {pages.map((page) => {
          const k = keyOf(page)
          const isActive = String(activeKey) === k
          const previewHtml = isActive && String(liveKey) === k ? liveContent || '' : page.content || ''
          return (
            <PageCard
              key={k}
              isActive={isActive}
              onClick={() => changeActivePage(page)}
              html={previewHtml}
              thumbW={thumbW}
              thumbH={thumbH}
              pageW={pageW}
              pageH={pageH}
              pagePadding={pagePadding}
            />
          )
        })}

        <IconButton onClick={() => handleSavePage(null)} variant='soft' color='primary' size='sm' sx={{ alignSelf: 'center', mt: 2 }}>
          <Plus />
        </IconButton>
      </Stack>
    </Sheet>
  )
}

const PageCard = memo(function PageCard({ isActive, onClick, html, thumbW, thumbH, pageW, pageH, pagePadding }) {
  const sanitizedHtml = useMemo(() => html || '', [html])
  const cardRef = useRef(null)

  const scale = Math.min(thumbW / pageW, thumbH / pageH)

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  return (
    <Box
      ref={cardRef}
      onClick={onClick}
      tabIndex={-1}
      sx={{
        border: '2px solid',
        borderColor: isActive ? 'primary.solidBg' : 'neutral.outlinedBorder',
        borderRadius: 'sm',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        width: thumbW,
        height: thumbH,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: 'sm',
        transition: 'all 0.2s ease',
        outline: 'none',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 'md' }
      }}
    >
      <Box
        sx={{
          width: thumbW,
          height: thumbH,
          overflow: 'hidden',
          borderRadius: 'xs',
          backgroundColor: 'background.level1',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Inner viewport: applies zoom to the content but preserves quality */}
        <Box
          sx={{
            width: pageW,
            height: pageH,
            backgroundColor: '#fff',
            border: '1px solid rgba(0,0,0,.08)',
            boxShadow: '0 1px 2px rgba(0,0,0,.06)',
            overflow: 'hidden',
            borderRadius: '4px',
            pointerEvents: 'none',
            transform: `scale(${scale}) translate(-50%, -50%)`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: '50%',
            left: '50%'
          }}
          className='preview-page'
        >
          <div
            style={{
              boxSizing: 'border-box',
              width: '100%',
              height: '100%',
              padding: pagePadding,
              overflow: 'hidden'
            }}
          >
            <div className='preview-content' dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          </div>
        </Box>
      </Box>
    </Box>
  )
})
