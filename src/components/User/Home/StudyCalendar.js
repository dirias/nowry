/* eslint-disable react/react-in-jsx-scope */
// components/StudyCalendar.js
import { Box, Typography, Sheet, Stack, Chip, LinearProgress } from '@mui/joy'

const today = new Date()
const goal = 10 // tarjetas diarias
const last7Days = Array.from({ length: 7 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - i)
  return {
    date: date.toISOString().split('T')[0],
    completed: Math.floor(Math.random() * 15) // simulate tarjetas estudiadas
  }
}).reverse()

const streak = last7Days.reduce((acc, day) => {
  if (day.completed >= goal) return acc + 1
  return 0
}, 0)

export default function StudyCalendar() {
  return (
    <Sheet variant='soft' sx={{ p: 3, borderRadius: 'md' }}>
      <Typography level='title-md' sx={{ mb: 2 }}>
        Rendimiento reciente
      </Typography>

      <Stack spacing={2}>
        {last7Days.map((day, index) => (
          <Box key={index}>
            <Typography level='body-sm' sx={{ mb: 0.5 }}>
              {new Date(day.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
            </Typography>
            <LinearProgress
              determinate
              value={(day.completed / goal) * 100}
              sx={{ height: 10, borderRadius: 'md' }}
              color={day.completed >= goal ? 'success' : 'warning'}
            />
            <Typography level='body-xs' sx={{ mt: 0.5 }}>
              {day.completed} / {goal} tarjetas
            </Typography>
          </Box>
        ))}

        <Chip variant='soft' color={streak >= 3 ? 'success' : 'neutral'} sx={{ alignSelf: 'flex-start', mt: 2 }}>
          🔥 Racha actual: {streak} día{streak !== 1 ? 's' : ''}
        </Chip>
      </Stack>
    </Sheet>
  )
}
