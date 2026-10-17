import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Button, Checkbox, Input, Link, Option, Select, Skeleton, Stack, Textarea, Typography } from '@mui/joy'
import AddRounded from '@mui/icons-material/AddRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import { blackboardService } from '@nowry/core/api/services/blackboard.service'
import { cardsService } from '@nowry/core/api/services/cards.service'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import useGenerationProgress from '@nowry/core/hooks/useGenerationProgress'
import { limitRefusalKey, limitRefusalOptions } from '@nowry/core/domain/limits'
import { FREE_AI_CALLS_PER_MONTH } from '@nowry/core/domain/plans'
import FormSheet from '../Common/Form/FormSheet'
import FormErrorBanner from '../Common/Form/FormErrorBanner'
import GenerationProgress from '../Common/GenerationProgress'
import { focusRing, formLabel, oneLine } from '../Common/Form/formStyles'
import { splitText } from './canvas/boardEdits'
import { attributeCard } from './cardAttribution'

/** The card's title is at most 100 characters (the API's StudyCard model). */
export const FRONT_LIMIT = 100

// Per-surface narration (GEN-005, PRD A5): what the generator is doing with these notes.
const STAGES = [
  { after: 0, msgKey: 'boards.cards.stages.s0' },
  { after: 6, msgKey: 'boards.cards.stages.s1' },
  { after: 14, msgKey: 'boards.cards.stages.s2' }
]
const ESTIMATED_MS = 18000
const LABEL_WIDTH = 96

let rowCounter = 0
const rowKey = () => {
  rowCounter += 1
  return `card-${rowCounter}`
}

const statusOf = (err) => err?.response?.status ?? err?.status ?? null
const deckIdOf = (deck) => String(deck?._id ?? deck?.id ?? '')

/**
 * What a failed generation means to the learner: a plan limit (a sentence that
 * names it, no retry), notes with nothing to read, or a failure worth retrying.
 */
export const generationError = (err) => {
  const limitKey = limitRefusalKey(err)
  if (limitKey) return { kind: 'limit', key: limitKey, options: limitRefusalOptions(err) }
  const status = statusOf(err)
  if (status === 429) return { kind: 'limit', key: 'subscription.errors.aiLimitReached', options: { limit: FREE_AI_CALLS_PER_MONTH } }
  if (status === 402 || status === 403) return { kind: 'limit', key: 'subscription.errors.upgradeToUse', options: {} }
  if (status === 422) return { kind: 'empty' }
  if (status === 504 || err?.code === 'ECONNABORTED') return { kind: 'retry', detailKey: 'boards.cards.errorTimeout' }
  return { kind: 'retry', detailKey: 'boards.cards.errorFailed' }
}

/** A value that reads as text until clicked; Enter or leaving the field keeps the edit, Esc drops it. */
function EditableText({ value, onCommit, placeholder, ariaLabel, multiline = false, startEditing = false, muted, strong }) {
  const [editing, setEditing] = useState(startEditing)
  const [draft, setDraft] = useState(value)
  const cancelled = useRef(false)

  const begin = () => {
    cancelled.current = false
    setDraft(value)
    setEditing(true)
  }
  const commit = () => {
    if (!cancelled.current && draft !== value) onCommit(draft)
    setEditing(false)
  }
  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.target.blur?.()
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      cancelled.current = true
      event.target.blur?.()
    }
  }

  if (editing) {
    const common = {
      autoFocus: true,
      size: 'sm',
      value: draft,
      placeholder,
      onChange: (event) => setDraft(multiline ? event.target.value : event.target.value.slice(0, FRONT_LIMIT)),
      onBlur: commit,
      onKeyDown,
      slotProps: { [multiline ? 'textarea' : 'input']: { 'aria-label': ariaLabel } }
    }
    return multiline ? <Textarea minRows={1} {...common} /> : <Input {...common} />
  }

  const empty = !value.trim()
  return (
    <Typography
      component='button'
      type='button'
      level={strong ? 'title-sm' : 'body-sm'}
      onClick={begin}
      aria-label={ariaLabel}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        p: 0,
        m: 0,
        border: 0,
        bgcolor: 'transparent',
        cursor: 'text',
        borderRadius: 'xs',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        color: empty ? 'text.tertiary' : muted ? 'text.tertiary' : strong ? 'text.primary' : 'text.secondary',
        '&:hover': { bgcolor: 'background.level1' },
        ...focusRing
      }}
    >
      {empty ? placeholder : value}
    </Typography>
  )
}

