import React, { memo, useMemo, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Box, Typography, Sheet, Stack, IconButton } from '@mui/joy'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'

const keyOf = (p) => String(p?._id ?? p?.clientKey ?? p?.page_number ?? '')

const toPx = (val) => {
  if (typeof val === 'number') return val
  if (typeof val === 'string' && val.endsWith('mm')) return parseFloat(val) * 3.7795
  if (typeof val === 'string' && val.endsWith('cm')) return parseFloat(val) * 37.795
  if (typeof val === 'string' && val.endsWith('in')) return parseFloat(val) * 96
  return 1123
}

export default function PageOverview({
  pages,
  activeKey,
  setActivePage,
  setContent,
  handleSavePage,
  liveContent = '',
  liveKey = null,
  pageSize = 'a4',
  pagePadding = 95 // Match editor padding (2.5cm)
}) {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.a4
  const pageW = toPx(size.width)
  const pageH = toPx(size.height)
  const thumbW = 245
  const thumbH = thumbW * (pageH / pageW)
  const changeActivePage = (page) => {
    setActivePage(page)
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
        border: isActive ? '2px solid #0B6BCB' : '2px solid transparent', // High visibility border
        borderRadius: 'sm',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        width: thumbW,
        height: thumbH,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: isActive ? 'md' : 'sm',
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
          backgroundColor: 'transparent', // Transparent to avoid gray bars
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Box
          sx={{
            width: pageW,
            height: pageH,
            backgroundColor: '#ffffff',
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden',
            borderRadius: '0',
            pointerEvents: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'center center', // Center the scaled content
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: `-${pageW / 2}px`, // Offset by half width
            marginTop: `-${pageH / 2}px` // Offset by half height
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
