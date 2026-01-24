import React, { useState, useEffect } from 'react'
import { Box, Stack, Chip, LinearProgress, Typography, IconButton, Drawer, List, ListItem, ListItemButton } from '@mui/joy'
import { MenuBook, Close, Schedule } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

/**
 * SmartNavigation - Futuristic floating navigation for flow-based reading
 *
 * Features:
 * - Current section indicator
 * - Reading progress bar
 * - Estimated reading time
 * - TOC drawer (mobile-friendly)
 */

export default function SmartNavigation({ toc = [], readingTime = 0, bookTitle = '' }) {
  const { t } = useTranslation()
  const [showTOC, setShowTOC] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState('Introduction')

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))

      // Detect current section based on scroll position
      if (toc.length > 0) {
        const currentHeadings = toc.filter((heading) => {
          const element = document.querySelector(`[data-lexical-editor] [data-key="${heading.id}"]`)
          if (element) {
            const rect = element.getBoundingClientRect()
            return rect.top <= 200 // Within top 200px
          }
          return false
        })

        if (currentHeadings.length > 0) {
          setCurrentSection(currentHeadings[currentHeadings.length - 1].text)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial call

    return () => window.removeEventListener('scroll', handleScroll)
  }, [toc])

  const scrollToHeading = (headingId) => {
    const element = document.querySelector(`[data-lexical-editor] [data-key="${headingId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowTOC(false)
    }
  }

  return (
    <>
      {/* Fixed Progress Bar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, 
            var(--joy-palette-primary-500) 0%, 
            var(--joy-palette-primary-500) ${scrollProgress}%, 
            transparent ${scrollProgress}%)`,
          zIndex: 9999,
          transition: 'all 0.1s ease-out'
        }}
      />

      {/* Floating Smart Nav */}
      <Stack
        direction='row'
        spacing={1}
        alignItems='center'
        sx={{
          position: 'sticky',
          top: 100 /* Below the toolbar */,
          zIndex: 100,
          mx: 'auto',
          maxWidth: '210mm' /* Match A4 width */,
          backdropFilter: 'blur(20px)',
          background: 'rgba(var(--joy-palette-background-surface-rgb), 0.98)',
          border: '1px solid',
          borderColor: 'divider',
          p: 1.5,
          borderRadius: 'xl',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          mb: 3,
          animation: 'slideDown 0.3s ease-out',
          '@keyframes slideDown': {
            from: {
              opacity: 0,
              transform: 'translateY(-10px)'
            },
            to: {
              opacity: 1,
              transform: 'translateY(0)'
            }
          }
        }}
      >
        {/* TOC Button */}
        <Chip
          startDecorator={<MenuBook />}
          onClick={() => setShowTOC(true)}
          variant='soft'
          color='primary'
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 'md'
            }
          }}
        >
          <Typography level='body-sm' sx={{ display: { xs: 'none', sm: 'block' } }}>
            {currentSection.substring(0, 30)}
            {currentSection.length > 30 ? '...' : ''}
          </Typography>
          <Typography level='body-sm' sx={{ display: { xs: 'block', sm: 'none' } }}>
            TOC
          </Typography>
        </Chip>

        {/* Progress Bar */}
        <LinearProgress
          determinate
          value={scrollProgress}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 'sm',
            background: 'background.level2',
            '& .MuiLinearProgress-indicator': {
              background: 'linear-gradient(90deg, var(--joy-palette-primary-400), var(--joy-palette-primary-600))'
            }
          }}
        />

        {/* Reading Time */}
        <Chip
          startDecorator={<Schedule />}
          variant='outlined'
          size='sm'
          sx={{
            fontWeight: 600
          }}
        >
          {readingTime} min
        </Chip>
      </Stack>

      {/* TOC Drawer */}
      <Drawer
        anchor='right'
        open={showTOC}
        onClose={() => setShowTOC(false)}
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.4)'
            }
          },
          content: {
            sx: {
              width: { xs: '85%', sm: '400px' },
              maxWidth: '400px',
              background: 'background.surface',
              p: 0
            }
          }
        }}
      >
        {/* Header */}
        <Stack
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction='row' alignItems='center' spacing={1}>
            <MenuBook color='primary' />
            <Typography level='title-lg' fontWeight={700}>
              {t('books.tableOfContents') || 'Table of Contents'}
            </Typography>
          </Stack>
          <IconButton variant='plain' onClick={() => setShowTOC(false)}>
            <Close />
          </IconButton>
        </Stack>

        {/* TOC List */}
        <List sx={{ p: 0 }}>
          {toc.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('books.noHeadings') || 'No headings yet'}
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1 }}>
                {t('books.useHeadings') || 'Use /h1, /h2, /h3 to create structure'}
              </Typography>
            </Box>
          ) : (
            toc.map((heading, index) => (
              <ListItem key={heading.id} sx={{ p: 0 }}>
                <ListItemButton
                  onClick={() => scrollToHeading(heading.id)}
                  sx={{
                    pl: 2 + heading.indent * 2,
                    py: 1.5,
                    borderLeft: heading.level === 'h1' ? '3px solid' : 'none',
                    borderColor: 'primary.500',
                    '&:hover': {
                      background: 'background.level1',
                      borderLeftColor: 'primary.600'
                    }
                  }}
                >
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Typography
                      level={heading.level === 'h1' ? 'title-md' : heading.level === 'h2' ? 'title-sm' : 'body-sm'}
                      fontWeight={heading.level === 'h1' ? 700 : heading.level === 'h2' ? 600 : 500}
                    >
                      {heading.text}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {heading.level.toUpperCase()}
                    </Typography>
                  </Stack>
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Drawer>
    </>
  )
}
