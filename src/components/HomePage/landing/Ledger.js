import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import {
  StyleRounded,
  AutoStoriesRounded,
  TrackChangesRounded,
  CalendarMonthRounded,
  TimerRounded,
  PublicRounded,
  GridOnRounded,
  PhoneIphoneRounded
} from '@mui/icons-material'

/** The eight places to work, in the order of the app's navigation (PRD D3). */
const PLACES = [
  { key: 'study', Icon: StyleRounded },
  { key: 'books', Icon: AutoStoriesRounded },
  { key: 'planning', Icon: TrackChangesRounded },
  { key: 'calendar', Icon: CalendarMonthRounded },
  { key: 'focus', Icon: TimerRounded },
  { key: 'library', Icon: PublicRounded },
  { key: 'sheets', Icon: GridOnRounded },
  { key: 'phone', Icon: PhoneIphoneRounded }
]

/**
 * A ledger of what the account holds: one row per place, an icon tile on
 * `level1` (never a status colour — ADR-035 §3), a name and one line. Rows are
 * a list, so the hairlines between them are the one place the page draws a rule.
 */
const Ledger = () => {
  const { t } = useTranslation()

  return (
    <Box component='section' id='library' aria-labelledby='landing-ledger-title' sx={{ py: { xs: 6, md: 10 } }}>
      <Typography id='landing-ledger-title' level='h2' sx={{ color: 'text.primary', mb: { xs: 3, md: 5 } }}>
        {t('landing.ledger.title')}
      </Typography>

      <Box
        component='ul'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
          columnGap: 8
        }}
      >
        {PLACES.map(({ key, Icon }) => (
          <Stack
            component='li'
            key={key}
            direction='row'
            spacing={2}
            alignItems='flex-start'
            sx={{ py: 2.5, borderTop: '1px solid', borderColor: 'divider' }}
          >
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 'md',
                bgcolor: 'background.level1',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon fontSize='small' />
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography level='title-md' component='h3' sx={{ color: 'text.primary' }}>
                {t(`landing.ledger.${key}.title`)}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t(`landing.ledger.${key}.desc`)}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Box>
    </Box>
  )
}

export default Ledger
