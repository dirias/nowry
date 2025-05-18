/* eslint-disable react/react-in-jsx-scope */
// components/MotivationBanner.js
import { Typography, Sheet } from '@mui/joy'

const phrases = [
  '¡Un poco cada día te acerca a la fluidez!',
  'Hoy es un gran día para aprender algo nuevo.',
  'Estudiar un poco ahora te ahorra mucho después.',
  'Constancia es más importante que perfección.',
  'Tu esfuerzo de hoy se convierte en progreso mañana.'
]

export function MotivationBanner() {
  const phrase = phrases[Math.floor(Math.random() * phrases.length)]
  return (
    <Sheet
      variant='soft'
      sx={{
        p: 3,
        textAlign: 'center',
        borderRadius: 'md',
        backgroundColor: 'warning.softBg',
        boxShadow: 'sm'
      }}
    >
      <Typography level='body-md' fontWeight='lg' color='warning.800'>
        {phrase}
      </Typography>
    </Sheet>
  )
}
