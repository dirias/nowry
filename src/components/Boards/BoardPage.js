import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Container, Link, Skeleton, Snackbar, Stack, Typography } from '@mui/joy'
import { useBoard } from '@nowry/core/hooks/useBoard'
import { useBoards } from '@nowry/core/hooks/useBoards'
import { useAuth } from '@nowry/core/context/AuthContext'
import BoardBar from './BoardBar'
import BoardCanvas from './canvas/BoardCanvas'
import KeysSheet from './canvas/KeysSheet'
import ShareSheet from './ShareSheet'
import DeleteBoardDialog from './DeleteBoardDialog'
import useBoardShare from './useBoardShare'
import { firstNoteName } from './boardMeta'

const statusOf = (err) => err?.response?.status ?? err?.status ?? null

const PAGE = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }

function BoardSkeleton() {
  return (
    <Box sx={PAGE} data-testid='board-loading'>
      <Box
        sx={{ minHeight: 52, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Skeleton variant='text' level='body-sm' width={72} />
        <Skeleton variant='text' level='title-md' width={180} />
        <Skeleton variant='text' level='body-sm' width={56} />
      </Box>
      <Box sx={{ flex: 1, bgcolor: 'background.level1' }} />
    </Box>
  )
}

function Unavailable({ messageKey, onRetry }) {
  const { t } = useTranslation()
  return (
    <Container maxWidth='sm' sx={{ py: 8 }}>
      <Stack spacing={2} alignItems='flex-start' role='alert'>
        <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
          {t(messageKey)}
        </Typography>
        <Stack direction='row' spacing={2} alignItems='center'>
          {onRetry && (
            <Button variant='soft' color='neutral' onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )}
          <Link component={RouterLink} to='/boards'>
            {t('boards.page.backToBoards')}
          </Link>
        </Stack>
      </Stack>
    </Container>
  )
}

/**
 * One board (BOARD-003, PRD D1, D4): the board bar over the canvas. Opened
 * with `?new=1` on an empty board, it starts on one note, already typing, with
 * a quiet hint under it until the second note; the board's name follows that
 * first note until the person renames it. Leaving with edits not yet saved
 * asks first; leaving the page flushes them (useBoard).
 */
function BoardView({ id }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { board, error, status, hasPending, apply, checkpoint, undo, redo, setViewport, rename, reload } = useBoard(id)
  const { duplicate, remove } = useBoards({ enabled: false })
  const { shareId, share, closeShare } = useBoardShare()

  const [isNew] = useState(() => params.get('new') === '1')
  const followRef = useRef(null)
  const [hint, setHint] = useState(isNew)
  const [keysOpen, setKeysOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [notice, setNotice] = useState(null)

  // The `new` flag does its work once: a reload opens the board as it is.
  useEffect(() => {
    if (board && params.get('new')) setParams({}, { replace: true })
  }, [board, params, setParams])

  // The name follows the first note while the board is new and unnamed.
  useEffect(() => {
    if (!board) return
    if (followRef.current === null) followRef.current = isNew && board.name === t('boards.untitled')
    if (!followRef.current) return
    const line = firstNoteName(board.nodes)
    if (line === null) return
    const next = line || t('boards.untitled')
    if (next !== board.name) rename(next)
  }, [board, isNew, rename, t])

  // The hint goes after the second note and never comes back on this board.
  const noteCount = board ? board.nodes.filter((n) => n.kind === 'note').length : 0
  useEffect(() => {
    if (hint && noteCount >= 2) setHint(false)
  }, [hint, noteCount])

  // Unsaved edits: the browser asks before the tab closes.
  useEffect(() => {
    if (!hasPending) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasPending])

  const renameBoard = useCallback(
    (name) => {
      followRef.current = false
      rename(name)
    },
    [rename]
  )

  const duplicateBoard = async () => {
    try {
      const copy = await duplicate(id)
      navigate(`/boards/${copy.id}`)
    } catch (err) {
      setNotice(t(statusOf(err) === 402 ? 'boards.limit' : 'boards.duplicateFailed'))
    }
  }

  const deleteBoard = async () => {
    setDeletePending(true)
    try {
      await remove(id)
      navigate('/boards')
    } catch {
      setNotice(t('boards.delete.failed'))
      setDeletePending(false)
      setDeleting(false)
    }
  }

  if (!board) {
    if (error) {
      const code = statusOf(error)
      if (code === 404 || code === 403) return <Unavailable messageKey='boards.page.notFound' />
      return <Unavailable messageKey='boards.page.loadError' onRetry={reload} />
    }
    return <BoardSkeleton />
  }

  const isOwner = Boolean(user?.id) && board.ownerId === user.id
  const name = board.name || t('boards.untitled')

  return (
    <Box sx={PAGE}>
      <BoardBar
        name={name}
        status={status}
        hasPending={hasPending}
        collaborators={board.collaborators?.length ?? 0}
        canShare={isOwner}
        canDelete={isOwner}
        onRename={renameBoard}
        onShare={() => share(id)}
        onDuplicate={duplicateBoard}
        onDelete={() => setDeleting(true)}
        onShowKeys={() => setKeysOpen(true)}
      />
      <BoardCanvas
        board={board}
        apply={apply}
        checkpoint={checkpoint}
        undo={undo}
        redo={redo}
        setViewport={setViewport}
        startWithNote={isNew}
        hint={hint}
        onShowKeys={() => setKeysOpen(true)}
      />
      <KeysSheet open={keysOpen} onClose={() => setKeysOpen(false)} />
      {shareId && <ShareSheet open boardId={shareId} onClose={closeShare} onInvited={reload} />}
      <DeleteBoardDialog open={deleting} name={name} onClose={() => setDeleting(false)} onConfirm={deleteBoard} loading={deletePending} />
      <Snackbar open={Boolean(notice)} onClose={() => setNotice(null)} autoHideDuration={4000} color='danger' variant='soft' role='alert'>
        {notice}
      </Snackbar>
    </Box>
  )
}

/** Each board is its own page: moving to another board (a duplicate) starts its state afresh. */
export default function BoardPage() {
  const { id } = useParams()
  return <BoardView key={id} id={id} />
}
