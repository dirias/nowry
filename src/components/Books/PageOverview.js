import React from 'react'
import { Plus } from 'lucide-react'
import { Box, Typography, Sheet, Stack, IconButton } from '@mui/joy'

export default function PageOverview({ pages, setActivePage, setContent, handleSavePage, activePage }) {
  const changeActivePage = (page) => {
    setActivePage(page)
    setContent(page.content)
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
        Páginas (Vista General)
      </Typography>

      <Stack spacing={2} alignItems='center'>
        {pages.map((page, index) => {
          const isActive = activePage?._id === page._id
          return (
            <Box
              key={index}
              onClick={() => changeActivePage(page)}
              sx={{
                border: '2px solid',
                borderColor: isActive ? 'primary.solidBg' : 'neutral.outlinedBorder',
                borderRadius: 'sm',
                cursor: 'pointer',
                backgroundColor: isActive ? 'primary.softBg' : 'background.body',
                width: 180,
                height: 240,
                display: 'flex',
                justifyContent: 'center',
                boxShadow: 'sm',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'md'
                }
              }}
            >
              <Box
                sx={{
                  backgroundColor: '#fff',
                  borderRadius: 'xs',
                  width: '92%',
                  height: '95%',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    color: 'text.primary',
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </Box>
            </Box>
          )
        })}

        <IconButton onClick={() => handleSavePage(null)} variant='soft' color='primary' size='sm' sx={{ alignSelf: 'center', mt: 2 }}>
          <Plus />
        </IconButton>
      </Stack>
    </Sheet>
  )
}
