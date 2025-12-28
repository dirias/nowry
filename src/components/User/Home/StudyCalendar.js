import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Stack, Chip, CircularProgress } from '@mui/joy'
import { cardsService } from '../../../api/services'

export default function StudyCalendar() {
  const [recentPerformance, setRecentPerformance] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const stats = await cardsService.getStatistics()
      setRecentPerformance(stats.recent_performance || [])
      setStreak(stats.summary?.current_streak || 0)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'success'
    if (score >= 5) return 'warning'
    return 'danger'
  }

  const getTypeInfo = (type) => {
    switch (type) {
      case 'quiz':
        return { color: 'warning', icon: '❓', label: 'Quiz' }
      case 'visual':
        return { color: 'info', icon: '🎨', label: 'Visual' }
      case 'book':
        return { color: 'success', icon: '📚', label: 'Book' }
      default:
        return { color: 'primary', icon: '📇', label: 'Flashcard' }
    }
  }

  if (loading) {
    return (
      <Card variant='outlined' sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 350 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined' sx={{ height: '100%' }}>
      <CardContent>
        <Typography level='title-lg' fontWeight={600} sx={{ mb: 3 }}>
          🎯 Recent Performance
        </Typography>

        <Stack spacing={2}>
          {recentPerformance.length === 0 ? (
            <Typography level='body-sm' sx={{ color: 'neutral.500', textAlign: 'center', py: 3 }}>
              No activity yet. Start studying to see your progress!
            </Typography>
          ) : (
            recentPerformance.map((item, index) => {
              const typeInfo = getTypeInfo(item.type)
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 'sm',
                    backgroundColor: 'background.level1',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'background.level2',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                      <Typography level='body-sm' sx={{ fontWeight: '600', color: 'text.primary' }}>
                        {item.date}
                      </Typography>
                      <Chip size='sm' variant='soft' color={typeInfo.color}>
                        {typeInfo.icon} {typeInfo.label}
                      </Chip>
                    </Stack>
                    <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                      {item.card_title}
                    </Typography>
                  </Box>
                  <Chip size='sm' variant='soft' color={getScoreColor(item.score)}>
                    {item.score}/10
                  </Chip>
                </Box>
              )
            })
          )}

          {streak > 0 && (
            <Chip variant='soft' color={streak >= 3 ? 'success' : 'neutral'} sx={{ alignSelf: 'flex-start', mt: 2 }}>
              🔥 Current streak: {streak} day{streak !== 1 ? 's' : ''}
            </Chip>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
