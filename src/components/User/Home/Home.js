import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Typography, Container, IconButton, Tooltip } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import FocusBar from './FocusBar'
import OnboardingSurfaces from './OnboardingSurfaces'
import SideMenu from './SideMenu'
import NewsCarousel from './NewsCarousel'
import TodayObject from '../../Study/TodayObject'
import { useTodayData } from '../../Study/useTodayData'
import { useTaskData } from '@nowry/core/hooks/useTaskData'
import { useDailyRoutine } from '@nowry/core/hooks/useDailyRoutine'
import { routineProgress } from '@nowry/core/domain/dailyRoutine'
import StudyCalendar from './StudyCalendar'
import BlackboardModal from '../../Blackboard/BlackboardModal'
import { useAuth } from '@nowry/core/context/AuthContext'

function Home() {
  const { user } = useAuth()
  const username = user?.username
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [blackboardOpen, setBlackboardOpen] = useState(false)

  const motivationPhrase = useMemo(() => {
    const phrases = t('motivation.phrases', { returnObjects: true })
    const phraseList = Array.isArray(phrases) ? phrases : ['Keep learning!']
    return phraseList[Math.floor(Math.random() * phraseList.length)]
  }, [t])

  // The same study numbers the Study Center shows (SITE-013), plus the day's
  // tasks and routine: Home's object says the day across domains (SITE-015).
  const today = useTodayData()
  const { tasks } = useTaskData()
  const { routine } = useDailyRoutine()
  const tasksToday = useMemo(() => {
    const open = tasks.filter((task) => !task.is_completed).length
    return { open, done: tasks.length - open }
  }, [tasks])
  const routineToday = useMemo(() => routineProgress(routine), [routine])

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 3 } }}>
      {/*
        Home's onboarding surfaces (ONB-012/ONB-023, ADR-007/ADR-024). One
        `GET /users/onboarding` decides between them: re-entry belongs to an
        incomplete journey, next steps to an activated one, and the server
        guarantees at most one is offered. Both are silent while that read is in
        flight, so nothing below waits on them, and neither ever opens
        onboarding by itself.
      */}
      <OnboardingSurfaces />

      {/* Header — the greeting. The "N due" pill that sat on the right was a
          clickable Box a keyboard could not reach and a duplicate of the Today
          object's Study key below (SITE-013). */}
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
            <Typography level='h3' fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.2 }}>
              {t('dashboard.welcome', { name: username })}
            </Typography>
            <Typography
              level='body-sm'
              sx={{
                color: 'text.secondary',
                fontWeight: 'normal',
                // Static xs (12), below body-sm's own 14px default: a secondary
                // motivational caption beneath the welcome message, mobile-first.
                fontSize: 'xs'
              }}
            >
              {motivationPhrase}
            </Typography>
          </Box>
          {/* Calendar Icon */}
          <Tooltip title={t('calendarModal.tooltip')} size='sm' placement='bottom'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              onClick={() => navigate('/calendar')}
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
          {/* Blackboard Icon */}
          <Tooltip title={t('blackboard.tooltip', 'Open Blackboard')} size='sm' placement='bottom'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              onClick={() => setBlackboardOpen(true)}
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
              <PsychologyRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Focus Bar - Goals + Priorities at a glance */}
      <FocusBar />

      {/* The summary object, full width under the band (ADR-021, SITE-015): the day across domains. */}
      <TodayObject
        variant='home'
        loading={today.loading}
        dueToday={today.dueToday}
        newToday={today.newToday}
        reviewedToday={today.reviewedToday}
        streak={today.streak}
        totalCards={today.totalCards}
        weekly={today.weekly}
        forecast={today.forecast}
        tasksToday={tasksToday}
        routine={routineToday}
        onStudy={() => navigate('/study/daily-review')}
        onQuick={() => navigate('/study/daily-review?limit=10')}
        onBrowse={() => navigate('/study?view=library')}
        onCreateDeck={() => navigate('/study?view=library&new=deck')}
        onBrowseDecks={() => navigate('/browse')}
        onImport={() => navigate('/study?view=library&new=import')}
      />

      {/* Top Row - News & Tasks */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid xs={12} md={8} sx={{ order: { xs: 2, md: 1 } }}>
          <NewsCarousel />
        </Grid>
        <Grid xs={12} md={4} sx={{ order: { xs: 1, md: 2 } }}>
          <SideMenu />
        </Grid>
      </Grid>

      {/* Bottom Row - Calendar */}
      <Grid container spacing={2}>
        <Grid xs={12}>
          <StudyCalendar />
        </Grid>
      </Grid>

      {/* Blackboard Modal */}
      <BlackboardModal open={blackboardOpen} onClose={() => setBlackboardOpen(false)} />
    </Container>
  )
}

export default Home
