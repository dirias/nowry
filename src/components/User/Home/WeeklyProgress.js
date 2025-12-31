import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Card, CardContent, CircularProgress, Stack, Chip } from '@mui/joy'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cardsService } from '../../../api/services'

export default function WeeklyProgress() {
  const { t } = useTranslation()
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const stats = await cardsService.getStatistics()
      let weeklyData = stats.weekly_progress || []

      // Fallback: If old format (just 'cards'), convert to new format
      weeklyData = weeklyData.map((day) => {
        if (day.cards !== undefined && day.flashcards === undefined) {
          // Old format - distribute evenly or treat all as flashcards
          return {
            ...day,
            flashcards: day.cards || 0,
            quizzes: 0,
            visual: 0,
            books: 0
          }
        }
        return day
      })

      setWeeklyData(weeklyData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setLoading(false)
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

  // Calculate totals for each type
  const totals = {
    flashcards: weeklyData.reduce((sum, d) => sum + (d.flashcards || 0), 0),
    quizzes: weeklyData.reduce((sum, d) => sum + (d.quizzes || 0), 0),
    visual: weeklyData.reduce((sum, d) => sum + (d.visual || 0), 0),
    books: weeklyData.reduce((sum, d) => sum + (d.books || 0), 0)
  }
  const totalAll = totals.flashcards + totals.quizzes + totals.visual + totals.books

  return (
    <Card variant='outlined' sx={{ height: '100%' }}>
      <CardContent>
        <Typography level='title-lg' fontWeight={600} sx={{ mb: 3 }}>
          📊 {t('weekly.title')}
        </Typography>

        <ResponsiveContainer width='100%' height={250}>
          <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
            <XAxis dataKey='day' tick={{ fontSize: 12 }} stroke='#888' />
            <YAxis tick={{ fontSize: 12 }} stroke='#888' label={{ value: 'Items', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--joy-palette-background-surface)',
                border: '1px solid var(--joy-palette-divider)',
                borderRadius: '8px',
                padding: '8px',
                color: 'var(--joy-palette-text-primary)'
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line type='monotone' dataKey='flashcards' stroke='#0B6BCB' name='Flashcards' strokeWidth={2} dot={{ r: 4 }} />
            <Line type='monotone' dataKey='quizzes' stroke='#F57C00' name='Quizzes' strokeWidth={2} dot={{ r: 4 }} />
            <Line type='monotone' dataKey='visual' stroke='#0288D1' name='Visual' strokeWidth={2} dot={{ r: 4 }} />
            <Line type='monotone' dataKey='books' stroke='#388E3C' name='Books' strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction='row' spacing={2} flexWrap='wrap'>
            <Chip size='sm' variant='soft' color='primary'>
              📇 {t('weekly.types.flashcards')}: {totals.flashcards}
            </Chip>
            <Chip size='sm' variant='soft' color='warning'>
              ❓ {t('weekly.types.quizzes')}: {totals.quizzes}
            </Chip>
            <Chip size='sm' variant='soft' color='info'>
              🎨 {t('weekly.types.visual')}: {totals.visual}
            </Chip>
            <Chip size='sm' variant='soft' color='success'>
              📚 {t('weekly.types.books')}: {totals.books}
            </Chip>
            <Chip size='sm' variant='solid'>
              {t('weekly.total')}: {totalAll}
            </Chip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
