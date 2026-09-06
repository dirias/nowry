import React, { useId, useState } from 'react'
import { Box, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import { listRow, oneLine, readout } from '../Common/Form/formStyles'
import { useDeckData } from '../../hooks/useDeckData'
import { MOTION } from '../../theme/tokens'
import DeckRow from '../Study/DeckRow'

const OPEN_KEY = 'nowry_archived_decks_open'

const readOpen = () => {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

const writeOpen = (open) => {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // A private window without storage simply forgets; nothing else depends on it.
  }
}

/**
 * The foot of the Decks view (PRD D18, ADR-023 point 4): a hairline, then one
 * disclosure row — "Archived · N" with a line of meta — that opens into the
 * archived decks as rows in their archived variant, a Restore key each. Not a
 * segment, a tab or a page; absent while nothing is archived (§11: no zero
 * counters). The list is its own key, so the dashboard never sees it.
 *
 * Open or closed is remembered for the session, not forever: a user who
 * opened it to restore one deck should not meet it open every day after.
 */
export default function ArchivedDecks({ onRestore }) {
  const { t } = useTranslation()
  const listId = useId()
  const { decks, loading } = useDeckData(undefined, { archived: true })
  const [open, setOpen] = useState(readOpen)

  if (loading || decks.length === 0) return null

  const toggle = () => {
    setOpen((prev) => {
      writeOpen(!prev)
      return !prev
    })
  }
  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  return (
    <Box data-testid='archived-decks' sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <Box
        role='button'
        tabIndex={0}
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
        onKeyDown={onKeyDown}
        sx={{ ...listRow, gap: 1.5, cursor: 'pointer' }}
      >
        <ExpandMoreRounded
          aria-hidden='true'
          sx={{
            fontSize: 'xl',
            color: 'text.tertiary',
            flexShrink: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: `transform ${MOTION.duration.quick}ms ${MOTION.easing.standard}`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Stack direction='row' spacing={1} alignItems='baseline'>
            <Typography level='title-sm' sx={oneLine}>
              {t('cards.archived.title')}
            </Typography>
            <Typography level='body-sm' sx={readout}>
              {decks.length}
            </Typography>
          </Stack>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', ...oneLine }}>
            {t('cards.archived.meta')}
          </Typography>
        </Box>
      </Box>
      {open && (
        <Box id={listId} data-testid='archived-decks-list' sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {decks.map((deck) => (
            <DeckRow key={deck._id} deck={deck} archived onRestore={onRestore} />
          ))}
        </Box>
      )}
    </Box>
  )
}
