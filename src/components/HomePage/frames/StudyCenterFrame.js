import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { BrandLockup } from '../../Common/Brand/BrandMark'
import { CompanionMark } from '../../Agent/CompanionMark'
import { frameShell, framePanel, frameTrack, frameFill, frameSolidChip } from './frameStyles'

/** Fixed sample content: four decks, a week of sessions, one companion. */
const DECKS = [
  { key: 'chem', pct: 72, due: 18 },
  { key: 'jp', pct: 45, due: 9 },
  { key: 'kant', pct: 90, due: 3 },
  { key: 'algebra', pct: 30, due: 0 }
]
const WEEK = [40, 70, 55, 90, 30, 65, 50]
const TODAY = 3
const SUMMARY = { cards: 30, decks: 4, days: 12 }
const COMPANION = { stage: 5, turns: 2 }

/**
 * The Study Center, drawn (ADR-035 §1): the app bar with the lockup, the
 * summary object with its one solid, four deck rows with a measure each, the
 * week strip and the companion. The right column folds under the list below
 * `sm`, so the frame stays legible at 343px.
 */
const StudyCenterFrame = ({ sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, ...sx }}>
      <Stack
        direction='row'
        alignItems='center'
        spacing={2}
        sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.surface', color: 'text.primary' }}
      >
        <BrandLockup markSize={20} level='title-sm' />
        <Stack direction='row' spacing={1.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          {['study', 'books', 'plan', 'calendar'].map((item) => (
            <Typography key={item} level='body-xs' sx={{ color: item === 'study' ? 'text.primary' : 'text.tertiary' }}>
              {t(`landing.frames.studyCenter.nav.${item}`)}
            </Typography>
          ))}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ width: 20, height: 20, borderRadius: 'full', bgcolor: 'background.level2' }} />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 200px' },
          gap: 2,
          p: 2
        }}
      >
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Stack direction='row' alignItems='baseline' spacing={1.25}>
            <Typography level='title-md' sx={{ color: 'text.primary' }}>
              {t('landing.frames.studyCenter.title')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {t('landing.frames.studyCenter.date')}
            </Typography>
          </Stack>

          <Stack direction='row' alignItems='center' spacing={1.5} sx={{ ...framePanel, px: 1.5, py: 1.25 }}>
            <Typography level='body-xs' sx={frameSolidChip}>
              {t('landing.frames.studyCenter.chip', { count: SUMMARY.cards })}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary', minWidth: 0 }}>
              {t('landing.frames.studyCenter.readout', SUMMARY)}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ ...frameTrack, width: 72, display: { xs: 'none', sm: 'block' } }}>
              <Box sx={frameFill(60)} />
            </Box>
          </Stack>

          <Stack>
            {DECKS.map(({ key, pct, due }) => (
              <Stack
                key={key}
                direction='row'
                alignItems='center'
                spacing={1.5}
                sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Box sx={{ width: 16, height: 16, borderRadius: 'sm', bgcolor: 'primary.solidBg', flexShrink: 0 }} />
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='body-xs' sx={{ color: 'text.primary' }} noWrap>
                    {t(`landing.frames.studyCenter.decks.${key}`)}
                  </Typography>
                  <Box sx={{ ...frameTrack, width: '70%' }}>
                    <Box sx={frameFill(pct)} />
                  </Box>
                </Stack>
                <Typography
                  level='body-xs'
                  sx={{ color: 'text.tertiary', minWidth: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {due ? t('landing.frames.studyCenter.due', { count: due }) : t('landing.frames.studyCenter.upToDate')}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          <Box sx={{ ...framePanel, p: 1.5 }}>
            <Typography level='body-xs' sx={{ color: 'text.primary' }}>
              {t('landing.frames.studyCenter.week')}
            </Typography>
            <Stack direction='row' spacing={0.75} alignItems='flex-end' sx={{ height: 56, mt: 1.5 }}>
              {WEEK.map((h, i) => (
                <Box
                  key={i}
                  sx={{ flex: 1, height: `${h}%`, borderRadius: 'xs', bgcolor: i === TODAY ? 'primary.solidBg' : 'background.level2' }}
                />
              ))}
            </Stack>
          </Box>
          <Stack direction='row' alignItems='center' spacing={1.5} sx={{ ...framePanel, p: 1.5 }}>
            <Box sx={{ color: 'primary.plainColor' }}>
              <CompanionMark stage={COMPANION.stage} mood='happy' size={36} />
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography level='body-xs' sx={{ color: 'text.primary' }}>
                {t(`pet.stage.${COMPANION.stage}.name`)}
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {t('landing.frames.studyCenter.stage', COMPANION)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}

export default StudyCenterFrame
