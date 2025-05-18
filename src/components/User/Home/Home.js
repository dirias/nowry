import React from 'react'
import { Box, Grid, Typography } from '@mui/joy'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import DailyFocus from './DailyFocus'
import { MotivationBanner } from './MotivationBanner'
import WeeklyProgress from './WeeklyProgress'
import StudyCalendar from './StudyCalendar'

function Home() {
  const username = localStorage.getItem('username')

  return (
    <Box sx={{ px: 4, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level='h3' sx={{ fontWeight: 'lg', color: 'primary.500' }}>
          Welcome back, {username}!
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid xs={12} md={4}>
          <SideMenu />
        </Grid>
        <Grid xs={12} md={8}>
          <NewsCarousel />
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid xs={12} md={6}>
          <DailyFocus />
        </Grid>
        <Grid xs={12} md={6}>
          <MotivationBanner />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid xs={12} md={6}>
          <WeeklyProgress />
        </Grid>
        <Grid xs={12} md={6}>
          <StudyCalendar />
        </Grid>
      </Grid>
    </Box>
  )
}

export default Home
