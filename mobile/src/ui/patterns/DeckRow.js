/**
 * One deck as one row (ADR-021 §15.11, PhoneDashboard board).
 *
 * Tile · name with a meta line · readout · chevron. The same five slots the web
 * row has, with one adaptation the board makes for a phone: the web's separate
 * measure column is hidden below `sm`, so mastery moves into the meta line and
 * reads "Flashcards · 41%".
 *
 * The due count is the one load-bearing number and the only thing at
 * `text.primary`; nothing else on the row competes with it. A deck nobody has
 * started reads "New" rather than showing 0%.
 *
 * There is no button on the row. The row IS the action — a phone has one
 * pointer and 390px, and a Study key on every row would be four solids on one
 * screen. The screen's one solid lives on the Today object.
 */
import { useTranslation } from 'react-i18next'
import { deckCounts, deckType } from '@nowry/core/domain/deckTypes'
import { Typography } from '../Typography'
import { Icon } from '../icons'
import { IdentityTile } from './IdentityTile'
import { ListRow } from './ListRow'

export function DeckRow({ deck, onPress }) {
  const { t } = useTranslation()
  const type = deckType(deck?.deck_type)
  const { due, fresh, mastery, asked, allNew } = deckCounts(deck)

  const meta = `${t(type.labelKey)} · ${allNew ? t('study.deckPill.new') : `${mastery}%`}`

  const readout =
    asked > 0 ? (
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
        {t('study.deck.upToDate')}
      </Typography>
    )

  return (
    <ListRow
      tile={<IdentityTile color={type.color} />}
      name={deck?.name ?? ''}
      meta={meta}
      readout={readout}
      action={<Icon name='ChevronRight' size='sm' color='text.tertiary' />}
      onPress={onPress}
      accessibilityLabel={t('study.deckPill.ariaLabel', { name: deck?.name ?? '' })}
    />
  )
}

export default DeckRow