function CardRow({ row, source, onChange }) {
  const { t } = useTranslation()
  return (
    <Box
      data-testid='make-cards-row'
      sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Checkbox
        checked={row.checked}
        onChange={(event) => onChange({ checked: event.target.checked })}
        slotProps={{ input: { 'aria-label': t('boards.cards.include', { title: row.front || t('boards.cards.frontPlaceholder') }) } }}
        sx={{ mt: 0.25 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <EditableText
          strong
          value={row.front}
          muted={!row.checked}
          startEditing={row.byHand}
          placeholder={t('boards.cards.frontPlaceholder')}
          ariaLabel={t('boards.cards.editFront')}
          onCommit={(front) => onChange({ front })}
        />
        <Box sx={{ mt: 0.25 }}>
          <EditableText
            multiline
            value={row.back}
            muted={!row.checked}
            placeholder={t('boards.cards.backPlaceholder')}
            ariaLabel={t('boards.cards.editBack')}
            onCommit={(back) => onChange({ back })}
          />
        </Box>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
          {t(row.checked ? 'boards.cards.from' : 'boards.cards.leftOut', { title: source })}
        </Typography>
      </Box>
    </Box>
  )
}

function RowsSkeleton() {
  return (
    <Box data-testid='make-cards-loading'>
      {[0, 1, 2].map((index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant='rectangular' width={20} height={20} sx={{ borderRadius: 'xs', mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant='text' level='title-sm' width='75%' />
            <Skeleton variant='text' level='body-sm' width='55%' />
            <Skeleton variant='text' level='body-xs' width='30%' />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

function DeckRow({ decks, loading, error, deckId, onDeck }) {
  const { t } = useTranslation()
  const [changing, setChanging] = useState(false)
  const deck = decks.find((d) => deckIdOf(d) === deckId) ?? null

  let value
  if (loading) value = <Skeleton variant='text' level='body-md' width={160} />
  else if (error)
    value = (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t('boards.cards.decksError')}
      </Typography>
    )
  else if (!decks.length)
    value = (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        {t('boards.cards.noDecks')}{' '}
        <Link component={RouterLink} to='/study?view=library&new=deck'>
          {t('boards.cards.makeDeck')}
        </Link>
      </Typography>
    )
  else if (changing)
    value = (
      <Select
        size='sm'
        autoFocus
        defaultListboxOpen
        value={deckId}
        onChange={(_event, next) => {
          if (next) onDeck(next)
          setChanging(false)
        }}
        onClose={() => setChanging(false)}
        slotProps={{ button: { 'aria-label': t('boards.cards.chooseDeck') } }}
        sx={{ minWidth: 220 }}
      >
        {decks.map((d) => (
          <Option key={deckIdOf(d)} value={deckIdOf(d)}>
            {d.name}
          </Option>
        ))}
      </Select>
    )
  else
    value = (
      <Typography level='body-md' sx={oneLine}>
        {deck?.name}
      </Typography>
    )

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 48, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography level='title-sm' sx={{ ...formLabel, width: LABEL_WIDTH, flexShrink: 0, mb: 0 }}>
        {t('boards.cards.deck')}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{value}</Box>
      {!loading && !error && decks.length > 0 && !changing && (
        <Button variant='plain' color='primary' size='sm' onClick={() => setChanging(true)} sx={{ px: 0.75, minHeight: 32, ...focusRing }}>
          {t('boards.cards.change')}
        </Button>
      )}
    </Box>
  )
}

/**
 * Make cards (BOARD-006, PRD D7, Study board): the selected notes, sent to
 * the generate route, come back as pairs, one row each — ticked by default,
 * front and back editable in place, and the note each came from. A deck row
 * says where they go. "Add N cards" makes each ticked card in that deck with
 * its board and note (`source_board_id`, `source_board_node_id`), then hands
 * the made `{ nodeId, cardId }` pairs to `onLinked` so the notes can count
 * them, and `onDone({ count, deckId, deckName })`.
 */
export default function MakeCardsSheet({ open, onClose, boardId, notes, initialDeckId = null, onLinked, onDone }) {
  const { t } = useTranslation()
  const { decks, loading: decksLoading, error: decksError } = useDeckData()

  const [phase, setPhase] = useState('generating')
  const [genError, setGenError] = useState(null)
  const [rows, setRows] = useState([])
  const [truncated, setTruncated] = useState(false)
  const [deckId, setDeckId] = useState(initialDeckId)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [hint, setHint] = useState(null)
  const runRef = useRef(0)

  const progress = useGenerationProgress({
    active: phase === 'generating',
    failed: phase === 'failed',
    estimatedMs: ESTIMATED_MS,
    stages: STAGES,
    surface: 'boardCards'
  })

  const generate = useCallback(async () => {
    runRef.current += 1
    const run = runRef.current
    setPhase('generating')
    setGenError(null)
    setHint(null)
    try {
      const result = await blackboardService.generateCards(boardId, {
        nodeIds: notes.map((n) => n.id),
        nodeTexts: notes.map((n) => n.text ?? '')
      })
      if (run !== runRef.current) return
      setRows(
        (result?.cards ?? []).map((card) => ({
          key: rowKey(),
          front: String(card.front ?? '').slice(0, FRONT_LIMIT),
          back: String(card.back ?? ''),
          checked: true
        }))
      )
      setTruncated(Boolean(result?.nodes_truncated))
      setPhase('ready')
    } catch (err) {
      if (run !== runRef.current) return
      setGenError(generationError(err))
      setPhase('failed')
    }
  }, [boardId, notes])

  useEffect(() => {
    if (!open) return undefined
    generate()
    return () => {
      runRef.current += 1
    }
  }, [open, generate])

  // The deck: the one used last on this board while it is still there, else the first.
  useEffect(() => {
    if (!decks.length) return
    if (!deckId || !decks.some((d) => deckIdOf(d) === deckId)) setDeckId(deckIdOf(decks[0]))
  }, [decks, deckId])

  const sources = useMemo(() => {
    const titleOf = (id) => {
      const note = notes.find((n) => n.id === id)
      return splitText(note?.text).title.trim() || t('boards.cards.untitledNote')
    }
    return rows.map((row) => {
      const nodeId = attributeCard(`${row.front} ${row.back}`, notes)
      return { nodeId, title: titleOf(nodeId) }
    })
  }, [rows, notes, t])

  const checked = rows.filter((r) => r.checked && r.front.trim())
  const deck = decks.find((d) => deckIdOf(d) === deckId) ?? null

  const changeRow = (key, patch) => {
    setHint(null)
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addByHand = () => setRows((prev) => [...prev, { key: rowKey(), front: '', back: '', checked: true, byHand: true }])

  const add = async () => {
    if (!deck || !checked.length) {
      setHint(deck ? 'boards.cards.needCard' : 'boards.cards.needDeck')
      return
    }
    setHint(null)
    setAddError(null)
    setAdding(true)
    const made = []
    let failed = 0
    for (const row of rows) {
      if (!row.checked || !row.front.trim()) continue
      const nodeId = sources[rows.indexOf(row)]?.nodeId ?? null
      try {
        const card = await cardsService.create({
          deck_id: deckIdOf(deck),
          title: row.front.trim().slice(0, FRONT_LIMIT),
          content: row.back.trim(),
          source_board_id: boardId,
          source_board_node_id: nodeId
        })
        made.push({ rowKey: row.key, nodeId, cardId: String(card?._id ?? card?.id ?? '') })
      } catch {
        failed += 1
      }
    }
    setAdding(false)
    if (made.length) onLinked?.(made)
    if (failed) {
      const done = new Set(made.map((m) => m.rowKey))
      setRows((prev) => prev.filter((r) => !done.has(r.key)))
      setAddError(failed)
      return
    }
    onDone?.({ count: made.length, deckId: deckIdOf(deck), deckName: deck.name })
  }

  const subtitle =
    phase === 'ready'
      ? `${t('boards.cards.fromNotes', { count: notes.length })} · ${t('boards.cards.toAdd', { count: checked.length })}`
      : t('boards.cards.fromNotes', { count: notes.length })

  const footer = (
    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} gap={1}>
      <Button variant='plain' color='neutral' size='lg' onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
        {hint && (
          <Typography level='body-sm' role='alert' sx={{ color: 'text.secondary' }}>
            {t(hint)}
          </Typography>
        )}
        <Button size='lg' loading={adding} onClick={add}>
          {t('boards.cards.add', { count: checked.length })}
        </Button>
      </Stack>
    </Stack>
  )

  const banner = addError ? (
    <FormErrorBanner
      titleKey='boards.cards.addErrorTitle'
      detailText={t('boards.cards.addError', { count: addError })}
      action={{ labelKey: 'common.retry', onClick: add }}
    />
  ) : genError?.kind === 'retry' ? (
    <FormErrorBanner
      titleKey='boards.cards.errorTitle'
      detailText={t(genError.detailKey)}
      action={{ labelKey: 'common.retry', onClick: generate }}
    />
  ) : null

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      titleKey='boards.cards.title'
      subtitleText={subtitle}
      width='standard'
      footer={footer}
      banner={banner}
    >
      <DeckRow decks={decks} loading={decksLoading} error={decksError} deckId={deckId} onDeck={setDeckId} />

      {phase === 'generating' && (
        <>
          <GenerationProgress progress={progress} label={t('boards.cards.generating')} sx={{ pt: 2 }} />
          <RowsSkeleton />
        </>
      )}

      {phase === 'failed' && genError?.kind === 'limit' && (
        <Alert color='warning' variant='soft' role='alert' sx={{ mt: 2 }}>
          {t(genError.key, genError.options)}
        </Alert>
      )}
      {phase === 'failed' && genError?.kind === 'empty' && (
        <Typography level='body-sm' role='alert' sx={{ color: 'text.secondary', mt: 2 }}>
          {t('boards.cards.emptyText')}
        </Typography>
      )}

      {phase === 'ready' && truncated && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1.5 }}>
          {t('boards.cards.truncated')}
        </Typography>
      )}
      {phase === 'ready' && !rows.length && (
        <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 2 }}>
          {t('boards.cards.noneBack')}
        </Typography>
      )}

      {rows.map((row, index) => (
        <CardRow key={row.key} row={row} source={sources[index]?.title} onChange={(patch) => changeRow(row.key, patch)} />
      ))}

      {phase !== 'generating' && (
        <Stack direction='row' gap={0.5} sx={{ pt: 1.25 }}>
          {genError?.kind !== 'limit' && (
            <Button variant='plain' color='primary' size='sm' startDecorator={<RefreshRounded />} onClick={generate} sx={focusRing}>
              {t('boards.cards.makeAgain')}
            </Button>
          )}
          <Button variant='plain' color='primary' size='sm' startDecorator={<AddRounded />} onClick={addByHand} sx={focusRing}>
            {t('boards.cards.addByHand')}
          </Button>
        </Stack>
      )}
    </FormSheet>
  )
}
