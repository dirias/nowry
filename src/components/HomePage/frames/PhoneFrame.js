import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { CheckRounded } from '@mui/icons-material'
import { BrandLockup } from '../../Common/Brand/BrandMark'
import { frameShell, framePanel, frameTrack, frameFill, frameSoftChip, frameSegment, frameSegmentItem } from './frameStyles'

/**
 * Home on the phone, drawn beside app/(tabs)/index.js (SITE-014): the app bar
 * with the lockup, the greeting with its caption and the review key, then the
 * day panel — the routine's periods and Tasks as one segment, the progress
 * readout, the rows. Nothing else is on that screen.
 */
const TASKS = [
  { key: 'review', done: true },
  { key: 'read', done: false },
  { key: 'run', done: false }
]
const DUE = 21

const PhoneFrame = ({ sx = {} }) => {
  const { t } = useTranslation()
  const done = TASKS.filter((x) => x.done).length

  return (
    <Box aria-hidden sx={{ ...frameShell, width: 260, borderRadius: 'xl', p: 1.75, gap: 1.5, ...sx }}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ color: 'text.primary' }}>
        <BrandLockup markSize={18} level='title-sm' />
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 'full',
            bgcolor: 'background.level2',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder'
          }}
        />
      </Stack>

      <Stack direction='row' spacing={1} alignItems='flex-start' justifyContent='space-between'>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography level='title-md' sx={{ color: 'text.primary' }}>
            {t('dashboard.welcome', { name: t('landing.frames.phone.name') })}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {t('landing.frames.phone.caption')}
          </Typography>
        </Stack>
        <Typography level='body-xs' sx={{ ...frameSoftChip, fontWeight: 'lg', flexShrink: 0 }}>
          {t('dashboard.dailyFocus.reviewCount', { count: DUE })}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ ...framePanel, borderRadius: 'lg', p: 1.5 }}>
        <Box sx={{ ...frameSegment, alignSelf: 'flex-start' }}>
          {['morning', 'afternoon', 'evening'].map((period, i) => (
            <Typography key={period} level='body-xs' sx={{ ...frameSegmentItem(false, i === 0), fontSize: '0.6rem' }}>
              {t(`annualPlanning.dailyRoutine.short.${period}`)}
            </Typography>
          ))}
          <Typography level='body-xs' sx={{ ...frameSegmentItem(true, false), fontSize: '0.6rem' }}>
            {t('tasks.title')} · {TASKS.length}
          </Typography>
        </Box>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.6rem', fontVariantNumeric: 'tabular-nums' }}>
          {t('tasks.progress.label', { done, total: TASKS.length })}
        </Typography>
        <Box sx={frameTrack}>
          <Box sx={frameFill((done / TASKS.length) * 100)} />
        </Box>
        <Stack>
          {TASKS.map(({ key, done: isDone }) => (
            <Stack
              key={key}
              direction='row'
              alignItems='center'
              spacing={1.25}
              sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 'full',
                  border: '1.5px solid',
                  borderColor: isDone ? 'primary.solidBg' : 'neutral.outlinedBorder',
                  bgcolor: isDone ? 'primary.solidBg' : 'transparent',
                  color: 'primary.solidColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isDone && <CheckRounded sx={{ fontSize: 'xs' }} />}
              </Box>
              <Typography
                level='body-xs'
                sx={{ color: isDone ? 'text.tertiary' : 'text.primary', textDecoration: isDone ? 'line-through' : 'none' }}
              >
                {t(`landing.frames.phone.tasks.${key}`)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

export default PhoneFrame
