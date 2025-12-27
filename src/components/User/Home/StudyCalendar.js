import React, { useState, useEffect } from 'react'
import { Box, Typography, Sheet, Stack, Chip, CircularProgress } from '@mui/joy'
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

  if (loading) {
    return (
      <Sheet variant='soft' sx={{ p: 3, borderRadius: 'md', textAlign: 'center' }}>
        <CircularProgress />
      </Sheet>
    )
  }

  return (
    <Sheet variant='soft' sx={{ p: 3, borderRadius: 'md' }}>
      <Typography level='title-md' sx={{ mb: 3, fontWeight: 'bold' }}>
        🎯 Rendimiento reciente
      </Typography>

      <Stack spacing={2}>
        {recentPerformance.length === 0 ? (
          <Typography level='body-sm' sx={{ color: 'neutral.500', textAlign: 'center', py: 3 }}>
            No hay datos todavía. ¡Empieza a estudiar para ver tu progreso!
          </Typography>
        ) : (
          recentPerformance.map((item, index) => (
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
                <Typography level='body-sm' sx={{ fontWeight: '600', color: 'text.primary' }}>
                  {item.date}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'neutral.600', mt: 0.5 }}>
                  {item.card_title}
                </Typography>
              </Box>
              <Chip size='sm' variant='soft' color={getScoreColor(item.score)}>
                {item.score}
              </Chip>
            </Box>
          ))
        )}

        {streak > 0 && (
          <Chip variant='soft' color={streak >= 3 ? 'success' : 'neutral'} sx={{ alignSelf: 'flex-start', mt: 2 }}>
            🔥 Racha actual: {streak} día{streak !== 1 ? 's' : ''}
          </Chip>
        )}
      </Stack>
    </Sheet>
  )
}

// Helper function to get color based on score
function getScoreColor(scoreString) {
  const score = parseInt(scoreString.split(' / ')[0])
  if (score >= 8) return 'success'
  if (score >= 6) return 'primary'
  if (score >= 4) return 'warning'
  return 'danger'
}
