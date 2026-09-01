import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Divider, Input, Modal, ModalClose, ModalDialog, Skeleton, Snackbar, Stack, Tooltip, Typography } from '@mui/joy'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import { blackboardService } from '../../api/services/blackboard.service'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

export default function BoardListSelector({ open, onClose, onSelectBoard }) {
  const { t } = useTranslation()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewInput, setShowNewInput] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)
  const [snackbar, setSnackbar] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    blackboardService
      .listBoards()
      .then((data) => setBoards(data || []))
      .catch(() => setError(t('blackboard.boardListSelector.error')))
      .finally(() => setLoading(false))
  }, [open, t])

  const handleSelectBoard = (board) => {
    onSelectBoard(board)
    onClose()
  }

  const handleNewBoard = () => {
    if (tier !== 'pro') {
      openUpgradeModal(t('blackboard.upgrade.multiBoard'))
      return
    }
    setShowNewInput(true)
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    setCreating(true)
    try {
      const created = await blackboardService.createBoard(newBoardName.trim())
      setBoards((prev) => [...prev, created])
      setNewBoardName('')
      setShowNewInput(false)
      setSnackbar({ message: created.name, color: 'success' })
    } catch (err) {
      setError(err.response?.data?.detail || t('blackboard.boardListSelector.error'))
    } finally {
      setCreating(false)
    }
  }

  const ownedBoards = boards.filter((b) => b.is_owner !== false)
  const sharedBoards = boards.filter((b) => b.is_owner === false)

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: '95%', sm: '85%', md: '75%', lg: '600px' },
          maxHeight: '80vh',
          overflowY: 'auto',
          p: 3
        }}
      >
        <ModalClose />
        <Typography level='title-lg' sx={{ mb: 0.5 }}>
          {t('blackboard.boardListSelector.title')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
          {t('blackboard.boardListSelector.subtitle')}
        </Typography>
        <Divider />

        {/* Loading state */}
        {loading && (
          <Stack gap={1} sx={{ mt: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant='rectangular' height={48} sx={{ borderRadius: 'md' }} />
            ))}
          </Stack>
        )}

        {/* Error state */}
        {!loading && error && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'danger.plainColor', mb: 1 }}>
              {error}
            </Typography>
            <Button
              size='sm'
              variant='outlined'
              color='neutral'
              onClick={() => {
                setLoading(true)
                setError(null)
                blackboardService
                  .listBoards()
                  .then(setBoards)
                  .catch(() => setError(t('blackboard.boardListSelector.error')))
                  .finally(() => setLoading(false))
              }}
            >
              {t('common.error') || 'Retry'}
            </Button>
          </Box>
        )}

        {/* Empty state */}
        {!loading && !error && boards.length === 0 && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <DashboardRoundedIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 1 }} />
            <Typography level='title-md' sx={{ color: 'text.secondary' }}>
              {t('blackboard.boardListSelector.empty.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('blackboard.boardListSelector.empty.body')}
            </Typography>
          </Box>
        )}

        {/* Success state — board list */}
        {!loading && !error && boards.length > 0 && (
          <Stack gap={0.5} sx={{ mt: 2 }}>
            {ownedBoards.length > 0 && (
              <>
                <Typography level='body-sm' sx={{ color: 'text.tertiary', px: 1, pt: 1 }}>
                  {t('blackboard.boardListSelector.ownedBoards')}
                </Typography>
                {ownedBoards.map((board) => (
                  <Box
                    key={board.id}
                    role='button'
                    tabIndex={0}
                    aria-label={board.name}
                    onClick={() => handleSelectBoard(board)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectBoard(board)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 'md',
                      cursor: 'pointer',
                      bgcolor: 'background.surface',
                      '&:hover': { bgcolor: 'background.level1' },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.outlinedBorder',
                        outlineOffset: '2px'
                      }
                    }}
                  >
                    <Typography level='body-md' sx={{ color: 'text.primary' }}>
                      {board.name}
                    </Typography>
                  </Box>
                ))}
              </>
            )}

            {sharedBoards.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography level='body-sm' sx={{ color: 'text.tertiary', px: 1 }}>
                  {t('blackboard.boardListSelector.sharedBoards')}
                </Typography>
                {sharedBoards.map((board) => (
                  <Box
                    key={board.id}
                    role='button'
                    tabIndex={0}
                    aria-label={board.name}
                    onClick={() => handleSelectBoard(board)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectBoard(board)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 'md',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'background.surface',
                      '&:hover': { bgcolor: 'background.level1' },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.outlinedBorder',
                        outlineOffset: '2px'
                      }
                    }}
                  >
                    <Typography level='body-md' sx={{ color: 'text.primary', flex: 1 }}>
                      {board.name}
                    </Typography>
                    <Chip size='sm' variant='soft' sx={{ bgcolor: 'background.level1', color: 'text.secondary' }}>
                      {t('blackboard.boardListSelector.sharedWith', {
                        name: board.owner_name || '...'
                      })}
                    </Chip>
                  </Box>
                ))}
              </>
            )}
          </Stack>
        )}

        {/* New board inline input (Pro only, shown after clicking New board) */}
        {showNewInput && (
          <Stack direction='row' gap={1} sx={{ mt: 2 }}>
            <Input
              autoFocus
              size='sm'
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder={t('blackboard.boardListSelector.newBoardPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
              sx={{ flex: 1 }}
            />
            <Button size='sm' variant='solid' loading={creating} onClick={handleCreateBoard} disabled={!newBoardName.trim()}>
              {t('common.add') || 'Create'}
            </Button>
            <Button
              size='sm'
              variant='plain'
              color='neutral'
              onClick={() => {
                setShowNewInput(false)
                setNewBoardName('')
              }}
            >
              {t('common.cancel')}
            </Button>
          </Stack>
        )}

        {/* New board button */}
        {!showNewInput && (
          <Box sx={{ mt: 2 }}>
            {tier === 'pro' ? (
              <Button
                startDecorator={<AddRoundedIcon />}
                size='sm'
                variant='outlined'
                color='neutral'
                onClick={handleNewBoard}
                aria-label={t('blackboard.boards.newBoard')}
              >
                {t('blackboard.boards.newBoard')}
              </Button>
            ) : (
              <Tooltip title={t('blackboard.upgrade.multiBoard')}>
                <span>
                  <Button
                    startDecorator={<LockRoundedIcon />}
                    size='sm'
                    variant='outlined'
                    color='neutral'
                    disabled
                    aria-label={t('blackboard.boards.newBoard') + ' (requires Pro)'}
                  >
                    {t('blackboard.boards.newBoard')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
        )}

        <Snackbar open={!!snackbar} autoHideDuration={3000} color={snackbar?.color} variant='soft' onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Snackbar>
      </ModalDialog>
    </Modal>
  )
}
