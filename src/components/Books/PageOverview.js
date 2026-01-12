import React, { memo } from 'react'
import { Plus } from 'lucide-react'
import { Box, Typography, Sheet, Stack, IconButton, Skeleton } from '@mui/joy'
import { PAGE_SIZES } from '../Editor/PageSizeDropdown'

const toPx = (val) => {
  if (typeof val === 'number') return val
  if (typeof val === 'string' && val.endsWith('mm')) return parseFloat(val) * 3.7795
  if (typeof val === 'string' && val.endsWith('cm')) return parseFloat(val) * 37.795
  if (typeof val === 'string' && val.endsWith('in')) return parseFloat(val) * 96
  return 1123
}

export default function PageOverview({ pagesData = [], pageSize = 'a4', onPageClick, activePageIndex = 0 }) {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.a4
  const pageW = toPx(size.width)
  const pageH = toPx(size.height)

  // Calculate thumbnail dimensions
  const thumbW = 180
  const scale = thumbW / pageW
  const thumbH = pageH * scale

  const windowBuffer = 3
  const windowSize = 30
  const windowStart = Math.max(0, activePageIndex - windowBuffer)
  const windowEnd = Math.min(pagesData.length - 1, activePageIndex + windowSize)

  // If no data yet (layout pending) or not ready, show skeletons
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

  const showSkeletons = !pagesData || pagesData.length === 0
  const skeletonCount = showSkeletons ? 3 : 0

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
        {/* Render Real Pages */}
        {pagesData.map((page, i) => {
          const isActive = activePageIndex === page.index
          const isVirtualized = i < windowStart || i > windowEnd
          if (isVirtualized) {
            return (
              <LightPageRow
                key={`${page.index}-light-${pageSize}`}
                index={page.index}
                isActive={isActive}
                onClick={() => onPageClick(page.index)}
                thumbW={thumbW}
                thumbH={thumbH}
              />
            )
          } else {
            return (
              <PageCard
                key={`${page.index}-${pageSize}`}
                index={page.index}
                content={page.content}
                isActive={isActive}
                onClick={() => onPageClick(page.index)}
                thumbW={thumbW}
                thumbH={thumbH}
                scale={scale}
                pageW={pageW}
                pageH={pageH}
              />
            )
          }
        })}

        {/* Skeletons when data is not ready */}
        {showSkeletons &&
          Array.from({ length: Math.max(3, pagesData?.length || 0) }).map((_, i) => (
            <Box key={`skeleton-${i}`}>
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

const LightPageRow = memo(function LightPageRow({ index, isActive, onClick, thumbW, thumbH }) {
  return (
    <Box>
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
          border: isActive ? '2px solid' : '1px dashed',
          borderColor: isActive ? 'primary.500' : 'neutral.outlinedBorder',
          boxShadow: isActive ? 'md' : 'xs',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          Preview on scroll
        </Typography>
      </Box>
      <Typography level='body-xs' textAlign='center' sx={{ color: isActive ? 'primary.600' : 'text.tertiary' }}>
        Page {index + 1}
      </Typography>
    </Box>
  )
})

const PageCard = memo(
  function PageCard({ index, content, isActive, onClick, thumbW, thumbH, scale, pageW, pageH }) {
    // Render first 3 pages immediately, lazy load the rest
    const shouldLazyLoad = index >= 3
    const [isVisible, setIsVisible] = React.useState(!shouldLazyLoad)
    const [hasRendered, setHasRendered] = React.useState(!shouldLazyLoad)
    const cardRef = React.useRef(null)
    const isReady = content && content.trim().length > 0

    // Lazy load thumbnail content when scrolling near it (only for pages after first 3)
    React.useEffect(() => {
      if (!shouldLazyLoad || !cardRef.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasRendered) {
              setIsVisible(true)
              setHasRendered(true)
            }
          })
        },
        {
          root: null,
          rootMargin: '300px 0px 300px 0px',
          threshold: 0.1
        }
      )

      observer.observe(cardRef.current)
      return () => observer.disconnect()
    }, [hasRendered, shouldLazyLoad])

    return (
      <Box ref={cardRef}>
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
          {isVisible ? (
            isReady ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: pageW,
                  height: pageH,
                  bgcolor: 'white',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  padding: '96px',
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
              <Skeleton variant='rectangular' width='100%' height='100%' />
            )
          ) : (
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
              Loading...
            </Typography>
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
  },
  (prev, next) => {
    return prev.index === next.index && prev.isActive === next.isActive && prev.content === next.content
  }
)
