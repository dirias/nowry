import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { focusRing, identityTile, measureFill, measureTrack, oneLine, readout, tabularNums } from '../Common/Form/formStyles'
import { deckType } from '../Study/deckTypes'
import { MOTION } from '../../theme/tokens'

/**
 * The library's grid tile: the deck row's five parts stacked into three lines
 * (ADR-021 §15.11, PRD D3 / US-003). Nothing is added — no hero, no gradient,
 * no tilt, no per-tile button. The tile is content on `surface`; hover is a
 * `level1` ground at `quick` and the kebab appears with it. Click studies when
 * something is due and browses otherwise, the same as the row's action.
 */
export default function DeckTile({ deck, onStudy, onBrowse, actions }) {
  const { t } = useTranslation()
  const type = deckType(deck.deck_type)
  const due = deck.due_cards || 0
  const fresh = deck.new_cards || 0
  const asked = due + fresh
  const mastery = deck.mastery || 0
  const allNew = (deck.total_cards || 0) > 0 && deck.total_cards === fresh
  const open = () => (asked > 0 ? onStudy(deck) : onBrowse(deck))

  let status
  if (asked > 0) {
    status = (
      <>
        {due > 0 && (
          <Typography component='span' level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
            {t('study.dueCount', { count: due })}
          </Typography>
        )}
        {due > 0 && fresh > 0 && <span aria-hidden='true'> · </span>}
        {fresh > 0 && <span>{t('study.deck.newCount', { count: fresh })}</span>}
      </>
    )
  } else {
    status = <span>{t('study.deck.upToDate')}</span>
  }

  return (
    <Box
      role='button'
      tabIndex={0}
      data-testid='deck-tile'
      aria-label={t(asked > 0 ? 'study.deckPill.ariaLabel' : 'study.deck.browseAria', { name: deck.name })}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      sx={{
        borderRadius: 'md',
        bgcolor: 'background.surface',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 96,
        cursor: 'pointer',
        transition: `background-color ${MOTION.duration.quick}ms ${MOTION.easing.standard}`,
        '&:hover, &:focus-within': { bgcolor: 'background.level1' },
        '& .deck-tile-actions': { opacity: { xs: 1, md: 0 } },
        '&:hover .deck-tile-actions, &:focus-within .deck-tile-actions': { opacity: 1 },
        ...focusRing
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box aria-hidden='true' sx={identityTile(type.color)} />
        <Typography level='title-sm' sx={{ flex: 1, minWidth: 0, ...oneLine }}>
          {deck.name}
        </Typography>
        <Box
          className='deck-tile-actions'
          sx={{ mr: -1, my: -1, transition: `opacity ${MOTION.duration.quick}ms ${MOTION.easing.standard}` }}
        >
          {actions}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...oneLine }}>
          {t(type.labelKey)} · {t('cards.manage_content.cardCount', { count: deck.total_cards || 0 })}
        </Typography>
        <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary', flexShrink: 0, ...tabularNums }}>
          {status}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }} aria-hidden='true'>
        <Box sx={{ ...measureTrack, width: 'auto', flex: 1 }}>
          <Box sx={measureFill(allNew ? 0 : mastery, type.color)} />
        </Box>
        <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', width: 34, textAlign: 'right' }}>
          {allNew ? t('study.deckPill.new') : `${mastery}%`}
        </Typography>
      </Box>
    </Box>
  )
}
