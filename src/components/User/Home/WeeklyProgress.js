import React, { useState, useEffect } from 'react'
import { Box, Typography, Sheet, CircularProgress } from '@mui/joy'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cardsService } from '../../../api/services'

export default function WeeklyProgress() {
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const stats = await cardsService.getStatistics()
      setWeeklyData(stats.weekly_progress || [])
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

  const maxCards = Math.max(...weeklyData.map((d) => d.cards), 1)

  return (
    <Sheet variant='soft' sx={{ p: 3, borderRadius: 'md' }}>
      <Typography level='title-md' sx={{ mb: 3, fontWeight: 'bold' }}>
        📊 Progreso semanal
      </Typography>

      <ResponsiveContainer width='100%' height={250}>
        <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
          <XAxis dataKey='day' tick={{ fontSize: 12 }} stroke='#888' />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke='#888'
            domain={[0, maxCards + 2]}
            label={{ value: 'Tarjetas', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '8px'
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Line type='monotone' dataKey='cards' stroke='#0B6BCB' strokeWidth={3} dot={{ r: 5, fill: '#0B6BCB' }} />
        </LineChart>
      </ResponsiveContainer>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
          Total esta semana: <strong>{weeklyData.reduce((sum, d) => sum + d.cards, 0)} tarjetas</strong>
        </Typography>
      </Box>
    </Sheet>
  )
}
