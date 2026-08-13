import React from 'react'
import { Box, Sheet, Stack, Divider, Skeleton } from '@mui/joy'

export default function EditorSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'background.level2'
      }}
    >
      {/* 🏛 Header Skeleton */}
      <Sheet
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          zIndex: 1000,
          boxShadow: 'sm',
          flexShrink: 0,
          height: 101 // Height of header + toolbar
        }}
      >
        {/* Row 1: Book Info */}
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ height: 50, px: 3 }}>
          <Stack direction='row' alignItems='center' spacing={2} sx={{ flexGrow: 1 }}>
            {/* Title Skeleton */}
            <Skeleton variant='rectangular' width={200} height={32} />
            <Divider orientation='vertical' sx={{ height: 20 }} />
            {/* Metadata Skeleton */}
            <Skeleton variant='text' width={120} level='body-xs' />
            <Divider orientation='vertical' sx={{ height: 20 }} />
            {/* Badge Skeleton */}
            <Skeleton variant='rectangular' width={80} height={24} sx={{ borderRadius: 'sm' }} />
          </Stack>

          <Stack direction='row' spacing={1.5} alignItems='center'>
            {/* Save Button Skeleton */}
            <Skeleton variant='rectangular' width={32} height={32} sx={{ borderRadius: 'md' }} />
          </Stack>
        </Stack>

        <Divider />

        {/* Row 2: Formatting Ribbon Skeleton */}
        <Box sx={{ height: 50, display: 'flex', alignItems: 'center', px: 3, gap: 2 }}>
          <Skeleton variant='rectangular' width={100} height={32} />
          <Divider orientation='vertical' sx={{ height: 20 }} />
          <Skeleton variant='circular' width={24} height={24} />
          <Skeleton variant='circular' width={24} height={24} />
          <Skeleton variant='circular' width={24} height={24} />
          <Divider orientation='vertical' sx={{ height: 20 }} />
          <Skeleton variant='rectangular' width={150} height={32} />
        </Box>
      </Sheet>

      <Box sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* 📋 Sidebar Skeleton */}
        <Box
          sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: { xs: 'none', md: 'block' },
            overflow: 'hidden',
            p: 2
          }}
        >
          <Skeleton variant='text' width={120} sx={{ mb: 2 }} />
          <Stack spacing={2} alignItems='center'>
            {[1, 2, 3].map((i) => (
              <Box key={i}>
                <Skeleton variant='rectangular' width={180} height={254} sx={{ borderRadius: 'sm', mb: 1 }} />
                <Skeleton variant='text' width={60} sx={{ mx: 'auto' }} />
              </Box>
            ))}
          </Stack>
        </Box>

        {/* 📄 Editor Workspace Skeleton */}
        <Box
          sx={{
            flexGrow: 1,
            bgcolor: 'background.level2',
            pt: 6,
            pb: 15,
            px: 4,
            overflowY: 'hidden', // Disable scroll for skeleton
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}
        >
          {/* Main Page Skeleton */}
          <Box
            sx={{
              width: '794px', // A4 width at 96 DPI approx
              height: '1123px', // A4 height
              bgcolor: 'background.surface',
              boxShadow: 'sm',
              p: '96px', // Standard editor padding
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Skeleton variant='text' width='60%' height={40} sx={{ mb: 4 }} /> {/* Heading */}
            <Skeleton variant='text' width='100%' />
            <Skeleton variant='text' width='90%' />
            <Skeleton variant='text' width='95%' />
            <Skeleton variant='text' width='80%' />
            <Skeleton variant='text' width='100%' sx={{ mt: 2 }} />
            <Skeleton variant='text' width='100%' />
            <Skeleton variant='text' width='85%' />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
