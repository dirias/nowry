import React, { useState, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Box, Button, Chip, IconButton, Tooltip, Typography, Input, Stack, Modal, ModalDialog } from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded'
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import ShareRoundedIcon from '@mui/icons-material/ShareRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import { useTranslation } from 'react-i18next'
import { STICKY_COLORS } from './nodes/StickyNoteNode'

const STICKY_EMOJIS = ['📝', '💡', '🎯', '⚡', '🔥', '✨', '🚀', '💪']

export default function BlackboardToolbar({
  goals,
  priorities,
  tasks,
  onClearBoard,
  nodes,
  onConvertToCards,
  onShareBoard,
  onOpenBoardSwitcher,
  currentBoardName,
  tier
}) {
  const { t } = useTranslation()
  const { addNodes, getViewport, screenToFlowPosition } = useReactFlow()
  const [entityPickerOpen, setEntityPickerOpen] = useState(false)
  const [entityType, setEntityType] = useState('goal')
  const [entitySearch, setEntitySearch] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  // Compute selected node count for conditional Convert to Cards button
  const selectedCount = (nodes || []).filter((n) => n.selected).length

  // Add a random sticky note at viewport center
  const addSticky = useCallback(() => {
    const vp = getViewport()
    const centerX = (window.innerWidth / 2 - vp.x) / vp.zoom
    const centerY = (window.innerHeight / 2 - vp.y) / vp.zoom
    const randomColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)].id
    const randomEmoji = STICKY_EMOJIS[Math.floor(Math.random() * STICKY_EMOJIS.length)]
    const id = `sticky-${Date.now()}`

    addNodes({
      id,
      type: 'stickyNote',
      position: { x: centerX - 100 + Math.random() * 40, y: centerY - 70 + Math.random() * 40 },
      data: {
        title: '',
        body: '',
        color: randomColor,
        emoji: randomEmoji
      }
    })
  }, [addNodes, getViewport])

  // Add a text title node
  const addTitle = useCallback(() => {
    const vp = getViewport()
    const centerX = (window.innerWidth / 2 - vp.x) / vp.zoom
    const centerY = (window.innerHeight / 2 - vp.y) / vp.zoom
    addNodes({
      id: `title-${Date.now()}`,
      type: 'titleNode',
      position: { x: centerX - 100 + Math.random() * 40, y: centerY - 40 + Math.random() * 40 },
      data: { label: '' }
    })
  }, [addNodes, getViewport])

  // Add a grouping square zone
  const addSquare = useCallback(() => {
    const vp = getViewport()
    const centerX = (window.innerWidth / 2 - vp.x) / vp.zoom
    const centerY = (window.innerHeight / 2 - vp.y) / vp.zoom
    addNodes({
      id: `square-${Date.now()}`,
      type: 'squareNode',
      position: { x: centerX - 150 + Math.random() * 40, y: centerY - 150 + Math.random() * 40 },
      data: {}
    })
  }, [addNodes, getViewport])

  // Entity list based on selected type
  const entityList = entityType === 'goal' ? goals : entityType === 'priority' ? priorities : tasks
  const filtered = (entityList || []).filter((e) => (e.title || e.name || '').toLowerCase().includes(entitySearch.toLowerCase()))

  const addEntityNode = useCallback(
    (entity) => {
      const vp = getViewport()
      const centerX = (window.innerWidth / 2 - vp.x) / vp.zoom
      const centerY = (window.innerHeight / 2 - vp.y) / vp.zoom
      const id = `entity-${entity._id || entity.id}-${Date.now()}`

      addNodes({
        id,
        type: 'entity',
        position: { x: centerX - 100 + Math.random() * 80, y: centerY - 60 + Math.random() * 60 },
        data: {
          entityType,
          entityId: entity._id || entity.id,
          title: entity.title || entity.name,
          status: entity.status,
          areaName: entity.focus_area_name || entity.areaName
        }
      })
      setEntityPickerOpen(false)
      setEntitySearch('')
    },
    [addNodes, getViewport, entityType]
  )

  return (
    <>
      {/* ── Floating toolbar pill ── */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'xl',
          px: 1.5,
          py: 1,
          boxShadow: 'lg',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Add Sticky */}
        <Tooltip title={t('blackboard.toolbar.addSticky', 'Add sticky note')} placement='top' size='sm'>
          <Box
            onClick={addSticky}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.5,
              borderRadius: 'lg',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: 'background.level1' }
            }}
          >
            <Box component='span' sx={{ fontSize: '1.1rem' }}>
              📝
            </Box>
            <Typography level='body-xs' sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem' }}>
              {t('blackboard.toolbar.sticky', 'Sticky')}
            </Typography>
          </Box>
        </Tooltip>

        {/* Add Title */}
        <Tooltip title={t('blackboard.toolbar.addTitle', 'Add text block')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            onClick={addTitle}
            sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.level1' } }}
          >
            <TextFieldsRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Add Square Zone */}
        <Tooltip title={t('blackboard.toolbar.addSquare', 'Add square zone')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            onClick={addSquare}
            sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.level1' } }}
          >
            <CheckBoxOutlineBlankRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Divider */}
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', flexShrink: 0 }} />

        {/* Add Goal */}
        <Tooltip title={t('blackboard.toolbar.addGoal', 'Add a goal')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            onClick={() => {
              setEntityType('goal')
              setEntityPickerOpen(true)
            }}
            sx={{ color: 'success.plainColor', '&:hover': { bgcolor: 'success.softBg' } }}
          >
            <TrackChangesRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Add Priority */}
        <Tooltip title={t('blackboard.toolbar.addPriority', 'Add a priority')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            onClick={() => {
              setEntityType('priority')
              setEntityPickerOpen(true)
            }}
            sx={{ color: 'warning.plainColor', '&:hover': { bgcolor: 'warning.softBg' } }}
          >
            <FlagRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Add Task */}
        <Tooltip title={t('blackboard.toolbar.addTask', 'Add a task')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            onClick={() => {
              setEntityType('task')
              setEntityPickerOpen(true)
            }}
            sx={{ color: 'primary.plainColor', '&:hover': { bgcolor: 'primary.softBg' } }}
          >
            <TaskAltRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Divider before Phase 7 buttons */}
        {selectedCount > 0 && <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', flexShrink: 0 }} />}

        {/* Convert to Cards button — visible when nodes are selected */}
        {selectedCount > 0 && (
          <Tooltip title={t('blackboard.toolbar.convertToCards', 'Convert selected nodes to flashcards')} placement='top' size='sm'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip size='sm' variant='soft' color='primary'>
                {selectedCount}
              </Chip>
              <IconButton
                onClick={onConvertToCards}
                size='sm'
                variant='plain'
                aria-label={t('blackboard.toolbar.convertToCards', 'Convert selected nodes to flashcards')}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'primary.softBg' }
                }}
              >
                <StyleRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Tooltip>
        )}

        {/* My Boards — Pro tier only */}
        {tier === 'pro' && (
          <>
            <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', flexShrink: 0 }} />
            <Tooltip title={t('blackboard.toolbar.myBoards', 'My Boards')} placement='top' size='sm'>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                onClick={onOpenBoardSwitcher}
                startDecorator={<FolderRoundedIcon sx={{ fontSize: 14 }} />}
                aria-label={t('blackboard.toolbar.myBoards', 'My Boards')}
                sx={{
                  borderRadius: 'lg',
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  maxWidth: 120,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  color: 'text.secondary',
                  bgcolor: 'background.level1',
                  '&:hover': { bgcolor: 'background.level2' },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.outlinedBorder',
                    outlineOffset: 2
                  }
                }}
              >
                {currentBoardName || t('blackboard.toolbar.myBoards', 'My Boards')}
              </Button>
            </Tooltip>
          </>
        )}

        {/* Divider before Share */}
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', flexShrink: 0 }} />

        {/* Share board — tier-gated */}
        {tier !== 'free' ? (
          <Tooltip title={t('blackboard.toolbar.shareBoard', 'Share board with collaborators')} placement='top' size='sm'>
            <IconButton
              onClick={onShareBoard}
              size='sm'
              variant='plain'
              aria-label={t('blackboard.toolbar.shareBoard', 'Share board with collaborators')}
              sx={{
                color: 'text.secondary',
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              <ShareRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t('blackboard.upgrade.share', 'Share boards with Plus or Pro')} placement='top' size='sm'>
            <span>
              <IconButton
                disabled
                size='sm'
                variant='plain'
                aria-label={t('blackboard.toolbar.shareBoard', 'Share board with collaborators') + ' (requires Plus or Pro)'}
                sx={{ color: 'text.tertiary', position: 'relative' }}
              >
                <LockRoundedIcon sx={{ fontSize: 10, position: 'absolute', top: 4, right: 4 }} />
                <ShareRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Divider */}
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', flexShrink: 0 }} />

        {/* Clear */}
        <Tooltip title={t('blackboard.toolbar.clear', 'Clear board')} placement='top' size='sm'>
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={() => setConfirmClear(true)}
            sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <DeleteForeverRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Entity Picker Modal ── */}
      <Modal open={entityPickerOpen} onClose={() => setEntityPickerOpen(false)}>
        <ModalDialog
          sx={{
            width: 360,
            maxWidth: '95vw',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 'lg',
            p: 2.5
          }}
        >
          {/* Header */}
          <Stack direction='row' alignItems='center' sx={{ mb: 1.5 }}>
            <Typography level='title-sm' sx={{ flex: 1 }}>
              {t(`blackboard.picker.title.${entityType}`, `Select a ${entityType}`)}
            </Typography>
            {/* Type switcher */}
            <Stack direction='row' spacing={0.5} sx={{ mr: 1 }}>
              {[
                { type: 'goal', icon: '🎯', color: 'success' },
                { type: 'priority', icon: '🚩', color: 'warning' },
                { type: 'task', icon: '✅', color: 'primary' }
              ].map(({ type, icon, color }) => (
                <Box
                  key={type}
                  onClick={() => setEntityType(type)}
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 'sm',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    bgcolor: entityType === type ? `${color}.softBg` : 'transparent',
                    transition: 'bgcolor 0.15s'
                  }}
                >
                  {icon}
                </Box>
              ))}
            </Stack>
            <IconButton size='sm' variant='plain' onClick={() => setEntityPickerOpen(false)}>
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>

          {/* Search */}
          <Input
            size='sm'
            placeholder={t('blackboard.picker.search', 'Search...')}
            startDecorator={<SearchRoundedIcon sx={{ fontSize: 16 }} />}
            value={entitySearch}
            onChange={(e) => setEntitySearch(e.target.value)}
            autoFocus
            sx={{ mb: 1.5 }}
          />

          {/* List */}
          <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <Typography level='body-sm' sx={{ color: 'text.tertiary', textAlign: 'center', py: 3 }}>
                {t('blackboard.picker.empty', 'Nothing found')}
              </Typography>
            ) : (
              <Stack spacing={0.25}>
                {filtered.map((entity) => (
                  <Box
                    key={entity._id || entity.id}
                    onClick={() => addEntityNode(entity)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 'sm',
                      cursor: 'pointer',
                      transition: 'bgcolor 0.12s',
                      '&:hover': { bgcolor: 'background.level1' }
                    }}
                  >
                    <Typography level='body-sm' sx={{ fontWeight: 500 }}>
                      {entity.title || entity.name}
                    </Typography>
                    {(entity.status || entity.areaName) && (
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {[entity.status?.replace('_', ' '), entity.areaName].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </ModalDialog>
      </Modal>

      {/* ── Clear Confirm ── */}
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)}>
        <ModalDialog sx={{ width: 320, bgcolor: 'background.surface' }}>
          <Typography level='title-sm' sx={{ mb: 1 }}>
            {t('blackboard.clear.title', 'Clear board?')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
            {t('blackboard.clear.desc', 'All notes and connections will be permanently removed.')}
          </Typography>
          <Stack direction='row' spacing={1} justifyContent='flex-end'>
            <Button variant='plain' color='neutral' onClick={() => setConfirmClear(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant='solid'
              color='danger'
              onClick={() => {
                onClearBoard?.()
                setConfirmClear(false)
              }}
              aria-label={t('blackboard.clear.confirm', 'Clear everything')}
            >
              {t('blackboard.clear.confirm', 'Clear everything')}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </>
  )
}
