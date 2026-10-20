/**
 * The queue, as a sheet over the session (MOB-108, ADR-042).
 *
 * The session's count readout opens this. Its head is the library's filter
 * object, stacked: the scope segment (Due · All, deck sessions only — the daily
 * review has no All, ADR-042 point 6), the Tags and Marked chips, a search
 * line. Its body is the queue itself: one row per visible card, the card in
 * hand ringed, answered cards ticked, the first tag as meta. A tap goes to that
 * card.
 *
 * **Marked is drawn dim under Due, not hidden** (MOB-109). ADR-010 keeps the
 * mark away from the study queue; the chip stays so the rule is visible, and a
 * tap on it says where the mark applies instead of doing nothing.
 *
 * **Tags open in place of the list, not over it.** A sheet over a sheet is two
 * things to dismiss; the rows swap for the tag rows, and the footer key (or the
 * chip again) swaps them back, so the filter object stays one object (MOB-117).
 *
 * **Search narrows this list and nothing else.** The readout above the sheet
 * does not change while typing; the list says when nothing matches.
 */
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { frontText } from '@nowry/core/domain/cardSpeech'
import { cardRest } from '@nowry/core/domain/cardRest'
import { useTheme } from '../theme'
import { cardKey, deckKeyOf, matchesQueueSearch } from '../hooks/useSessionQueue'
import { sheetFooter, sheetTitle } from './queueSheet'
import {
  ActionSheet,
  BottomSheet,
  Button,
  Chip,
  ChoiceRow,
  Divider,
  Input,
  ListRow,
  RestSheet,
  Segmented,
  Stack,
  Typography,
  resolveColor,
  restLabel
} from '../ui'
import { CHOICE_LIST_MAX_HEIGHT } from '../ui/patterns/ChoiceSheet'

/**
 * The row's state, drawn as one small circle: a ring for the card in hand, a
 * fill for an answered one, a dashed ring for one that rests (SR-003).
 */
function QueueTick({ current, answered, resting = false }) {
  const theme = useTheme()
  const ring = resolveColor(theme, current ? 'primary.plainColor' : answered ? 'success.plainColor' : resting ? 'text.tertiary' : 'divider')
  return (
    <View
      importantForAccessibility='no'
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: current ? 4 : 1.5,
        borderStyle: resting && !current ? 'dashed' : 'solid',
        borderColor: ring,
        backgroundColor: answered && !current ? ring : 'transparent'
      }}
    />
  )
}

