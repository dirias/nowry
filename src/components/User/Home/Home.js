import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Typography, Container, Button, IconButton, Tooltip, Skeleton } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import FocusBar from './FocusBar'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import WeeklyProgress from './WeeklyProgress'
import StudyCalendar from './StudyCalendar'
import CalendarModal from '../../Calendar/CalendarModal'
import { useAuth } from '../../../context/AuthContext'
import { cardsService, decksService } from '../../../api/services'
import { useCardData } from '../../../hooks/useCardData'

function Home() {
  const { user } = useAuth()
  const username = user?.username
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [studyStats, setStudyStats] = useState({ dueCount: 0, loading: true })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const motivationPhrase = useMemo(() => {
    const phrases = t('motivation.phrases', { returnObjects: true })
    const phraseList = Array.isArray(phrases) ? phrases : ['Keep learning!']
    return phraseList[Math.floor(Math.random() * phraseList.length)]
  }, [t])

  const { cards, loading: cardsLoading } = useCardData()

  useEffect(() => {
    if (cardsLoading) return

    // Filter cards that are due today
    const now = new Date()
    const dueCards = cards.filter((card) => {
      if (!card.next_review) return true // New cards
      const nextReview = new Date(card.next_review)
      return nextReview <= now
    })

    setStudyStats({ dueCount: dueCards.length, loading: false })
  }, [cards, cardsLoading])

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
        {/* Left: Welcome Message + Calendar Icon */}
        <Box sx={{ flex: 1, minWidth: { xs: 200, md: 250 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1 }}>
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
          {/* Calendar Icon – minimalistic */}
          <Tooltip title={t('calendarModal.tooltip')} size='sm' placement='bottom'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              onClick={() => setCalendarOpen(true)}
              sx={{
                '--IconButton-size': '32px',
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: 'background.level1',
                  borderColor: 'primary.outlinedBorder'
                }
              }}
            >
              <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right: Study Stats - Single ternary keeps header stable at all states */}
        {studyStats.loading ? (
          <Skeleton variant='rectangular' width={120} height={32} sx={{ borderRadius: 'sm', flexShrink: 0 }} />
        ) : studyStats.dueCount > 0 ? (
          <Box
            onClick={() => navigate('/study/daily-review')}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              px: 1.25,
              py: 0,
              height: '32px',
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: 'primary.outlinedBorder',
                bgcolor: 'background.level1',
                '& .arrow-icon': {
                  transform: 'translateX(3px)',
                  opacity: 1
                }
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box sx={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.9 }}>📚</Box>
            <Typography level='body-sm' sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1 }}>
              {t('dashboard.dailyFocus.reviewCount', { count: studyStats.dueCount })}
            </Typography>
            <Box
              className='arrow-icon'
              sx={{ fontSize: '0.875rem', color: 'text.tertiary', lineHeight: 1, transition: 'all 0.2s ease', opacity: 0.5 }}
            >
              →
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'right' }}>
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

      {/* Calendar Modal */}
      <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </Container>
  )
}

export default Home
