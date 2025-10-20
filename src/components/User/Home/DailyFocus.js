import React from 'react'
import { Box, Typography, Button } from '@mui/joy'

const DailyFocus = ({ deck = 'Mandarín', pending = 5 }) => {
  return (
    <Box
      sx={{
        borderRadius: 'md',
        backgroundColor: 'primary.softBg',
        p: 2,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'sm'
      }}
    >
      <Box>
        <Typography level='title-sm' color='primary.800'>
          Hoy podrías repasar
        </Typography>
        <Typography level='title-md' fontWeight='lg'>
          {deck} — {pending} tarjetas pendientes
        </Typography>
      </Box>
      <Button variant='solid' color='primary' size='sm'>
        ¡Vamos!
      </Button>
    </Box>
  )
}

export default DailyFocus
