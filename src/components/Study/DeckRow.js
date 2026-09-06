import React from 'react'
import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { identityTile, listRow, measureFill, measureTrack, oneLine, readout, tabularNums } from '../Common/Form/formStyles'
import { deckType } from './deckTypes'

/**
 * One deck as one row (ADR-021 §15.11, PRD D3 / US-002): tile · name with a
 * meta line · measure · readout · action. The dashboard's two groups and the
 * library's list view draw this same row; the library's grid tile is the same
 * five parts stacked.
 *
 * The due count is the one load-bearing number and the only thing in
 * `text.primary` at weight md; nothing else in the row competes with it. An
 * all-new deck draws an empty track and "New" — never a full grey bar. Study
 * and Browse both act on the deck, so both are `sm` secondaries of one shape;
 * the row's solid is never on the row (it is on the Today object).
 */
export default function DeckRow({ deck, onStudy, onBrowse, formatRelativeDate, trailing = null }) {
  const { t } = useTranslation()
  const type = deckType(deck.deck_type)
  const due = deck.due_cards || 0
  const fresh = deck.new_cards || 0
  const mastery = deck.mastery || 0
  const allNew = (deck.total_cards || 0) > 0 && deck.total_cards === fresh
  const asked = due + fresh
  const lastStudied = deck.last_studied ? formatRelativeDate?.(new Date(deck.last_studied)) : null
  const meta = [t(type.labelKey), t('cards.manage_content.cardCount', { count: deck.total_cards || 0 }), lastStudied]
    .filter(Boolean)
    .join(' · ')

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
  } else if (deck.is_due_soon && deck.hours_until_due != null) {
    status = <span>{t('study.deck.dueIn', { hours: deck.hours_until_due })}</span>
  } else {
    status = <span>{t('study.deck.upToDate')}</span>
  }

  return (
    <Box data-testid='deck-row' sx={listRow}>
      <Box aria-hidden='true' sx={identityTile(type.color)} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='title-sm' sx={oneLine}>
          {deck.name}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', ...oneLine }}>
          {meta}
        </Typography>
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25, width: 110, flexShrink: 0 }} aria-hidden='true'>
        <Box sx={measureTrack}>
          <Box sx={measureFill(allNew ? 0 : mastery, type.color)} />
        </Box>
        <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', width: 34, textAlign: 'right' }}>
          {allNew ? t('study.deckPill.new') : `${mastery}%`}
        </Typography>
      </Box>
      <Typography
        level='body-sm'
        sx={{ ...readout, color: 'text.secondary', width: { xs: 'auto', sm: 110 }, textAlign: 'right', flexShrink: 0, ...tabularNums }}
      >
        {status}
      </Typography>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, width: 84, justifyContent: 'flex-end', flexShrink: 0 }}>
        {asked > 0 ? (
          <Button
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => onStudy(deck)}
            aria-label={t('study.deckPill.ariaLabel', { name: deck.name })}
          >
            {t('study.deck.study')}
          </Button>
        ) : (
          <Button
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => onBrowse(deck)}
            aria-label={t('study.deck.browseAria', { name: deck.name })}
          >
            {t('study.deck.browse')}
          </Button>
        )}
      </Box>
      {trailing}
    </Box>
  )
}
