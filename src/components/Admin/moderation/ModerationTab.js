import React, { useEffect, useRef, useState } from 'react'
import { Alert, Box, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useReauthRetry } from '@nowry/core/hooks/useReauthRetry'
import { useModerationAction, useModerationQueue } from '@nowry/core/hooks/useAdminModeration'
import { itemKey, nextSelection } from '@nowry/core/domain/moderation'
import AdminReauthDialog from '../AdminReauthDialog'
import ModerationFilters from './ModerationFilters'
import ModerationQueue from './ModerationQueue'
import ModerationItem from './ModerationItem'
import { outcomeColor, outcomeText } from './moderationText'

/** Below `md` the queue and the card stack; a selection there scrolls to the card. */
const STACKED = '(max-width: 899.95px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const matches = (query) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)

/** Brings the card into view on a phone, where it sits under the queue. */
const showCard = (node) => {
  if (!node || !matches(STACKED)) return
  node.scrollIntoView?.({ block: 'start', behavior: matches(REDUCED_MOTION) ? 'auto' : 'smooth' })
  node.focus?.({ preventScroll: true })
}

/**
 * The selection: the key chosen, and where an item that just left the list sat,
 * so the one that takes its place is selected next (board B).
 */
const useSelection = (items) => {
  const [chosen, setChosen] = useState({ key: null, leftAt: null })
  const key = nextSelection(items, chosen.key, chosen.leftAt)
  useEffect(() => {
    if (key !== chosen.key) setChosen({ key, leftAt: null })
  }, [key, chosen.key])
  return {
    key,
    item: items.find((entry) => itemKey(entry) === key) ?? null,
    choose: (next) => setChosen({ key: next, leftAt: null }),
    left: (gone) => setChosen({ key: gone, leftAt: items.findIndex((entry) => itemKey(entry) === gone) }),
    clear: () => setChosen({ key: null, leftAt: null })
  }
}

/**
 * The Moderation tab (ADMIN-003, FR-004, FR-011 Moderation, board B): filter
 * the queue by state, pick an item, read its reports, keep it public or
 * unpublish it — with its public copies — after the confirmation in place.
 * Both writes run through the re-sign-in (ADMIN-008b); the answer is said in
 * a live region and the next item is selected.
 */
export default function ModerationTab() {
  const { t } = useTranslation()
  const reauth = useReauthRetry()
  const [state, setState] = useState('to_review')
  const [confirming, setConfirming] = useState(false)
  const queue = useModerationQueue({ state })
  const action = useModerationAction({ run: reauth.run })
  const selection = useSelection(queue.items)
  const cardRef = useRef(null)

  const changeState = (next) => {
    setConfirming(false)
    selection.clear()
    setState(next)
  }
  const select = (key) => {
    setConfirming(false)
    selection.choose(key)
    requestAnimationFrame(() => showCard(cardRef.current))
  }
  const finish = (item) => (done) => {
    if (!done) return
    setConfirming(false)
    selection.left(itemKey(item))
  }

  return (
    <Stack component='section' gap={1.5} aria-label={t('admin.tabs.moderation')} sx={{ minWidth: 0 }}>
      <ModerationFilters state={state} totals={queue.totals} onState={changeState} />
      <Box role='status' aria-live='polite'>
        {action.outcome && (
          <Alert variant='soft' color={outcomeColor(action.outcome)} data-testid='moderation-result'>
            {outcomeText(t, action.outcome)}
          </Alert>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
          minWidth: 0
        }}
      >
        <ModerationQueue queue={queue} state={state} selectedKey={selection.key} onSelect={select} />
        {selection.item && !queue.error && (
          <ModerationItem
            ref={cardRef}
            item={selection.item}
            state={state}
            busy={action.busy}
            confirming={confirming}
            onConfirming={setConfirming}
            onKeep={(item) => action.keep(item).then(finish(item))}
            onRemove={(item, removal) => action.remove(item, removal).then(finish(item))}
          />
        )}
      </Box>
      <AdminReauthDialog reauth={reauth} />
    </Stack>
  )
}
