import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'
import { PublicRounded, AutoStoriesRounded, MenuBookRounded, TimelineRounded, Brightness4 } from '@mui/icons-material'
import { BrandLockup } from '../../Common/Brand/BrandMark'
import { frameShell, framePanel, frameTrack, frameFill, frameSolidChip, frameSoftChip, frameSegment, frameSegmentItem } from './frameStyles'

/**
 * The Study Center, drawn beside its components (ADR-035 §1, SITE-014).
 *
 * Every part maps to a file: the app bar to Header.js, the title row and the
 * Dashboard / Library segment to StudyCenter.js, the summary object to
 * TodayObject.js in its true order (readout, forecast strip, keys, the day's
 * progress edge), the deck rows to DeckRow.js on the §15.11 anatomy, the
 * sections to Due now · Up to date (Recent sits below at this width and is
 * left out). Nothing is drawn that the page does not show. Fixed sample content; the labels are the app's own keys.
 */
const NAV = [
  { key: 'public.browse', Icon: PublicRounded },
  { key: 'header.study', Icon: AutoStoriesRounded, active: true },
  { key: 'header.books', Icon: MenuBookRounded },
  { key: 'annualPlanning.title', Icon: TimelineRounded }
]
const DECKS = [
  { key: 'chem', cards: 212, mastery: 62, due: 18 },
  { key: 'jp', cards: 340, mastery: 41, due: 9 },
  { key: 'kant', cards: 96, mastery: 88, due: 3 }
]
const UP_TO_DATE = { key: 'algebra', cards: 150, mastery: 30 }
const TODAY = { due: 30, fresh: 4, reviewed: 12, streak: 12 }
const PAST = [18, 24, 9, 31, 12, 20]
const FUTURE = [6, 14, 3, 9, 5, 4, 0]
const DAYS = ['T', 'F', 'S', 'S', 'M', 'T', 'W']

const Readout = ({ children, sx = {} }) => (
  <Typography level='body-xs' sx={{ color: 'text.tertiary', fontVariantNumeric: 'tabular-nums', ...sx }}>
    {children}
  </Typography>
)

/** ForecastStrip.js: seven reviewed days · hairline · today · seven due days. */
const Strip = ({ t }) => {
  const asked = TODAY.due + TODAY.fresh
  const max = Math.max(...PAST, asked, ...FUTURE)
  const height = (v) => (v > 0 ? Math.max(3, Math.round((v / max) * 26)) : 3)
  const cell = (key, v, bg, label, outlined = false, emphasis = false) => (
    <Stack key={key} alignItems='center' spacing={0.5} sx={{ width: 12 }}>
      <Box sx={{ height: 26, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
        <Box
          sx={{
            width: '100%',
            height: height(v),
            borderRadius: 'xs',
            bgcolor: bg,
            border: outlined ? '1px solid' : 0,
            borderColor: 'divider',
            boxSizing: 'border-box'
          }}
        />
      </Box>
      <Typography
        level='body-xs'
        sx={{ fontSize: '0.5rem', color: emphasis ? 'text.primary' : 'text.tertiary', fontWeight: emphasis ? 'lg' : 'md' }}
      >
        {label}
      </Typography>
    </Stack>
  )
  return (
    <Stack direction='row' spacing={0.5} alignItems='flex-end'>
      {PAST.map((v, i) => cell(`p${i}`, v, 'background.level3', DAYS[i]))}
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.25 }} />
      {cell('today', asked, 'primary.solidBg', t('study.today.todayInitial'), false, true)}
      {FUTURE.map((v, i) => cell(`f${i}`, v, 'primary.softBg', DAYS[(i + 1) % 7], true))}
    </Stack>
  )
}

