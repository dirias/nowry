import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Card, CardContent, Stack, Chip, CircularProgress } from '@mui/joy'
import { cardsService } from '../../../api/services'

export default function StudyCalendar() {
  const { t } = useTranslation()
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
        return { color: 'warning', icon: '❓', label: t('calendar.types.quiz') }
      case 'visual':
        return { color: 'info', icon: '🎨', label: t('calendar.types.visual') }
      case 'book':
        return { color: 'success', icon: '📚', label: t('calendar.types.book') }
      default:
        return { color: 'primary', icon: '📇', label: t('calendar.types.flashcard') }
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
          🎯 {t('calendar.title')}
        </Typography>

        <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
          <Stack spacing={2}>
            {recentPerformance.length === 0 ? (
              <Typography level='body-sm' sx={{ color: 'neutral.500', textAlign: 'center', py: 3 }}>
                {t('calendar.noActivity')}
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
          </Stack>
        </Box>

        {streak > 0 && (
          <Chip variant='soft' color={streak >= 3 ? 'success' : 'neutral'} sx={{ alignSelf: 'flex-start' }}>
            {t('calendar.streak', { count: streak })}
          </Chip>
        )}
      </CardContent>
    </Card>
  )
}
