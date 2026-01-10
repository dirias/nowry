import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Typography, Container } from '@mui/joy'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import DailyFocus from './DailyFocus'
import WeeklyProgress from './WeeklyProgress'
import StudyCalendar from './StudyCalendar'
import { useAuth } from '../../../context/AuthContext'

function Home() {
  const { user } = useAuth()
  const username = user?.username
  const { t } = useTranslation()

  const motivationPhrase = useMemo(() => {
    const phrases = t('motivation.phrases', { returnObjects: true })
    const phraseList = Array.isArray(phrases) ? phrases : ['Keep learning!']
    return phraseList[Math.floor(Math.random() * phraseList.length)]
  }, [t])

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h2' fontWeight={600} sx={{ mb: 0.5 }}>
          {t('dashboard.welcome', { name: username })}
        </Typography>
        <Typography level='title-md' sx={{ color: 'text.secondary', fontWeight: 'normal' }}>
          {motivationPhrase}
        </Typography>
      </Box>

      {/* Top Row - News & Quick Access */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} md={8}>
          <NewsCarousel />
        </Grid>
        <Grid xs={12} md={4}>
          <SideMenu />
        </Grid>
      </Grid>

      {/* Middle Row - Daily Focus (Full Width) */}
      <Box sx={{ mb: 3 }}>
        <DailyFocus />
      </Box>

      {/* Bottom Row - Weekly Progress & Recent Performance */}
      <Grid container spacing={3}>
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
