import React, { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Container, Link, Skeleton, Snackbar, Stack, Typography } from '@mui/joy'
import AddRounded from '@mui/icons-material/AddRounded'
import { useBoards } from '@nowry/core/hooks/useBoards'
import BoardTile from './BoardTile'
import ShareSheet from './ShareSheet'
import useBoardShare from './useBoardShare'
import DeleteBoardDialog from './DeleteBoardDialog'
import { readout } from '../Common/Form/formStyles'

const GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
  gap: { xs: 2, md: 2.5 }
}

const isPlanLimit = (err) => err?.response?.status === 402 || err?.response?.data?.detail === 'board_limit_reached'

/** Three tiles' worth of placeholder, in the tiles' own shape. */
function TileSkeletons() {
  return (
    <Box sx={GRID} data-testid='boards-loading'>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{ borderRadius: 'lg', border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.surface' }}
        >
          <Skeleton variant='rectangular' height={150} />
          <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton variant='text' level='title-md' width='60%' />
            <Skeleton variant='text' level='body-xs' width='85%' />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/**
 * The boards page (BOARD-003, PRD D1, canvas board 1): every board as a tile
 * with its outline, name and what it made; the page's one solid key makes a
 * new board and opens it on its first note. A full plan says so in one line
 * under the key — the key stays pressable.
 */
export default function BoardsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { boards, loading, error, create, rename, duplicate, remove, reload } = useBoards()
  const { shareId, share, closeShare } = useBoardShare()
  const [creating, setCreating] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  const [notice, setNotice] = useState(null)

  const list = boards ?? []

  const newBoard = async () => {
    setCreating(true)
    try {
      const board = await create(t('boards.untitled'))
      setLimitReached(false)
      navigate(`/boards/${board.id}?new=1`)
    } catch (err) {
      if (isPlanLimit(err)) setLimitReached(true)
      else setNotice(t('boards.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const attempt = async (work, failKey) => {
    try {
      await work()
    } catch (err) {
      setNotice(t(isPlanLimit(err) ? 'boards.limit' : failKey))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    await attempt(() => remove(deleting.id), 'boards.delete.failed')
    setDeletePending(false)
    setDeleting(null)
  }

  let body
  if (loading) body = <TileSkeletons />
  else if (error) {
    body = (
      <Stack spacing={1.5} alignItems='flex-start' role='alert'>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('boards.loadError')}
        </Typography>
        <Button variant='soft' color='neutral' onClick={reload}>
          {t('common.retry')}
        </Button>
      </Stack>
    )
  } else if (!list.length) {
    body = (
      <Typography level='body-md' sx={{ color: 'text.secondary', maxWidth: 560 }} data-testid='boards-empty'>
        {t('boards.empty')}
      </Typography>
    )
  } else {
    body = (
      <Box sx={GRID}>
        {list.map((board) => (
          <BoardTile
            key={board.id}
            board={board}
            onOpen={(b) => navigate(`/boards/${b.id}`)}
            onRename={(b, name) => attempt(() => rename(b.id, name), 'boards.renameFailed')}
            onDuplicate={(b) => attempt(() => duplicate(b.id), 'boards.duplicateFailed')}
            onShare={(b) => share(b.id)}
            onDelete={(b) => setDeleting(b)}
          />
        ))}
      </Box>
    )
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Stack direction='row' spacing={1.5} alignItems='baseline' sx={{ minWidth: 0 }}>
          <Typography level='h2' component='h1'>
            {t('boards.title')}
          </Typography>
          {!loading && !error && (
            <Typography level='body-sm' sx={{ ...readout, color: 'text.secondary' }} data-testid='boards-count'>
              {t('boards.count', { count: list.length })}
            </Typography>
          )}
        </Stack>
        <Stack alignItems='flex-end' spacing={0.75} sx={{ flexShrink: 0 }}>
          <Button startDecorator={<AddRounded />} loading={creating} onClick={newBoard}>
            {t('boards.newBoard')}
          </Button>
          {limitReached && (
            <Typography
              level='body-xs'
              role='status'
              sx={{ color: 'text.secondary', textAlign: 'right', maxWidth: 320 }}
              data-testid='boards-limit'
            >
              {t('boards.limit')}{' '}
              <Link component={RouterLink} to='/plans' level='body-xs'>
                {t('boards.seePlans')}
              </Link>
            </Typography>
          )}
        </Stack>
      </Box>

      {body}

      {shareId && <ShareSheet open boardId={shareId} onClose={closeShare} onInvited={reload} />}

      <DeleteBoardDialog
        open={Boolean(deleting)}
        name={deleting?.name}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletePending}
      />

      <Snackbar open={Boolean(notice)} onClose={() => setNotice(null)} autoHideDuration={4000} color='danger' variant='soft' role='alert'>
        {notice}
      </Snackbar>
    </Container>
  )
}