export function SessionQueueSheet({
  visible,
  onClose,
  cards = [],
  currentId = null,
  graded = {},
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  availableDecks = [],
  selectedDecks = [],
  onDecksChange,
  deckNames = {},
  deckName = null,
  onJump,
  scope = 'due',
  onScopeChange,
  dueCount = null,
  allCount = null,
  daily = false,
  markedOnly = false,
  markedCount = 0,
  onMarkedChange,
  onClear,
  onRest,
  onWake,
  onEdit
}) {
  const { t, i18n } = useTranslation()
  // A row held: the card whose rest is being decided (SR-003).
  const [held, setHeld] = useState(null)
  const [restOpen, setRestOpen] = useState(false)
  // Which chip's rows have taken the list's place: 'tags', 'decks' or none.
  const [menu, setMenu] = useState(null)
  const tagsOpen = menu === 'tags'
  const decksOpen = menu === 'decks'
  const [search, setSearch] = useState('')
  // Said once, when the dim Marked chip is tapped under Due; gone on the next change.
  const [note, setNote] = useState(null)

  const markedLive = scope === 'all'
  const narrowed = selectedTags.length > 0 || selectedDecks.length > 0 || (markedLive && markedOnly)
  const rows = useMemo(() => (Array.isArray(cards) ? cards.filter((card) => matchesQueueSearch(card, search)) : []), [cards, search])

  const toggleTag = (tag) =>
    onTagsChange?.(selectedTags.includes(tag) ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag])
  const toggleDeck = (id) =>
    onDecksChange?.(selectedDecks.includes(id) ? selectedDecks.filter((item) => item !== id) : [...selectedDecks, id])

  const pressMarked = () => {
    if (markedLive) {
      setNote(null)
      onMarkedChange?.(!markedOnly)
      return
    }
    setNote(t('cards.session.queue.markedNeedsAll'))
  }

  const changeScope = (next) => {
    if (next === scope) return
    setNote(next === 'due' && markedOnly ? t('cards.session.queue.markedNeedsAll') : null)
    onScopeChange?.(next)
  }

  const close = () => {
    setMenu(null)
    setNote(null)
    setHeld(null)
    setRestOpen(false)
    onClose?.()
  }

  const count = Array.isArray(cards) ? cards.length : 0
  const footer = sheetFooter({ menu, narrowed, scope, count })

  const heldRest = held ? cardRest(held) : null
  const heldId = held ? cardKey(held) : null
  const heldActions = held
    ? [
        heldRest.resting
          ? { id: 'wake', label: t('cards.rest.wake'), onPress: () => onWake?.(heldId) }
          : { id: 'rest', label: t('cards.rest.restCard'), onPress: () => onRest?.(heldId, null) },
        { id: 'until', label: t('cards.rest.restUntil'), onPress: () => setRestOpen(true) },
        ...(onEdit ? [{ id: 'edit', label: t('cards.deck.edit'), onPress: () => onEdit(heldId) }] : [])
      ]
    : []

  return (
    <BottomSheet visible={visible} onClose={close} title={sheetTitle(t, { daily, scope, deckName, count })}>
      <Stack spacing={1.5}>
        {/* Which cards are in front of the learner: the web's URL mode as the
            first dimension of the filter object (ADR-042 point 2). */}
        {daily ? null : (
          <Segmented
            value={scope}
            onChange={changeScope}
            accessibilityLabel={t('cards.session.queue.scopeAria')}
            options={[
              { value: 'due', label: t('cards.session.queue.due'), count: dueCount },
              { value: 'all', label: t('cards.session.queue.all'), count: allCount }
            ]}
          />
        )}

        {/* The filter object's head: the same chips the library draws, and
            clearing lives here rather than on the screen (ADR-011). */}
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <Chip
            selected={selectedTags.length > 0 || tagsOpen}
            onPress={() => setMenu(tagsOpen ? null : 'tags')}
            accessibilityLabel={t('filters.tags')}
            accessibilityState={{ expanded: tagsOpen }}
          >
            {selectedTags.length > 0 ? t('filters.tagsReadout', { count: selectedTags.length }) : t('filters.tags')}
          </Chip>
          {/* A mixed queue is narrowed by deck as often as by tag; a deck
              session has one deck and no chip (ADR-042 point 6). */}
          {daily ? (
            <Chip
              selected={selectedDecks.length > 0 || decksOpen}
              onPress={() => setMenu(decksOpen ? null : 'decks')}
              accessibilityLabel={t('groups.decks')}
              accessibilityState={{ expanded: decksOpen }}
            >
              {selectedDecks.length > 0 ? t('cards.session.queue.decksReadout', { count: selectedDecks.length }) : t('groups.decks')}
            </Chip>
          ) : null}
          {daily ? null : (
            <Chip
              selected={markedLive && markedOnly}
              onPress={pressMarked}
              accessibilityLabel={t('filters.marked')}
              accessibilityState={{ selected: markedLive && markedOnly, disabled: !markedLive }}
              style={markedLive ? null : { opacity: 0.5 }}
            >
              {markedLive && markedCount > 0 ? t('cards.session.markFilter.label', { count: markedCount }) : t('filters.marked')}
            </Chip>
          )}
          {narrowed ? (
            <Chip onPress={() => onClear?.()} accessibilityLabel={t('filters.clear')}>
              {t('filters.clear')}
            </Chip>
          ) : null}
        </Stack>

        {note ? (
          <Typography level='body-xs' color='text.tertiary' accessibilityLiveRegion='polite'>
            {note}
          </Typography>
        ) : null}

        {menu ? null : (
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('cards.session.queue.search')}
            accessibilityLabel={t('cards.session.queue.search')}
            autoCapitalize='none'
            autoCorrect={false}
          />
        )}

        <ScrollView style={{ maxHeight: CHOICE_LIST_MAX_HEIGHT }} keyboardShouldPersistTaps='handled'>
          {tagsOpen ? (
            <>
              {availableTags.map(({ tag, count }) => (
                <ChoiceRow key={tag} label={tag} count={count} chosen={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} />
              ))}
            </>
          ) : decksOpen ? (
            <>
              {availableDecks.map(({ id, name, count }) => (
                <ChoiceRow key={id} label={name} count={count} chosen={selectedDecks.includes(id)} onPress={() => toggleDeck(id)} />
              ))}
            </>
          ) : rows.length === 0 ? (
            <Typography level='body-sm' color='text.tertiary' style={{ textAlign: 'center', paddingVertical: 16 }}>
              {t('cards.session.queue.noMatch')}
            </Typography>
          ) : (
            rows.map((card) => {
              const id = cardKey(card)
              const current = id !== null && id === currentId
              const answered = Boolean(id !== null && graded[id])
              const name = frontText(card)
              const rest = cardRest(card)
              const state = current
                ? t('cards.session.queue.current')
                : answered
                  ? t('cards.session.queue.answered')
                  : rest.resting
                    ? t('cards.rest.resting')
                    : null
              // A mixed queue says which deck; a deck's own queue says the tag.
              const deck = card?.deck_id
              const deckId = deckKeyOf(card)
              const embedded = deck && typeof deck === 'object' ? deck.name || deck.title || null : null
              const plainMeta = daily ? (embedded ?? deckNames[deckId] ?? null) : ((card.tags ?? [])[0] ?? null)
              // A resting card says so where its tag would be; the tag is a tap away.
              const meta = rest.resting ? restLabel(t, rest, i18n.language) : plainMeta
              return (
                <ListRow
                  key={String(id ?? name)}
                  tile={<QueueTick current={current} answered={answered} resting={rest.resting} />}
                  name={name}
                  meta={meta}
                  dimmed={rest.resting}
                  accessibilityLabel={state ? `${name} · ${state}` : name}
                  onPress={() => {
                    onJump?.(id)
                    close()
                  }}
                  onLongPress={onRest ? () => setHeld(card) : undefined}
                />
              )
            })
          )}
        </ScrollView>
      </Stack>

      {/* The sheet's one exit, and its label is the result (MOB-117). */}
      <Button variant='secondary' onPress={footer === 'show' ? () => setMenu(null) : close} style={{ marginTop: 16 }}>
        {footer === 'show'
          ? t('cards.session.queue.showCount', { count })
          : footer === 'study'
            ? t('cards.session.queue.studyCount', { count })
            : t('common.close')}
      </Button>

      {/* A held row's verbs (SR-003): rest, rest until, wake, edit. The sheet
          over the sheet is brief and closes on the pick. */}
      <ActionSheet
        visible={Boolean(held) && !restOpen}
        onClose={() => setHeld(null)}
        title={held ? frontText(held) : ''}
        actions={heldActions}
      />
      <RestSheet
        visible={restOpen}
        onClose={() => {
          setRestOpen(false)
          setHeld(null)
        }}
        title={held ? frontText(held) : null}
        resting={Boolean(heldRest?.resting)}
        onRest={(until) => onRest?.(heldId, until)}
        onWake={() => onWake?.(heldId)}
        hint={t('cards.rest.kept')}
      />
    </BottomSheet>
  )
}

export default SessionQueueSheet
