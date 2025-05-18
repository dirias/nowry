/* eslint-disable react/react-in-jsx-scope */
import { Box, Typography, LinearProgress, Sheet } from '@mui/joy'

const data = [
  { day: 'Lun', value: 60 },
  { day: 'Mar', value: 80 },
  { day: 'Mié', value: 50 },
  { day: 'Jue', value: 70 },
  { day: 'Vie', value: 90 },
  { day: 'Sáb', value: 40 },
  { day: 'Dom', value: 30 }
]

export default function WeeklyProgress() {
  return (
    <Sheet variant='soft' sx={{ p: 3, borderRadius: 'md' }}>
      <Typography level='title-md' sx={{ mb: 2 }}>
        Progreso semanal
      </Typography>
      {data.map((item, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Typography level='body-sm' sx={{ mb: 0.5 }}>
            {item.day}
          </Typography>
          <LinearProgress determinate value={item.value} sx={{ height: 8, borderRadius: 'md' }} />
        </Box>
      ))}
    </Sheet>
  )
}
