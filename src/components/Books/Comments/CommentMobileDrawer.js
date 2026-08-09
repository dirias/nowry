import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer, Box, Stack, Sheet, Typography, Skeleton, Alert, Button, IconButton, Divider } from '@mui/joy'
import { MessageSquareOff, X, MessageCircle, MessageCircleWarning } from 'lucide-react'
import { useComments } from '../../../hooks/useComments'
import { CommentThreadContent } from './CommentThreadContent'

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

/**
 * CommentMobileDrawer — same comment data as CommentMarginRail, laid out as a
 * flat scrollable list instead of margin bubbles (there's no margin on
 * mobile). Mirrors this codebase's ContentNavigator desktop/mobile duality:
 * a Drawer wrapping the same kind of content, not a cut-down alternate feature.
 */
export default function CommentMobileDrawer({ open, onClose, resourceType, resourceId, onError, onCommentsChanged }) {
  const { t } = useTranslation()
  const [expandedId, setExpandedId] = useState(null)

  const handleMutationError = useCallback(
    (err) => {
      onError?.(err?.response?.data?.detail || t('comments.errors.generic'))
    },
    [onError, t]
  )

  const { comments, status, error, update, remove, refetch } = useComments(resourceType, resourceId, { onError: handleMutationError })

  const isLoading = status === 'loading' && comments.length === 0
  const isError = status === 'error'
  const isEmpty = status === 'ready' && comments.length === 0

  const handleRowClick = (commentId) => {
    setExpandedId((prev) => (prev === commentId ? null : commentId))
    const highlightEl = document.getElementById(`comment-anchor-${commentId}`)
    highlightEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} size='sm'>
      <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Typography level='title-lg'>{t('comments.drawerTitle')}</Typography>
          <IconButton size='sm' variant='plain' color='neutral' aria-label={t('common.close')} onClick={onClose} sx={focusRingSx}>
            <X size={18} />
          </IconButton>
        </Stack>
        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          {isLoading && (
            <Stack spacing={1.5}>
              <Skeleton variant='rectangular' height={56} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' height={56} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' height={56} sx={{ borderRadius: 'md' }} />
            </Stack>
          )}

          {isError && (
            <Alert color='danger' variant='soft' sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <Typography level='body-sm'>{error || t('comments.errors.loadFailed')}</Typography>
              <Button size='sm' variant='soft' color='danger' onClick={refetch} sx={focusRingSx}>
                {t('common.retry')}
              </Button>
            </Alert>
          )}

          {isEmpty && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <MessageSquareOff size={40} style={{ color: 'var(--joy-palette-text-tertiary)', opacity: 0.5, marginBottom: 8 }} />
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('comments.emptyTitle')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('comments.emptyHint')}
              </Typography>
            </Box>
          )}

          {!isLoading && !isError && comments.length > 0 && (
            <Stack spacing={1}>
              {comments.map((comment) => {
                // Orphan classification is computed by CommentAnchorPlugin against the
                // live Lexical DOM (see its `relocateComments`). This drawer has no
                // editor DOM to check against, so it always renders the resolved
                // variant — the desktop margin rail is the source of truth for that state.
                const isOrphaned = false
                const isExpanded = expandedId === comment._id
                return (
                  <Sheet key={comment._id} variant='outlined' sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      alignItems='center'
                      onClick={() => handleRowClick(comment._id)}
                      sx={{
                        px: 1.5,
                        py: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'background.level1' },
                        ...focusRingSx
                      }}
                    >
                      {isOrphaned ? (
                        <MessageCircleWarning size={16} style={{ opacity: 0.65, flexShrink: 0 }} />
                      ) : (
                        <MessageCircle size={16} style={{ flexShrink: 0 }} />
                      )}
                      <Typography level='body-sm' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {comment.body}
                      </Typography>
                    </Stack>
                    {isExpanded && (
                      <>
                        <Divider />
                        <CommentThreadContent
                          comment={comment}
                          isOrphaned={isOrphaned}
                          showCloseButton={false}
                          onClose={() => setExpandedId(null)}
                          onSave={async (body) => {
                            await update(comment._id, { body })
                            onCommentsChanged?.()
                          }}
                          onDelete={async () => {
                            await remove(comment._id)
                            setExpandedId(null)
                            onCommentsChanged?.()
                          }}
                        />
                      </>
                    )}
                  </Sheet>
                )
              })}
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