/** DeckRow.js: tile · name and meta · measure + mastery % · status · action. */
const DeckRow = ({ t, deck, upToDate = false }) => (
  <Stack direction='row' alignItems='center' spacing={1.5} sx={{ minHeight: 44, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ width: 14, height: 14, borderRadius: 'sm', bgcolor: 'primary.solidBg', flexShrink: 0 }} />
    <Stack sx={{ flex: 1, minWidth: 0 }}>
      <Typography level='body-xs' sx={{ color: 'text.primary', fontWeight: 'md' }} noWrap>
        {t(`landing.frames.studyCenter.decks.${deck.key}`)}
      </Typography>
      <Readout>{t('cards.manage_content.cardCount', { count: deck.cards })}</Readout>
    </Stack>
    <Stack direction='row' alignItems='center' spacing={1} sx={{ flexShrink: 0 }}>
      <Box sx={{ ...frameTrack, width: 56 }}>
        <Box sx={frameFill(deck.mastery)} />
      </Box>
      <Readout sx={{ width: 30, textAlign: 'right' }}>{deck.mastery}%</Readout>
    </Stack>
    <Readout
      sx={{
        width: 72,
        textAlign: 'right',
        whiteSpace: 'nowrap',
        color: upToDate ? 'text.tertiary' : 'text.primary',
        fontWeight: upToDate ? 'sm' : 'md'
      }}
    >
      {upToDate ? t('study.deck.upToDate') : t('study.dueCount', { count: deck.due })}
    </Readout>
    <Box sx={{ width: 56, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
      {!upToDate && (
        <Typography level='body-xs' sx={{ ...frameSoftChip, fontWeight: 'lg' }}>
          {t('study.deck.study')}
        </Typography>
      )}
    </Box>
  </Stack>
)

const SectionHead = ({ title, readout }) => (
  <Stack direction='row' alignItems='baseline' spacing={1} sx={{ mb: 0.5 }}>
    <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
      {title}
    </Typography>
    {readout && <Readout>{readout}</Readout>}
  </Stack>
)

const StudyCenterFrame = ({ sx = {} }) => {
  const { t } = useTranslation()
  const asked = TODAY.due + TODAY.fresh
  const total = asked + TODAY.reviewed

  return (
    <Box aria-hidden sx={{ ...frameShell, ...sx }}>
      {/* Header.js, signed in: the lockup, the four items, the theme toggle, the avatar — on the page ground (SITE-011). */}
      <Stack
        direction='row'
        alignItems='center'
        spacing={1.5}
        sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}
      >
        <BrandLockup markSize={20} level='title-sm' />
        <Stack direction='row' spacing={0.25} sx={{ display: { xs: 'none', sm: 'flex' }, ml: 0.5 }}>
          {NAV.map(({ key, Icon, active }) => (
            <Stack
              key={key}
              direction='row'
              alignItems='center'
              spacing={0.5}
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 'sm',
                bgcolor: active ? 'background.level1' : 'transparent',
                color: active ? 'text.primary' : 'text.secondary'
              }}
            >
              <Icon sx={{ fontSize: 'sm' }} />
              <Typography level='body-xs' sx={{ color: 'inherit', fontWeight: active ? 'lg' : 'md' }}>
                {t(key)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Brightness4 sx={{ fontSize: 'sm', color: 'text.secondary' }} />
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: 'full',
            bgcolor: 'background.level2',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder'
          }}
        />
      </Stack>

      <Stack spacing={1.5} sx={{ p: 2 }}>
        {/* StudyCenter.js: the title on the left rail, the view segment on the right. */}
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography level='title-lg' sx={{ color: 'text.primary' }}>
            {t('study.title')}
          </Typography>
          <Box sx={frameSegment}>
            <Typography level='body-xs' sx={frameSegmentItem(true, true)}>
              {t('study.views.dashboard')}
            </Typography>
            <Typography level='body-xs' sx={frameSegmentItem(false, false)}>
              {t('study.views.library')}
            </Typography>
          </Box>
        </Stack>

        {/* TodayObject.js */}
        <Stack spacing={1.25} sx={{ ...framePanel, border: 0, p: 1.75 }}>
          <Stack direction='row' alignItems='flex-start' spacing={2}>
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction='row' alignItems='baseline' spacing={1}>
                <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 'lg' }}>
                  {t('study.today.title')}
                </Typography>
                <Readout>{t('landing.frames.studyCenter.date')}</Readout>
              </Stack>
              <Readout sx={{ color: 'text.secondary' }}>
                <Box component='span' sx={{ color: 'text.primary', fontWeight: 'md' }}>
                  {t('study.dueCount', { count: TODAY.due })}
                </Box>
                {' · '}
                {t('study.deck.newCount', { count: TODAY.fresh })} · {t('study.today.reviewed', { count: TODAY.reviewed })} ·{' '}
                <Box component='span' sx={{ color: 'warning.plainColor' }}>
                  ▲
                </Box>{' '}
                {t('study.empty.streakLabel', { count: TODAY.streak })}
              </Readout>
            </Stack>
            <Stack direction='row' alignItems='flex-end' spacing={2} sx={{ flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}>
              <Stack alignItems='flex-end' spacing={0.5}>
                <Strip t={t} />
                <Readout sx={{ fontSize: '0.6rem' }}>
                  {t('study.today.weekReadout', {
                    reviewed: PAST.reduce((a, b) => a + b, 0),
                    tomorrow: FUTURE[0],
                    week: FUTURE.reduce((a, b) => a + b, 0)
                  })}
                </Readout>
              </Stack>
              <Stack direction='row' spacing={0.75}>
                <Typography level='body-xs' sx={{ ...frameSoftChip, fontWeight: 'lg' }}>
                  {t('study.today.quick', { count: 10 })}
                </Typography>
                <Typography level='body-xs' sx={{ ...frameSolidChip, fontWeight: 'lg' }}>
                  {t('study.today.study', { count: asked })}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
          <Box sx={frameTrack}>
            <Box sx={frameFill(Math.round((TODAY.reviewed / total) * 100))} />
          </Box>
          <Readout sx={{ fontSize: '0.6rem' }}>{t('study.today.progress', { done: TODAY.reviewed, total })}</Readout>
        </Stack>

        {/* The lists: Due now and Up to date. At this width the real page stacks Recent below (its two columns start at lg), so the frame ends here. */}
        <Stack>
          <SectionHead
            title={t('study.sections.dueNow')}
            readout={t('study.sections.decksReadout', { decks: DECKS.length, cards: DECKS.reduce((a, d) => a + d.cards, 0) })}
          />
          {DECKS.map((deck) => (
            <DeckRow key={deck.key} t={t} deck={deck} />
          ))}
          <Box sx={{ height: 12 }} />
          <SectionHead title={t('study.sections.upToDate')} readout={t('study.sections.deckCount', { count: 1 })} />
          <DeckRow t={t} deck={UP_TO_DATE} upToDate />
        </Stack>
      </Stack>
    </Box>
  )
}

export default StudyCenterFrame
