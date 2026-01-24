import React, { useState, useEffect } from 'react'
import { Box, Stack, Typography, Chip, LinearProgress, Divider, List, ListItem, ListItemButton } from '@mui/joy'
import { Clock, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * ContentNavigator - Minimalistic left sidebar TOC
 *
 * Design: Futuristic, clean, no noise
 * Following DESIGN_GUIDELINES.md
 */

export default function ContentNavigator({ toc = [], readingTime = 0 }) {
  const { t } = useTranslation()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState(null)

  // Track scroll progress
  useEffect(() => {
    // Get the scroll container (not window!)
    const scrollContainer = document.querySelector('.editor-scroll-container')
    if (!scrollContainer) {
      console.warn('Scroll container not found')
      return
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight
      const maxScroll = scrollHeight - clientHeight
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))

      // Detect current section based on scroll position
      if (toc.length > 0) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const visibleHeadings = toc.filter((heading) => {
          const headings = document.querySelectorAll('.editor-content h1, .editor-content h2, .editor-content h3')
          for (const h of headings) {
            if (h.textContent.trim() === heading.text.trim()) {
              const rect = h.getBoundingClientRect()
              // Check if heading is in the top portion of the viewport
              return rect.top >= containerRect.top && rect.top <= containerRect.top + 300
            }
          }
          return false
        })

        if (visibleHeadings.length > 0) {
          setCurrentSection(visibleHeadings[0].id)
        }
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll() // Initial call

    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [toc])

  const scrollToHeading = (headingId) => {
    const scrollContainer = document.querySelector('.editor-scroll-container')
    if (!scrollContainer) {
      console.warn('Scroll container not found')
      return
    }

    // Find the heading by text content
    const heading = toc.find((h) => h.id === headingId)
    if (!heading) {
      console.warn('Heading not found in TOC:', headingId)
      return
    }

    const allHeadings = document.querySelectorAll('.editor-content h1, .editor-content h2, .editor-content h3')
    let targetElement = null

    for (const h of allHeadings) {
      if (h.textContent.trim() === heading.text.trim()) {
        targetElement = h
        break
      }
    }

    if (targetElement) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const elementRect = targetElement.getBoundingClientRect()
      const scrollTop = scrollContainer.scrollTop
      const offset = 100 // Offset from top

      const targetScrollTop = scrollTop + (elementRect.top - containerRect.top) - offset

      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })

      console.log('✅ Scrolling to:', heading.text)
    } else {
      console.warn('Could not find heading element:', heading.text)
    }
  }

  return (
    <Stack
      spacing={3}
      sx={{
        width: '100%',
        height: '100%',
        p: 3,
        overflowY: 'auto',
        overflowX: 'hidden',
        bgcolor: 'background.surface',
        '&::-webkit-scrollbar': {
          width: '4px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'divider',
          borderRadius: '8px'
        }
      }}
    >
      {/* Header - Minimal */}
      <Stack spacing={1.5}>
        <Typography level='body-xs' textTransform='uppercase' letterSpacing='0.1em' fontWeight={600} sx={{ color: 'text.tertiary' }}>
          {t('books.tableOfContents')}
        </Typography>

        {/* Reading Stats - Compact */}
        <Stack direction='row' spacing={1} alignItems='center'>
          <Chip
            size='sm'
            variant='soft'
            startDecorator={<Clock size={14} />}
            sx={{
              fontSize: 'xs',
              fontWeight: 500,
              bgcolor: 'background.level1',
              color: 'text.secondary'
            }}
          >
            {readingTime} min
          </Chip>
          <Chip
            size='sm'
            variant='soft'
            startDecorator={<BookOpen size={14} />}
            sx={{
              fontSize: 'xs',
              fontWeight: 500,
              bgcolor: 'background.level1',
              color: 'text.secondary'
            }}
          >
            {toc.length} sections
          </Chip>
        </Stack>

        {/* Progress Bar - Sleek */}
        <Box>
          <LinearProgress
            determinate
            value={scrollProgress}
            size='sm'
            sx={{
              height: 2,
              bgcolor: 'background.level1',
              '& .MuiLinearProgress-indicator': {
                background: 'linear-gradient(90deg, var(--joy-palette-primary-400), var(--joy-palette-primary-600))'
              }
            }}
          />
          <Typography
            level='body-xs'
            sx={{
              color: 'text.tertiary',
              mt: 0.5,
              fontSize: '0.7rem'
            }}
          >
            {Math.round(scrollProgress)}% read
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1 }} />

      {/* TOC List - Clean */}
      {toc.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', fontSize: 'xs' }}>
            {t('books.noHeadings')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1, fontSize: '0.7rem' }}>
            {t('books.useHeadings')}
          </Typography>
        </Box>
      ) : (
        <List size='sm' sx={{ p: 0, '--List-gap': '0px' }}>
          {toc.map((heading) => {
            const isActive = currentSection === heading.id
            const isH1 = heading.level === 'h1'
            const isH3 = heading.level === 'h3'

            return (
              <ListItem key={heading.id} sx={{ p: 0 }}>
                <ListItemButton
                  onClick={() => scrollToHeading(heading.id)}
                  sx={{
                    pl: isH3 ? 3 : isH1 ? 1 : 2,
                    py: 0.75,
                    borderLeft: isActive ? '2px solid' : '2px solid transparent',
                    borderColor: isActive ? 'primary.500' : 'transparent',
                    bgcolor: isActive ? 'background.level1' : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'background.level1',
                      borderLeftColor: 'primary.300'
                    }
                  }}
                >
                  <Typography
                    level={isH1 ? 'body-sm' : 'body-xs'}
                    fontWeight={isH1 ? 600 : isActive ? 500 : 400}
                    sx={{
                      color: isActive ? 'text.primary' : 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: isH1 ? '0.875rem' : isH3 ? '0.75rem' : '0.8125rem'
                    }}
                  >
                    {heading.text}
                  </Typography>
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      )}
    </Stack>
  )
}
