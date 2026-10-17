import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Snackbar } from '@mui/joy'
import { tasksService } from '@nowry/core/api/services/tasks.service'
import { annualPlanningService } from '@nowry/core/api/services/annualPlanning.service'
import { cardsService } from '@nowry/core/api/services/cards.service'
import { queryClient } from '@nowry/core/api/queryClient'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useTaskData } from '@nowry/core/hooks/useTaskData'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useBlocks } from '@nowry/core/hooks/useBlocks'
import { dateKeyOf, factsFrom, writesFor } from '@nowry/core/domain/items'
import ItemSheet from '../Calendar/ItemSheet'
import MakeCardsSheet from './MakeCardsSheet'
import { BoardLinksContext } from './boardLinksContext'
import { readItem } from './itemReading'
import { addCardIds, notesToItems } from './canvas/itemEdits'
import { splitText } from './canvas/boardEdits'

/**
 * Makes one task from each note with words in it, one at a time, in order.
 * The task is what the item sheet would write for a bare title
 * (`writesFor`, as `useItemWriter` does); the note's other lines become its
 * description. Returns `{ made: [{ nodeId, taskId, title }], failed }`.
 */
export const createTasksFrom = async (notes) => {
  const made = []
  let failed = 0
  for (const note of notes) {
    const { title, body } = splitText(note.text)
    const name = title.trim()
    if (!name) continue
    try {
      const { task } = writesFor(factsFrom({ title: name }))
      const created = await tasksService.create({ ...task, is_completed: false, ...(body.trim() ? { description: body.trim() } : {}) })
      made.push({ nodeId: note.id, taskId: String(created?._id ?? created?.id ?? ''), title: name })
    } catch {
      failed += 1
    }
  }
  return { made, failed }
}

/**
 * What the board reaches outside itself (BOARD-005, BOARD-006): the tasks and
 * the plan its item tiles read, their tick, the item sheet a tile opens, the
 * cards a note made, Make items and Make cards. Wraps the canvas on the board
 * page; the sheets and the page's success line render here.
 */
export default function BoardLinks({ boardId, apply, children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { tasks, loading: tasksLoading, error: tasksError } = useTaskData()
  const { goals, areas, loading: planLoading, error: planError } = useAnnualPlan()
  // Every block comes back whatever the range; the item sheet finds the one an item spans.
  const [today] = useState(() => dateKeyOf(new Date()))
  const { blocks } = useBlocks({ from: today, to: today })

  const [itemSource, setItemSource] = useState(null)
  const [cardNotes, setCardNotes] = useState(null)
  const [lastDeckId, setLastDeckId] = useState(null)
  const [makingItems, setMakingItems] = useState(false)
  const [notice, setNotice] = useState(null)

  const loading = tasksLoading || planLoading
  const error = tasksError ?? planError ?? null

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] })
    queryClient.invalidateQueries({ queryKey: ['annualPlan', userId] })
    queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] })
  }, [userId])

  const read = useCallback((ref) => readItem(ref, { tasks, goals, loading, error }), [tasks, goals, loading, error])

  /** The tick: throws when the write fails, so the tile can take its optimistic state back. */
  const setDone = useCallback(
    async (ref, done, reading = null) => {
      try {
        if (ref.kind === 'milestone') {
          await annualPlanningService.updateMilestone(reading?.goalId ?? ref.goalId, ref.id, { completed: done })
        } else {
          await tasksService.update(ref.id, { is_completed: done })
        }
      } catch (err) {
        setNotice({ text: t('boards.item.tickFailed'), color: 'danger' })
        throw err
      } finally {
        refresh()
      }
    },
    [refresh, t]
  )

  const openItem = useCallback(
    (ref, reading) => {
      if (!reading || reading.status !== 'ready') return
      if (ref.kind === 'goal') {
        navigate(reading.areaId ? `/annual-planning/area/${reading.areaId}` : '/annual-planning')
        return
      }
      setItemSource(ref.kind === 'milestone' ? { milestone: reading.record, goalId: reading.goalId } : { task: reading.record })
    },
    [navigate]
  )

  /** No route shows chosen cards, so a note's cards open on the deck of the first of them. */
  const openCards = useCallback(
    async (node) => {
      const first = node?.cardIds?.[0]
      if (!first) return
      try {
        const card = await cardsService.getById(first)
        const deckId = card?.deck_id ?? card?.deckId
        if (!deckId) throw new Error('no deck')
        navigate(`/study/${deckId}?mode=browse`)
      } catch {
        setNotice({ text: t('boards.note.cardsFailed'), color: 'danger' })
      }
    },
    [navigate, t]
  )

  const makeItems = useCallback(
    async (notes) => {
      if (makingItems) return
      if (!notes.some((n) => splitText(n.text).title.trim())) {
        setNotice({ text: t('boards.items.empty'), color: 'neutral' })
        return
      }
      setMakingItems(true)
      const { made, failed } = await createTasksFrom(notes)
      setMakingItems(false)
      if (made.length) {
        apply((b) => notesToItems(b, made))
        refresh()
      }
      if (!made.length) setNotice({ text: t('boards.items.failed'), color: 'danger' })
      else if (failed) setNotice({ text: t('boards.items.partial', { made: made.length, total: made.length + failed }), color: 'warning' })
      else setNotice({ text: t('boards.items.made', { count: made.length }), color: 'success' })
    },
    [apply, makingItems, refresh, t]
  )

  const makeCards = useCallback((notes) => setCardNotes(notes), [])

  const linkCards = useCallback((made) => apply((b) => addCardIds(b, made)), [apply])

  const value = useMemo(
    () => ({ tasks, goals, areas, loading, error, read, setDone, openItem, openCards, makeItems, makingItems, makeCards }),
    [tasks, goals, areas, loading, error, read, setDone, openItem, openCards, makeItems, makingItems, makeCards]
  )

  return (
    <BoardLinksContext.Provider value={value}>
      {children}
      {itemSource && (
        <ItemSheet
          key={String(itemSource.task?._id ?? itemSource.task?.id ?? itemSource.milestone?.id ?? 'item')}
          open
          onClose={() => setItemSource(null)}
          onSaved={refresh}
          mode='edit'
          source={itemSource}
          blocks={blocks ?? []}
        />
      )}
      {cardNotes && (
        <MakeCardsSheet
          open
          boardId={boardId}
          notes={cardNotes}
          initialDeckId={lastDeckId}
          onClose={() => setCardNotes(null)}
          onLinked={linkCards}
          onDone={({ count, deckId, deckName }) => {
            setLastDeckId(deckId)
            setCardNotes(null)
            setNotice({ text: t('boards.cards.added', { count, deck: deckName }), color: 'success' })
          }}
        />
      )}
      <Snackbar
        open={Boolean(notice)}
        onClose={() => setNotice(null)}
        autoHideDuration={4000}
        color={notice?.color ?? 'neutral'}
        variant='soft'
        role={notice?.color === 'danger' ? 'alert' : 'status'}
      >
        {notice?.text}
      </Snackbar>
    </BoardLinksContext.Provider>
  )
}
