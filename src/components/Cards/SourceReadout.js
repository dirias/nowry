import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Link, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { focusRing, readout } from '../Common/Form/formStyles'

/**
 * Where a card came from (docs/prd-book-cards.md D7, D12, D13; BOOK-004).
 *
 * "from N3 Grammar · Particles" as a readout under the question in a session,
 * and as a link on the Struggling group's rows — the reward end of the loop:
 * a card the learner keeps failing reopens the notes it was made from. A
 * document that was deleted keeps the readout and loses the link (D12); the
 * editor resolves a renamed section itself (D13), so the link carries the
 * heading's text, not its ordinal.
 */
export const sectionHref = (card) => {
  const base = `/book/${card.source_book_id}`
  const heading = card.source_section?.heading
  return heading ? `${base}?section=${encodeURIComponent(heading)}` : base
}

export default function SourceReadout({ card, link = false, sx = {} }) {
  const { t } = useTranslation()
  if (!card?.source_book_id) return null
  const document = card.source_book_title || ''
  const section = card.source_section?.heading || null

  if (card.source_book_deleted) {
    return (
      <Typography level='body-sm' sx={{ ...readout, ...sx }}>
        {t('cards.session.source.deleted')}
      </Typography>
    )
  }

  const text = section ? t('cards.session.source.from', { document, section }) : t('cards.session.source.fromDocument', { document })
  if (!link) {
    return (
      <Typography level='body-sm' sx={{ ...readout, ...sx }}>
        {text}
      </Typography>
    )
  }
  // Inside a row that is itself a button, so the click and the keys stay here.
  const stop = (event) => event.stopPropagation()
  return (
    <Link
      component={RouterLink}
      to={sectionHref(card)}
      level='body-sm'
      onClick={stop}
      onKeyDown={stop}
      aria-label={t('cards.session.source.openAria', { document, section: section || document })}
      sx={{ ...readout, ...focusRing, alignSelf: 'flex-start' }}
    >
      {text}
    </Link>
  )
}
