import React, { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Input, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded'
import BookmarkRounded from '@mui/icons-material/BookmarkRounded'
import RepeatRounded from '@mui/icons-material/RepeatRounded'
import { focusRing, readout, tabularNums } from '../Common/Form/formStyles'
import { useCardData } from '../../hooks/useCardData'
import DeckRow from '../Study/DeckRow'
import CardRow from './CardRow'
import SelectionBar from './SelectionBar'
import BulkActionOverlays from './BulkActionOverlays'
import { useCardSelection } from './useCardSelection'
import { useBulkCardActions } from './useBulkCardActions'
import TagActionsMenu from './TagActionsMenu'
import TagActionOverlays from './TagActionOverlays'
import { useTagActions } from './useTagActions'
import { patchCardInCache } from '../../api/cardCache'

export const GROUP_ICONS = { tag: LocalOfferRounded, marked: BookmarkRounded, struggling: RepeatRounded }

/** `tag:verbs` | `marked` | `struggling` → { kind, tag } */
export function parseGroupKey(key) {
  if (!key) return null
  if (key.startsWith('tag:')) return { kind: 'tag', tag: key.slice(4) }
  if (key === 'marked' || key === 'struggling') return { kind: key }
  return null
}

const byNextReview = (a, b) => {
  const at = a.next_review ? new Date(a.next_review).getTime() : Infinity
  const bt = b.next_review ? new Date(b.next_review).getTime() : Infinity
  return at - bt
}

/**
 * The open group (PRD D6, US-004, US-005): title with its glyph, one readout
 * line, the actions, then its decks as rows and its cards as rows sorted by
 * next review. Tags and Struggling offer Study · N (N = due + new today) and
 * Browse; Marked offers neither — the mark may not narrow a study queue
 * (ADR-014), so its rows preview instead.
 *
 * The same selection bar as the Cards view stands in for the cards section's
 * head while a selection exists (PRD D16); the header with Study and Browse
 * stays. The bulk verbs run through the same hook and open the same surfaces.
 *
 * A tag's own verbs (PRD D17) sit on a kebab after the keys: Rename turns the
 * title into a field; Merge into… and Remove confirm with their number.
 * `existingTags` is the groups index, so a rename onto a name that exists is
 * routed through the merge sheet; `onRenamed(to)` / `onRemoved()` move the
 * URL. Struggling and Marked render no kebab.
 */
export default function GroupDetail({
  group,
  summary,
  decks = [],
  availableTags = [],
  existingTags = [],
  onEditCard,
  onEditTags,
  onDeleteCard,
  onPreviewCards,
  onRenamed,
  onRemoved
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const Icon = GROUP_ICONS[group.kind]
  const name = group.kind === 'tag' ? group.tag : t(`groups.${group.kind}`)
  const tagFilter = useMemo(() => (group.kind === 'tag' ? [group.tag] : []), [group])
  const systemGroup = group.kind === 'tag' ? null : group.kind
  const { cards, total, hasMore, loading, fetchMore } = useCardData(tagFilter, '', false, systemGroup)
  const sorted = useMemo(() => [...cards].sort(byNextReview), [cards])
  const selection = useCardSelection()
  const { clear: clearSelection } = selection
  const afterBulk = useCallback(
    (action) => {
      if (action !== 'tag' && action !== 'untag') clearSelection()
    },
    [clearSelection]
  )
  const bulk = useBulkCardActions({ onDone: afterBulk })
  const selectedCards = useMemo(() => sorted.filter((card) => selection.isSelected(card._id)), [sorted, selection])
  const selectedIds = selectedCards.map((card) => card._id)
  const { retain } = selection
  useEffect(() => {
    retain(sorted.map((card) => card._id))
  }, [sorted, retain])
  const deckRows = useMemo(() => {
    const ids = new Set((summary?.deck_ids || []).map(String))
    return decks.filter((deck) => ids.has(String(deck._id)))
  }, [decks, summary])
  const asked = (summary?.due || 0) + (summary?.new || 0)
  const canStudy = group.kind !== 'marked'
  const isTag = group.kind === 'tag'
  const cardCount = summary?.cards ?? total
  const tagActions = useTagActions({ tag: group.tag, existingTags, onRenamed, onRemoved })
  const sessionQuery = group.kind === 'tag' ? `tags=${encodeURIComponent(group.tag)}` : `group=${group.kind}`

  const deckName = (deckId) => decks.find((d) => d._id === deckId || d._id === deckId?._id)?.name || '—'
  const handleMarkChange = (cardId, markedAt) => patchCardInCache(cardId, { marked_at: markedAt })

  const gradeMeta = (card) =>
    card.last_grade ? t('groups.lastGrade', { grade: t(card.last_grade === 'again' ? 'groups.gradeAgain' : 'groups.gradeHard') }) : null

  return (
    <Box component='section' aria-labelledby='group-detail-title' data-testid='group-detail'>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-start' }, gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <GroupTitle name={name} Icon={Icon} renaming={isTag && tagActions.renaming} actions={tagActions} />
          <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary' }}>
            {t('groups.detailReadout', { cards: summary?.cards ?? total, decks: summary?.decks ?? deckRows.length })}
            {asked > 0 && (
              <>
                {' · '}
                {(summary?.due || 0) > 0 && (
                  <Typography component='span' level='body-sm' sx={{ color: 'text.primary', fontWeight: 'md' }}>
                    {t('study.dueCount', { count: summary.due })}
                  </Typography>
                )}
                {(summary?.due || 0) > 0 && (summary?.new || 0) > 0 && ' · '}
                {(summary?.new || 0) > 0 && t('study.deck.newCount', { count: summary.new })}
              </>
            )}
            {asked === 0 && (summary?.cards || 0) > 0 && ` · ${t('groups.upToDate')}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
          {canStudy && (summary?.cards || 0) > 0 && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: { xs: 1, md: 'none' } }}>
              <Button variant='soft' color='neutral' onClick={() => navigate(`/study/daily-review?${sessionQuery}&mode=browse`)}>
                {t('groups.browse')}
              </Button>
              {asked > 0 && (
                <Button onClick={() => navigate(`/study/daily-review?${sessionQuery}`)} sx={tabularNums}>
                  {t('groups.study', { count: asked })}
                </Button>
              )}
            </Stack>
          )}
          {isTag && (
            <TagActionsMenu
              tag={group.tag}
              count={cardCount}
              onRename={tagActions.startRename}
              onMerge={tagActions.requestMerge}
              onRemove={tagActions.requestRemove}
            />
          )}
        </Box>
      </Box>

      {deckRows.length > 0 && (
        <Box component='section' sx={{ mb: 3 }}>
          <Stack direction='row' spacing={1.25} alignItems='baseline' sx={{ mb: 1, minHeight: 28 }}>
            <Typography level='title-md'>{t('groups.decks')}</Typography>
            <Typography level='body-sm' sx={readout}>
              {deckRows.length}
            </Typography>
          </Stack>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
            {deckRows.map((deck) => (
              <DeckRow
                key={deck._id}
                deck={deck}
                onStudy={(d) => navigate(`/study/${d._id}?mode=study`)}
                onBrowse={(d) => navigate(`/study/${d._id}?mode=browse`)}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box component='section'>
        {selection.selecting ? (
          <SelectionBar
            selectedCards={selectedCards}
            total={sorted.length}
            availableTags={availableTags}
            onClear={selection.clear}
            onSelectAll={() => selection.selectAll(sorted.map((card) => card._id))}
            onMove={() => bulk.requestMove(selectedIds)}
            onTag={(tag) => bulk.run('tag', selectedIds, { tags: [tag] })}
            onUntag={(tag) => bulk.run('untag', selectedIds, { tags: [tag] })}
            onMark={() => bulk.run('mark', selectedIds)}
            onUnmark={() => bulk.run('unmark', selectedIds)}
            onDelete={() => bulk.requestDelete(selectedIds)}
            sx={{ mb: 1 }}
          />
        ) : (
          // The bar's height, so the swap never moves the list under it.
          <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40, mb: 1 }}>
            <Stack direction='row' spacing={1.25} alignItems='baseline'>
              <Typography level='title-md'>{t('groups.cards')}</Typography>
              {!loading && (
                <Typography level='body-sm' sx={readout}>
                  {t('sessions.ofTotal', { shown: sorted.length, total })}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
        {loading ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 'md' }} />
            ))}
          </Stack>
        ) : sorted.length === 0 ? (
          <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 1.5 }}>
            {t('groups.emptyGroup')}
          </Typography>
        ) : (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
            {sorted.map((card) => (
              <CardRow
                key={card._id}
                card={card}
                deckName={[deckName(card.deck_id), gradeMeta(card)].filter(Boolean).join(' · ')}
                onPreview={(c) =>
                  onPreviewCards?.(
                    sorted,
                    sorted.findIndex((x) => x._id === c._id)
                  )
                }
                onEdit={onEditCard}
                onMove={(c) => bulk.requestMove([c._id])}
                onEditTags={onEditTags}
                onDelete={onDeleteCard}
                onMarkChange={handleMarkChange}
                showSource={group.kind === 'struggling'}
                selectable
                selected={selection.isSelected(card._id)}
                selecting={selection.selecting}
                onSelect={(c) => selection.toggle(c._id)}
                longPressHandlers={selection.longPressHandlers}
              />
            ))}
          </Box>
        )}
        {hasMore && !loading && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button variant='soft' color='neutral' size='sm' onClick={fetchMore}>
              {t('groups.showMore', { count: Math.max(0, total - sorted.length) })}
            </Button>
          </Box>
        )}
      </Box>
      <BulkActionOverlays actions={bulk} decks={decks} />
      {isTag && <TagActionOverlays actions={tagActions} tag={group.tag} count={cardCount} tags={existingTags} />}
    </Box>
  )
}

/**
 * The group's name as its h3, or — while a tag is being renamed — as a field
 * in the same slot (PRD D17): Enter saves, Escape cancels. Blur does not
 * cancel — the kebab's menu hands focus back to its button as it closes, and
 * the field must survive that.
 */
function GroupTitle({ name, Icon, renaming, actions }) {
  const { t } = useTranslation()
  if (!renaming) {
    return (
      <Typography id='group-detail-title' level='h3' sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Icon sx={{ fontSize: 'xl', color: 'text.tertiary' }} aria-hidden='true' />
        {name}
      </Typography>
    )
  }
  return (
    <Input
      id='group-detail-title'
      size='md'
      autoFocus
      defaultValue={name}
      aria-label={t('groups.renameAria', { tag: name })}
      startDecorator={<Icon sx={{ fontSize: 'xl', color: 'text.tertiary' }} aria-hidden='true' />}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          actions.submitRename(event.target.value)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          actions.cancelRename()
        }
      }}
      sx={{ maxWidth: 420, ...focusRing }}
    />
  )
}
