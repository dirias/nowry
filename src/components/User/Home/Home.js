import React from 'react'
import { Box, Grid, Typography, Container } from '@mui/joy'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import DailyFocus from './DailyFocus'
import { MotivationBanner } from './MotivationBanner'
import WeeklyProgress from './WeeklyProgress'
import StudyCalendar from './StudyCalendar'

function Home() {
  const username = localStorage.getItem('username')

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h2' fontWeight={700} sx={{ mb: 0.5 }}>
          👋 Welcome back, {username}!
        </Typography>
        <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
          Here&apos;s your learning overview for today
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

      {/* Middle Row - Daily Focus & Motivation */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} lg={8}>
          <DailyFocus />
        </Grid>
        <Grid xs={12} lg={4}>
          <MotivationBanner />
        </Grid>
      </Grid>

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
