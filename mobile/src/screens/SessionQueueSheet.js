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
 * things to dismiss; the rows swap for the tag rows and a Done row swaps them
 * back, so the filter object stays one object.
 *
 * **Search narrows this list and nothing else.** The readout above the sheet
 * does not change while typing; the list says when nothing matches.
 */
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { frontText } from '@nowry/core/domain/cardSpeech'
import { useTheme } from '../theme'
import { cardKey, matchesQueueSearch } from '../hooks/useSessionQueue'
import { BottomSheet, Button, Chip, ChoiceRow, Divider, Input, ListRow, Segmented, Stack, Typography, resolveColor } from '../ui'
import { CHOICE_LIST_MAX_HEIGHT } from '../ui/patterns/ChoiceSheet'

/** The row's state, drawn as one small circle: a ring for the card in hand, a fill for an answered one. */
function QueueTick({ current, answered }) {
  const theme = useTheme()
  const ring = resolveColor(theme, current ? 'primary.plainColor' : answered ? 'success.plainColor' : 'divider')
  return (
    <View
      importantForAccessibility='no'
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: current ? 4 : 1.5,
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
  onJump,
  scope = 'due',
  onScopeChange,
  dueCount = null,
  allCount = null,
  daily = false,
  markedOnly = false,
  markedCount = 0,
  onMarkedChange,
  onClear
}) {
  const { t } = useTranslation()
  const [tagsOpen, setTagsOpen] = useState(false)
  const [search, setSearch] = useState('')
  // Said once, when the dim Marked chip is tapped under Due; gone on the next change.
  const [note, setNote] = useState(null)

  const markedLive = scope === 'all'
  const narrowed = selectedTags.length > 0 || (markedLive && markedOnly)
  const rows = useMemo(() => (Array.isArray(cards) ? cards.filter((card) => matchesQueueSearch(card, search)) : []), [cards, search])

  const toggleTag = (tag) =>
    onTagsChange?.(selectedTags.includes(tag) ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag])

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
    setTagsOpen(false)
    setNote(null)
    onClose?.()
  }

  return (
    <BottomSheet visible={visible} onClose={close} title={t('cards.session.queue.title')}>
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
            onPress={() => setTagsOpen((open) => !open)}
            accessibilityLabel={t('filters.tags')}
            accessibilityState={{ expanded: tagsOpen }}
          >
            {selectedTags.length > 0 ? t('filters.tagsReadout', { count: selectedTags.length }) : t('filters.tags')}
          </Chip>
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

        {tagsOpen ? null : (
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
              <Divider />
              <ChoiceRow label={t('cards.session.queue.done')} role='button' onPress={() => setTagsOpen(false)} />
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
              const state = current ? t('cards.session.queue.current') : answered ? t('cards.session.queue.answered') : null
              return (
                <ListRow
                  key={String(id ?? name)}
                  tile={<QueueTick current={current} answered={answered} />}
                  name={name}
                  meta={(card.tags ?? [])[0] ?? null}
                  accessibilityLabel={state ? `${name} · ${state}` : name}
                  onPress={() => {
                    onJump?.(id)
                    close()
                  }}
                />
              )
            })
          )}
        </ScrollView>
      </Stack>

      <Button variant='secondary' onPress={close} style={{ marginTop: 16 }}>
        {t('common.close')}
      </Button>
    </BottomSheet>
  )
}

export default SessionQueueSheet
