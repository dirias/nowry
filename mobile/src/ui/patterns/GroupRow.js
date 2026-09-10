/**
 * A tag or a system group as one row (PhoneTags board).
 *
 * The same anatomy as `DeckRow`, with two differences the board draws. The
 * leading slot is a glyph rather than a colour tile, because a tag has no
 * identity colour — every tag is the same kind of thing, and giving them
 * colours would invent a meaning that is not in the data. And the meta line is
 * reach rather than progress: "46 cards · 3 decks" says how much of the library
 * this tag touches.
 *
 * The due count is again the one thing at `text.primary`. A group with nothing
 * due says so in words instead, because a row of zeroes reads as broken.
 */
import { useTranslation } from 'react-i18next'
import { Typography } from '../Typography'
import { Icon } from '../icons'
import { ListRow } from './ListRow'

export function GroupRow({ name, meta, glyph = 'Tag', summary, onPress }) {
  const { t } = useTranslation()
  const due = summary?.due || 0
  const fresh = summary?.new || 0
  const cards = summary?.cards || 0

  const readout =
    due + fresh > 0 ? (
      <Typography level='body-sm' color='text.secondary'>
        {due > 0 ? (
          <Typography level='body-sm' color='text.primary'>
            {t('study.dueCount', { count: due })}
          </Typography>
        ) : null}
        {due > 0 && fresh > 0 ? ' · ' : ''}
        {fresh > 0 ? t('study.deck.newCount', { count: fresh }) : ''}
      </Typography>
    ) : (
      <Typography level='body-sm' color='text.tertiary'>
        {cards > 0 ? t('groups.upToDate') : t('groups.nothingYet')}
      </Typography>
    )

  return (
    <ListRow
      tile={<Icon name={glyph} size='sm' color='text.tertiary' />}
      name={name}
      meta={meta ?? t('groups.cardsDecks', { cards, decks: summary?.decks || 0 })}
      readout={readout}
      action={<Icon name='ChevronRight' size='sm' color='text.tertiary' />}
      onPress={onPress}
      accessibilityLabel={t('groups.selectAria', { name })}
    />
  )
}

export default GroupRow
