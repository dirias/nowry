import React, { useEffect, useRef, useState } from 'react'
import { Alert, Box, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useReauthRetry } from '@nowry/core/hooks/useReauthRetry'
import { useBugCounts, useBugList, useBugSave } from '@nowry/core/hooks/useAdminBugs'
import { nextBugSelection } from '@nowry/core/domain/bugReports'
import AdminReauthDialog from '../AdminReauthDialog'
import BugFilters from './BugFilters'
import BugList from './BugList'
import BugDetail from './BugDetail'
import { saveColor, saveText } from './bugText'

/** Below `md` the list and the card stack; a selection there scrolls to the card. */
const STACKED = '(max-width: 899.95px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const matches = (query) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)

const showCard = (node) => {
  if (!node || !matches(STACKED)) return
  node.scrollIntoView?.({ block: 'start', behavior: matches(REDUCED_MOTION) ? 'auto' : 'smooth' })
  node.focus?.({ preventScroll: true })
}

/** The selected report: the one chosen while it is listed, otherwise the first. */
const useSelection = (bugs) => {
  const [chosen, setChosen] = useState(null)
  const id = nextBugSelection(bugs, chosen)
  useEffect(() => {
    if (id !== chosen) setChosen(id)
  }, [id, chosen])
  return { id, bug: bugs.find((bug) => bug.id === id) ?? null, choose: setChosen }
}

/**
 * The Bug reports tab (ADMIN-007b, FR-011 Bug reports, board C): the states as
 * filters with their counts (New by default), the list and the selected
 * report's card, its status as one segmented control and its notes as a
 * history. Save runs through the re-sign-in (ADMIN-008b); what it answered is
 * said in the tab's live region, since a report whose state changed leaves the
 * list, and "Nothing to save yet" beside Save in the card.
 */
export default function BugsTab() {
  const { t } = useTranslation()
  const reauth = useReauthRetry()
  const [status, setStatus] = useState('new')
  const list = useBugList({ status })
  const counts = useBugCounts()
  const saving = useBugSave({ run: reauth.run })
  const selection = useSelection(list.bugs)
  const cardRef = useRef(null)

  const changeStatus = (next) => {
    saving.reset()
    selection.choose(null)
    setStatus(next)
  }
  const select = (id) => {
    saving.reset()
    selection.choose(id)
    requestAnimationFrame(() => showCard(cardRef.current))
  }

  const nothing = saving.outcome?.kind === 'nothing' ? saving.outcome : null
  const answered = saving.outcome && !nothing ? saving.outcome : null
  return (
    <Stack component='section' gap={1.5} aria-label={t('admin.tabs.bugs')} sx={{ minWidth: 0 }}>
      <BugFilters status={status} counts={counts} onStatus={changeStatus} />
      <Box role='status' aria-live='polite'>
        {answered && (
          <Alert variant='soft' color={saveColor(answered)} data-testid='bugs-result'>
            {saveText(t, answered)}
          </Alert>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.2fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
          minWidth: 0
        }}
      >
        <BugList list={list} selectedId={selection.id} onSelect={select} />
        {selection.bug && !list.error && (
          <BugDetail key={selection.bug.id} ref={cardRef} bug={selection.bug} busy={saving.busy} outcome={nothing} onSave={saving.save} />
        )}
      </Box>
      <AdminReauthDialog reauth={reauth} />
    </Stack>
  )
}
