import React, { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Button, Link, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import { focusRing, listRow, oneLine, readout, tabularNums } from '../Common/Form/formStyles'
import { useGroups } from '../../hooks/useGroups'
import { useIsMobile } from '../../hooks/useIsMobile'
import GroupDetail, { GROUP_ICONS, parseGroupKey } from './GroupDetail'

const groupKey = (group) => (group.kind === 'tag' ? `tag:${group.tag}` : group.kind)

/**
 * The library's third view (PRD D6 / US-004): an index of groups on the left
 * — Struggling and Marked above the user's tags — and the open group on the
 * right. One row anatomy (§15.11): glyph · name with a meta line · readout.
 * The open group lives in the URL (`?group=tag:verbs`), so it is linkable and
 * on a phone the index is the screen and a group opens as its own screen with
 * a back control.
 *
 * Untagged is never a row here (PRD D15, ADR-023 point 1): the index readout
 * names the number and the number is a link that opens Cards with No tag on.
 */
export default function TagsView({ decks = [], search = '', onEditCard, onDeleteCard, onPreviewCards }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const { groups, loading } = useGroups({ enabled: true })

  const selected = parseGroupKey(searchParams.get('group'))
  const select = useCallback(
    (group) => {
      const params = new URLSearchParams(searchParams)
      if (group) params.set('group', groupKey(group))
      else params.delete('group')
      setSearchParams(params, { replace: !group })
    },
    [searchParams, setSearchParams]
  )

  const system = useMemo(() => {
    const rows = groups?.system || []
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]))
    return ['struggling', 'marked'].map((key) => ({
      kind: key,
      summary: byKey[key] || { cards: 0, decks: 0, deck_ids: [], due: 0, new: 0, window_days: 14 }
    }))
  }, [groups])
  const tags = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (groups?.tags || [])
      .filter((row) => !needle || row.tag.toLowerCase().includes(needle))
      .map((row) => ({ kind: 'tag', tag: row.tag, summary: row }))
  }, [groups, search])

  const untaggedCount = groups?.untagged?.cards ?? 0
  // Cards with No tag on, on the same page — `view` stays, `group` goes.
  const openUntagged = useCallback(() => {
    const params = new URLSearchParams()
    const view = searchParams.get('view')
    if (view) params.set('view', view)
    params.set('tab', 'cards')
    params.set('untagged', '1')
    setSearchParams(params)
  }, [searchParams, setSearchParams])

  const selectedEntry = selected && [...system, ...tags].find((entry) => groupKey(entry) === groupKey(selected))
  const showIndex = !isMobile || !selected
  const showDetail = Boolean(selected) && (!isMobile || Boolean(selected))

  const statusReadout = (summary) => {
    const due = summary?.due || 0
    const fresh = summary?.new || 0
    if (due + fresh === 0) return <span>{(summary?.cards || 0) > 0 ? t('groups.upToDate') : t('groups.nothingYet')}</span>
    return (
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
  }

  const row = (entry) => {
    const Icon = GROUP_ICONS[entry.kind]
    const name = entry.kind === 'tag' ? entry.tag : t(`groups.${entry.kind}`)
    const meta =
      entry.kind === 'struggling'
        ? t('groups.strugglingMeta', { days: entry.summary.window_days || 14 })
        : entry.kind === 'marked'
          ? t('groups.markedMeta')
          : t('groups.cardsDecks', { cards: entry.summary.cards, decks: entry.summary.decks })
    const active = selectedEntry && groupKey(selectedEntry) === groupKey(entry)
    return (
      <Box
        key={groupKey(entry)}
        role='button'
        tabIndex={0}
        data-testid='group-row'
        aria-pressed={Boolean(active)}
        aria-label={t('groups.selectAria', { name })}
        onClick={() => select(entry)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            select(entry)
          }
        }}
        sx={{
          ...listRow,
          gap: 1.5,
          cursor: 'pointer',
          ...(active ? { bgcolor: 'background.level2', '&:hover': { bgcolor: 'background.level2' } } : {})
        }}
      >
        <Icon sx={{ fontSize: 'md', color: 'text.tertiary' }} aria-hidden='true' />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography level='title-sm' sx={oneLine}>
            {name}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', ...readout, fontSize: 'xs', ...oneLine }}>
            {meta}
          </Typography>
        </Box>
        <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary', textAlign: 'right', flexShrink: 0, ...tabularNums }}>
          {statusReadout(entry.summary)}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: showDetail ? 'minmax(0, 1fr) minmax(0, 2fr)' : 'minmax(0, 1fr)' },
        gap: { xs: 0, md: 6 },
        alignItems: 'start'
      }}
    >
      {showIndex && (
        <Box component='section' aria-labelledby='groups-index-title' data-testid='groups-index'>
          <Stack direction='row' spacing={1.25} alignItems='baseline' sx={{ mb: 1, minHeight: 28 }}>
            <Typography id='groups-index-title' level='title-md'>
              {t('groups.title')}
            </Typography>
            {!loading && (
              <Typography level='body-sm' sx={readout}>
                {t('groups.readout', { system: system.length, tags: (groups?.tags || []).length })}
                {untaggedCount > 0 && (
                  <>
                    <span aria-hidden='true'> · </span>
                    <Link
                      component='button'
                      level='body-sm'
                      underline='hover'
                      onClick={openUntagged}
                      aria-label={t('groups.untaggedLinkAria', { count: untaggedCount })}
                      sx={{ ...readout, color: 'primary.plainColor', verticalAlign: 'baseline', ...focusRing }}
                    >
                      {t('groups.readoutUntagged', { count: untaggedCount })}
                    </Link>
                  </>
                )}
              </Typography>
            )}
          </Stack>
          {loading ? (
            <Stack spacing={1}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 'md' }} />
              ))}
            </Stack>
          ) : (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              {system.map(row)}
              <Box aria-hidden='true' sx={{ borderTop: '1px solid', borderColor: 'divider', my: 1 }} />
              {tags.length > 0 ? (
                tags.map(row)
              ) : (
                <Typography level='body-sm' sx={{ color: 'text.tertiary', py: 1.5 }}>
                  {t('groups.emptyTags')}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {showDetail && (
        <Box sx={{ borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 6 } }}>
          {isMobile && (
            <Button
              variant='plain'
              color='neutral'
              size='sm'
              startDecorator={<ChevronLeftRounded />}
              onClick={() => select(null)}
              sx={{ mb: 1.5, ml: -1.5 }}
            >
              {t('groups.back')}
            </Button>
          )}
          <GroupDetail
            key={groupKey(selected)}
            group={selected}
            summary={selectedEntry?.summary}
            decks={decks}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
            onPreviewCards={onPreviewCards}
          />
        </Box>
      )}
    </Box>
  )
}
