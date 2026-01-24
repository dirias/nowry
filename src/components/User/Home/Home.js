import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Typography, Container, Button } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import FocusBar from './FocusBar'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import WeeklyProgress from './WeeklyProgress'
import StudyCalendar from './StudyCalendar'
import { useAuth } from '../../../context/AuthContext'
import { cardsService, decksService } from '../../../api/services'

function Home() {
  const { user } = useAuth()
  const username = user?.username
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [studyStats, setStudyStats] = useState({ dueCount: 0, loading: true })

  const motivationPhrase = useMemo(() => {
    const phrases = t('motivation.phrases', { returnObjects: true })
    const phraseList = Array.isArray(phrases) ? phrases : ['Keep learning!']
    return phraseList[Math.floor(Math.random() * phraseList.length)]
  }, [t])

  useEffect(() => {
    loadStudyStats()
  }, [])

  const loadStudyStats = async () => {
    try {
      const [cardsData] = await Promise.all([cardsService.getAll()])

      // Filter cards that are due today
      const now = new Date()
      const dueCards = cardsData.filter((card) => {
        if (!card.next_review) return true // New cards
        const nextReview = new Date(card.next_review)
        return nextReview <= now
      })

      setStudyStats({ dueCount: dueCards.length, loading: false })
    } catch (error) {
      console.error('Error loading study stats:', error)
      setStudyStats({ dueCount: 0, loading: false })
    }
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 3 } }}>
      {/* Header - Welcome + Study Status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: { xs: 2, md: 3 },
          gap: { xs: 2, md: 3 },
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Welcome Message */}
        <Box sx={{ flex: 1, minWidth: { xs: 200, md: 250 } }}>
          <Typography level='h3' fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.2, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            {t('dashboard.welcome', { name: username })}
          </Typography>
          <Typography
            level='body-sm'
            sx={{
              color: 'text.secondary',
              fontWeight: 'normal',
              fontSize: { xs: '0.75rem', md: '0.875rem' }
            }}
          >
            {motivationPhrase}
          </Typography>
        </Box>

        {/* Right: Study Status - Minimalist Clickable */}
        {!studyStats.loading && studyStats.dueCount > 0 && (
          <Box
            onClick={() => navigate('/study')}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              px: { xs: 2, md: 2.5 },
              py: { xs: 1.25, md: 1.5 },
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: 'primary.outlinedBorder',
                bgcolor: 'background.level1',
                '& .arrow-icon': {
                  transform: 'translateX(4px)',
                  opacity: 1
                }
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box
              sx={{
                fontSize: '1.5rem',
                lineHeight: 1,
                opacity: 0.9
              }}
            >
              📚
            </Box>
            <Typography
              level='title-md'
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.3,
                flex: 1
              }}
            >
              {t('dashboard.dailyFocus.reviewCount', { count: studyStats.dueCount })}
            </Typography>
            <Box
              className='arrow-icon'
              sx={{
                fontSize: '1.25rem',
                color: 'text.tertiary',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                opacity: 0.5
              }}
            >
              →
            </Box>
          </Box>
        )}

        {/* All Caught Up State */}
        {!studyStats.loading && studyStats.dueCount === 0 && (
          <Box
            sx={{
              textAlign: 'right'
            }}
          >
            <Typography level='h3' fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.2, fontSize: { xs: '1rem', md: '1.5rem' } }}>
              {t('dashboard.dailyFocus.allCaughtUp')}
            </Typography>
            <Typography
              level='body-sm'
              sx={{
                color: 'text.secondary',
                fontWeight: 'normal',
                fontSize: { xs: '0.7rem', md: '0.875rem' },
                pt: 0.5,
                pb: 0.5,
                borderBottom: '1px solid',
                borderColor: 'success.outlinedBorder',
                display: { xs: 'none', sm: 'inline-block' }
              }}
            >
              {t('dashboard.dailyFocus.noDueCards')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Focus Bar - Goals + Priorities at a glance */}
      <FocusBar />

      {/* Top Row - News & Tasks */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid xs={12} md={8} sx={{ order: { xs: 2, md: 1 } }}>
          <NewsCarousel />
        </Grid>
        <Grid xs={12} md={4} sx={{ order: { xs: 1, md: 2 } }}>
          <SideMenu />
        </Grid>
      </Grid>

      {/* Bottom Row - Weekly Progress & Calendar */}
      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <WeeklyProgress />
        </Grid>
        <Grid xs={12} md={6}>
          <StudyCalendar />
        </Grid>
      </Grid>
    </Container>
  )
}

export default Home
