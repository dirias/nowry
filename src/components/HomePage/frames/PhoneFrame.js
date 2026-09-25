import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { CheckRounded } from '@mui/icons-material'
import { BrandLockup } from '../../Common/Brand/BrandMark'
import { CompanionMark } from '../../Agent/CompanionMark'
import { frameShell, framePanel, frameTrack, frameFill, frameSolidChip } from './frameStyles'

const TASKS = [
  { key: 'review', done: true },
  { key: 'read', done: false },
  { key: 'run', done: false }
]
const PROGRESS = { done: 1, total: 3 }
const DUE_DECKS = 2

/**
 * Home on the phone, drawn: the lockup and the companion, the date and the
 * greeting, the day panel with its measure and three rows, the Study chip, and
 * the Focus dial. 260px wide, the width the phone client draws it at.
 */
const PhoneFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, width: 260, borderRadius: 'xl', p: 1.75, gap: 1.5, ...sx }}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ color: 'text.primary' }}>
        <BrandLockup markSize={18} level='title-sm' />
        <Box sx={{ color: 'primary.plainColor' }}>
          <CompanionMark stage={3} mood='idle' size={22} />
        </Box>
      </Stack>

      <Stack spacing={0.25}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('landing.frames.phone.date')}
        </Typography>
        <Typography level='title-md' sx={{ color: 'text.primary' }}>
          {t('landing.frames.phone.greeting')}
        </Typography>
      </Stack>

      <Box sx={{ ...framePanel, borderRadius: 'lg', p: 1.5 }}>
        <Stack direction='row' justifyContent='space-between'>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {t('landing.frames.phone.today')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {t('landing.frames.phone.progress', PROGRESS)}
          </Typography>
        </Stack>
        <Box sx={{ ...frameTrack, mt: 1 }}>
          <Box sx={frameFill((PROGRESS.done / PROGRESS.total) * 100)} />
        </Box>
        <Stack sx={{ mt: 0.5 }}>
          {TASKS.map(({ key, done }) => (
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
                  borderColor: done ? 'primary.solidBg' : 'neutral.outlinedBorder',
                  bgcolor: done ? 'primary.solidBg' : 'transparent',
                  color: 'primary.solidColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {done && <CheckRounded sx={{ fontSize: 'xs' }} />}
              </Box>
              <Typography
                level='body-xs'
                sx={{ color: done ? 'text.tertiary' : 'text.primary', textDecoration: done ? 'line-through' : 'none' }}
              >
                {t(`landing.frames.phone.tasks.${key}`)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Stack direction='row' alignItems='center' spacing={1.25} sx={{ ...framePanel, borderRadius: 'lg', p: 1.5 }}>
        <Typography level='body-xs' sx={frameSolidChip}>
          {t('landing.frames.studyCenter.chipLabel')} · 21
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
          {t('landing.frames.phone.due', { count: DUE_DECKS })}
        </Typography>
      </Stack>

      <Box sx={{ ...framePanel, borderRadius: 'lg', p: 1.5 }}>
        <Typography level='body-xs' sx={{ color: 'text.primary' }}>
          {t('landing.frames.phone.focus')}
        </Typography>
        <Stack direction='row' alignItems='center' spacing={1.25} sx={{ mt: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 'full',
              border: '3px solid',
              borderColor: 'background.level2',
              borderTopColor: 'primary.solidBg',
              flexShrink: 0
            }}
          />
          <Typography level='title-md' sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
            18:24
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

export default PhoneFrame
