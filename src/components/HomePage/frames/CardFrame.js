import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { frameShell } from './frameStyles'

const COUNTER = { current: 12, total: 30 }

/**
 * The four grade keys as StudySession.js draws them — Again outlined danger,
 * Hard soft warning, Good soft success, Easy solid primary — the one recorded
 * exception to the house button's single solid (buttonSpec on both clients).
 */
const GRADES = [
  { key: 'again', sx: { border: '1px solid', borderColor: 'danger.outlinedBorder', color: 'danger.plainColor' } },
  { key: 'hard', sx: { bgcolor: 'warning.softBg', color: 'warning.softColor' } },
  { key: 'good', sx: { bgcolor: 'success.softBg', color: 'success.softColor' } },
  { key: 'easy', sx: { bgcolor: 'primary.solidBg', color: 'primary.solidColor' } }
]

/** A study card, drawn beside StudySession.js: the counter, the SourceReadout, the prompt, the answer, the four keys. */
const CardFrame = ({ answered = true, sx = {} }) => {
  const { t } = useTranslation()

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', aspectRatio: { xs: 'auto', sm: '4 / 3' }, p: 2, gap: 1, ...sx }}>
      <Stack direction='row' justifyContent='space-between' spacing={1}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
          {t('cards.session.card', COUNTER)}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }} noWrap>
          {t('cards.session.source.from', { document: t('landing.frames.section.document'), section: t('landing.frames.section.heading') })}
        </Typography>
      </Stack>
      <Typography level='title-sm' sx={{ color: 'text.primary' }}>
        {t('landing.frames.card.prompt')}
      </Typography>
      {answered && (
        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
          {t('landing.frames.card.answer')}
        </Typography>
      )}
      <Stack direction='row' spacing={0.75} sx={{ mt: 'auto' }}>
        {GRADES.map(({ key, sx: tone }) => (
          <Typography
            key={key}
            level='body-xs'
            sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 'sm', fontWeight: 'lg', boxSizing: 'border-box', ...tone }}
          >
            {t(`cards.session.grading.${key}`)}
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

export default CardFrame
