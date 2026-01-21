import React, { memo, useMemo, useRef, useEffect } from 'react'
import { Box, Typography, Sheet, Stack, Skeleton } from '@mui/joy'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'

const toPx = (val) => {
  if (typeof val === 'number') return val
  if (typeof val === 'string' && val.endsWith('mm')) return parseFloat(val) * 3.7795
  if (typeof val === 'string' && val.endsWith('cm')) return parseFloat(val) * 37.795
  if (typeof val === 'string' && val.endsWith('in')) return parseFloat(val) * 96
  return 1123
}

/**
 * PageOverview - Sidebar showing page thumbnails
 *
 * ARCHITECTURE:
 * - Simple virtual scrolling based on viewport intersection
 * - No complex window calculations
 * - Pages render when they enter viewport (IntersectionObserver)
 * - Active page tracking is separate from rendering logic
 */
export default function PageOverview({ pagesData = [], pageSize = 'a4', onPageClick, activePageIndex = 0 }) {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.a4
  const pageW = toPx(size.width)
  const pageH = toPx(size.height)
  const pagePaddingY = toPx(size.paddingY || '25mm')
  const pagePaddingX = toPx(size.paddingX || '20mm')

  // Calculate thumbnail dimensions
  const thumbW = 180
  const scale = thumbW / pageW
  const thumbH = pageH * scale

  // Auto-scroll to active page
  const activePageRef = useRef(null)
  useEffect(() => {
    if (activePageRef.current) {
      activePageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activePageIndex])

  // Loading state
  if (!pagesData || pagesData.length === 0) {
    return (
      <Sheet
        sx={{
          p: 2,
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: 'background.surface',
          border: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        <Typography
          level='title-sm'
          sx={{ mb: 2, px: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 'sm', fontSize: 'xs' }}
        >
          Table of Contents
        </Typography>
        <Stack spacing={2} alignItems='center'>
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <Box sx={{ width: thumbW, height: thumbH, mb: 1 }}>
                <Skeleton variant='rectangular' width={thumbW} height={thumbH} sx={{ borderRadius: 'sm' }} />
              </Box>
              <Skeleton variant='text' width={60} sx={{ mx: 'auto' }} />
            </Box>
          ))}
        </Stack>
      </Sheet>
    )
  }

  return (
    <Sheet
      sx={{
        p: 2,
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'background.surface',
        border: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      <Typography
        level='title-sm'
        sx={{ mb: 2, px: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 'sm', fontSize: 'xs' }}
      >
        Table of Contents ({pagesData.length})
      </Typography>

      <Stack spacing={2} alignItems='center' pb={10}>
        {pagesData.map((page) => {
          const isActive = activePageIndex === page.index
          return (
            <PageThumbnail
              key={`page-${page.index}-${pageSize}`}
              index={page.index}
              content={page.content}
              isActive={isActive}
              onClick={() => onPageClick(page.index)}
              thumbW={thumbW}
              thumbH={thumbH}
              scale={scale}
              pageW={pageW}
              pageH={pageH}
              pagePaddingY={pagePaddingY}
              pagePaddingX={pagePaddingX}
              ref={isActive ? activePageRef : null}
            />
          )
        })}
      </Stack>
    </Sheet>
  )
}

/**
 * PageThumbnail - Single page preview
 *
 * ARCHITECTURE: No lazy loading. Just render.
 * - Thumbnails are small (scaled down HTML)
 * - Modern browsers handle hundreds easily
 * - Memoized to prevent unnecessary re-renders
 * - Simple, direct, predictable
 */
const PageThumbnail = memo(
  React.forwardRef(function PageThumbnail(
    { index, content, isActive, onClick, thumbW, thumbH, scale, pageW, pageH, pagePaddingY, pagePaddingX },
    ref
  ) {
    const hasContent = content && content.trim().length > 0

    return (
      <Box ref={ref}>
        <Box
          onClick={onClick}
          sx={{
            width: thumbW,
            height: thumbH,
            position: 'relative',
            backgroundColor: 'background.level1',
            borderRadius: 'sm',
            mb: 1,
            cursor: 'pointer',
            border: isActive ? '2px solid' : '1px solid',
            borderColor: isActive ? 'primary.500' : 'neutral.outlinedBorder',
            boxShadow: isActive ? 'md' : 'xs',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
            '&:hover': {
              borderColor: isActive ? 'primary.500' : 'primary.300',
              transform: 'translateY(-2px)',
              boxShadow: 'md'
            }
          }}
        >
          {hasContent ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: pageW,
                height: pageH,
                bgcolor: 'background.body',
                color: 'text.primary',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none',
                overflow: 'hidden',
                boxSizing: 'border-box',
                padding: `${pagePaddingY}px ${pagePaddingX}px`,
                fontSize: '12px',
                lineHeight: '1.2',
                '& img': {
                  maxWidth: '100%',
                  height: 'auto'
                }
              }}
            >
              <div className='preview-content' dangerouslySetInnerHTML={{ __html: content || '' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.tertiary'
              }}
            >
              <Typography level='body-xs'>Empty</Typography>
            </Box>
          )}

          {/* Page Number Badge */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: 'background.surface',
              px: 0.8,
              py: 0.2,
              borderRadius: 'xs',
              border: '1px solid',
              borderColor: 'divider',
              zIndex: 2,
              boxShadow: 'sm'
            }}
          >
            <Typography level='body-xs' fontWeight='bold'>
              {index + 1}
            </Typography>
          </Box>
        </Box>
        <Typography level='body-xs' textAlign='center' sx={{ color: isActive ? 'primary.600' : 'text.tertiary' }}>
          Page {index + 1}
        </Typography>
      </Box>
    )
  }),
  (prev, next) => {
    // Only re-render if these specific props change
    return prev.index === next.index && prev.isActive === next.isActive && prev.content === next.content
  }
)
