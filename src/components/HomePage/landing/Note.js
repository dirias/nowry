import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { CompanionMark } from '../../Agent/CompanionMark'

/**
 * The early-access note (PRD D5): what About used to be, in one paragraph, and
 * the one place on the public site where the Spiral companion is introduced.
 * The companion wears the accent's plain colour, as it does in the app.
 */
const Note = () => {
  const { t } = useTranslation()

  return (
    <Box
      component='section'
      aria-labelledby='landing-note-title'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '96px minmax(0, 1fr) auto' },
        alignItems: 'center',
        columnGap: 4,
        rowGap: 3,
        py: { xs: 6, md: 10 }
      }}
    >
      <Box sx={{ color: 'primary.plainColor' }}>
        <CompanionMark stage={5} mood='happy' size={96} />
      </Box>
      <Stack spacing={1} sx={{ maxWidth: 620 }}>
        <Typography id='landing-note-title' level='h3' sx={{ color: 'text.primary' }}>
          {t('landing.note.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('landing.note.body')}
        </Typography>
      </Stack>
      <Box>
        <Button component={Link} to='/register' size='lg'>
          {t('landing.note.cta')}
        </Button>
      </Box>
    </Box>
  )
}

export default Note
