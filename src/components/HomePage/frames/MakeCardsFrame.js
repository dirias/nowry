import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { CheckRounded } from '@mui/icons-material'
import { frameShell, frameSolidChip } from './frameStyles'

/** The Make cards sheet (MakeCardsSheet.js), drawn: sections as a checklist with words · cards · changed, the budget line, the one solid. */
const ROWS = [
  { key: 'membrane', words: '980', cards: 0, changed: false, checked: false },
  { key: 'mitochondria', words: '1,240', cards: 8, changed: true, checked: true },
  { key: 'chain', words: '1,510', cards: 0, changed: false, checked: true }
]

const MakeCardsFrame = ({ sx = {} }) => {
  const { t } = useTranslation()
  const picked = ROWS.filter((r) => r.checked).length

  return (
    <Box aria-hidden sx={{ ...frameShell, bgcolor: 'background.surface', minHeight: { sm: 220 }, flex: 1, p: 2, gap: 0.75, ...sx }}>
      <Stack direction='row' alignItems='baseline' spacing={1}>
        <Typography level='title-sm' sx={{ color: 'text.primary', flexShrink: 0 }}>
          {t('books.makeCards.title')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }} noWrap>
          {t('books.makeCards.subtitle', { title: t('landing.frames.section.document'), count: 6 })}
        </Typography>
      </Stack>
      {ROWS.map((row) => (
        <Stack
          key={row.key}
          direction='row'
          spacing={1}
          alignItems='flex-start'
          sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: 'xs',
              flexShrink: 0,
              mt: 0.25,
              border: '1.5px solid',
              borderColor: row.checked ? 'primary.solidBg' : 'neutral.outlinedBorder',
              bgcolor: row.checked ? 'primary.solidBg' : 'transparent',
              color: 'primary.solidColor',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {row.checked && <CheckRounded sx={{ fontSize: '0.6rem' }} />}
          </Box>
          <Stack sx={{ minWidth: 0 }}>
            <Typography level='body-xs' sx={{ color: 'text.primary', fontWeight: 'md' }}>
              {t(`landing.frames.makeCards.${row.key}`)}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.6rem', fontVariantNumeric: 'tabular-nums' }}>
              {t('books.makeCards.words', { count: Number(row.words.replace(',', '')), words: row.words })} ·{' '}
              {row.cards > 0 ? t('books.makeCards.cards', { count: row.cards }) : t('books.makeCards.noCards')}
              {row.changed ? ` · ${t('books.makeCards.changed')}` : ''}
            </Typography>
          </Stack>
        </Stack>
      ))}
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ mt: 'auto' }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.6rem' }}>
          {t('books.makeCards.budgetPro', { cards: 12, sections: picked })}
        </Typography>
        <Typography level='body-xs' sx={{ ...frameSolidChip, fontWeight: 'lg', fontSize: '0.6rem' }}>
          {t('books.makeCards.action', { count: picked })}
        </Typography>
      </Stack>
    </Box>
  )
}

export default MakeCardsFrame
