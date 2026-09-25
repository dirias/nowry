import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { CATEGORY_COLORS } from '@nowry/core/tokens/colorSystem'
import { frameShell, frameTrack, frameFill } from './frameStyles'

const WEEK = 39
const AREAS = [
  { key: 'bio', pct: 62, category: 0 },
  { key: 'jp', pct: 40, category: 3 },
  { key: 'health', pct: 80, category: 5 }
]

/**
 * The year plan, drawn: the plan's title with the week readout, one measure
 * for the year, and three focus areas each with its category dot (the one
 * family a learner tags with, ADR-034) and its measure.
 */
const YearFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 1.5, ...sx }}>
      <Stack direction='row' justifyContent='space-between' alignItems='baseline' spacing={1}>
        <Typography level='title-sm' sx={{ color: 'text.primary' }}>
          {t('landing.frames.year.title')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.frames.year.week', { week: WEEK })}
        </Typography>
      </Stack>
      <Box sx={frameTrack}>
        <Box sx={frameFill((WEEK / 52) * 100)} />
      </Box>
      {AREAS.map(({ key, pct, category }) => (
        <Stack key={key} spacing={0.75}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Stack direction='row' alignItems='center' spacing={1}>
              <Box sx={{ width: 8, height: 8, borderRadius: 'full', bgcolor: CATEGORY_COLORS[category] }} />
              <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                {t(`landing.frames.year.areas.${key}`)}
              </Typography>
            </Stack>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums' }}>
              {pct}%
            </Typography>
          </Stack>
          <Box sx={frameTrack}>
            <Box sx={{ ...frameFill(pct), bgcolor: CATEGORY_COLORS[category] }} />
          </Box>
        </Stack>
      ))}
    </Box>
  )
}

export default YearFrame
