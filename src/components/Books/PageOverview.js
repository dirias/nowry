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

  // If no data yet (layout pending), show skeletons
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
        width: '100%', // Responsive: fills Drawer or Sidebar container
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
        {pagesData.map((page, i) => {
          const isActive = activePageIndex === page.index
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
        })}
      </Stack>
    </Sheet>
  )
}

const PageCard = memo(
  function PageCard({ index, content, isActive, onClick, thumbW, thumbH, scale, pageW, pageH }) {
    return (
      <Box>
        <Box
          onClick={onClick}
          sx={{
            width: thumbW,
            height: thumbH,
            position: 'relative',
            backgroundColor: 'background.level1', // visible if loading
            borderRadius: 'sm',
            mb: 1,
            cursor: 'pointer',
            border: isActive ? '2px solid' : '1px solid',
            borderColor: isActive ? 'primary.500' : 'neutral.outlinedBorder',
            boxShadow: isActive ? 'md' : 'xs',
            transition: 'all 0.2s ease',
            overflow: 'hidden', // Clip the scaled content
            display: 'block',
            '&:hover': {
              borderColor: isActive ? 'primary.500' : 'primary.300',
              transform: 'translateY(-2px)',
              boxShadow: 'md'
            }
          }}
        >
          {/* Scaled Content Container */}
          <Box
            sx={{
              width: pageW,
              height: pageH,
              bgcolor: 'white',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none', // Prevent interaction with preview
              overflow: 'hidden',
              boxSizing: 'border-box',
              padding: '96px' // Fixed print padding for thumbnails
            }}
          >
            <div className='preview-content' dangerouslySetInnerHTML={{ __html: content || '' }} />
          </Box>

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
    // Custom memo comparison to avoid excessive re-renders if content hasn't changed meaningfully
    // But HTML strings can be large.
    return prev.index === next.index && prev.isActive === next.isActive && prev.content === next.content
  }
)
