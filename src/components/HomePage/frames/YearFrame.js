import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { frameShell, frameTrack, frameFill, frameSegment, frameSegmentItem } from './frameStyles'

/** OverviewTabView + FocusAreaCard.js: the plan's name with its quarter, and the area cards on the row anatomy (SITE-012). */
const AREAS = [
  { key: 'bio', icon: '🧬', pct: 62, goals: 4 },
  { key: 'jp', icon: '🗾', pct: 40, goals: 2 },
  { key: 'health', icon: '🏃', pct: 80, goals: 3 }
]

const YearFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box
      aria-hidden
      sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 0.75, ...sx }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={1}>
        <Typography level='title-sm' sx={{ color: 'text.primary' }}>
          {t('annualPlanning.myPlan')}
        </Typography>
        <Box sx={frameSegment}>
          <Typography level='body-xs' sx={{ ...frameSegmentItem(true, true), fontSize: '0.6rem', py: 0.25 }}>
            Q3
          </Typography>
          <Typography level='body-xs' sx={{ ...frameSegmentItem(false, false), fontSize: '0.6rem', py: 0.25 }}>
            {t('landing.frames.year.all')}
          </Typography>
        </Box>
      </Stack>
      {AREAS.map(({ key, icon, pct, goals }) => (
        <Stack key={key} spacing={0.5} sx={{ px: 1, py: 0.75, borderRadius: 'sm', border: '1px solid', borderColor: 'divider' }}>
          <Stack direction='row' alignItems='center' spacing={0.75}>
            <Typography level='body-xs' component='span' sx={{ lineHeight: 1 }}>
              {icon}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.primary', fontWeight: 'md' }}>
              {t(`landing.frames.year.areas.${key}`)}
            </Typography>
          </Stack>
          <Stack direction='row' alignItems='center' spacing={1}>
            <Box sx={{ ...frameTrack, flex: 1 }}>
              <Box sx={frameFill(pct)} />
            </Box>
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', fontSize: '0.6rem', width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            >
              {pct}%
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
              {t('annualPlanning.overview.areaGoalCount', { count: goals })}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Box>
  )
}

export default YearFrame
