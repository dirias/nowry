import React, { useState, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Box, IconButton, Tooltip, Typography, Input, Stack, Chip, Modal, ModalDialog } from '@mui/joy'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded'
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useTranslation } from 'react-i18next'
import { STICKY_COLORS } from './nodes/StickyNoteNode'

const STICKY_EMOJIS = ['📝', '💡', '🎯', '⚡', '🔥', '✨', '🚀', '💪']

export default function BlackboardToolbar({ goals, priorities, tasks, onClearBoard }) {
  const { t } = useTranslation()
  const { addNodes, getViewport, screenToFlowPosition } = useReactFlow()
  const [entityPickerOpen, setEntityPickerOpen] = useState(false)
  const [entityType, setEntityType] = useState('goal')
  const [entitySearch, setEntitySearch] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

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
            sx={{ color: '#10b981', '&:hover': { bgcolor: '#d1fae5' } }}
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
            sx={{ color: '#f59e0b', '&:hover': { bgcolor: '#fef3c7' } }}
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
            sx={{ color: '#6366f1', '&:hover': { bgcolor: '#ede9fe' } }}
          >
            <TaskAltRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

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
                { type: 'goal', icon: '🎯', color: '#10b981' },
                { type: 'priority', icon: '🚩', color: '#f59e0b' },
                { type: 'task', icon: '✅', color: '#6366f1' }
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
                    bgcolor: entityType === type ? color + '22' : 'transparent',
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
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
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
            <IconButton variant='plain' color='neutral' onClick={() => setConfirmClear(false)}>
              <CloseRoundedIcon />
            </IconButton>
            <Box
              component='button'
              onClick={() => {
                onClearBoard?.()
                setConfirmClear(false)
              }}
              sx={{
                bgcolor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 'sm',
                px: 2,
                py: 0.75,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {t('blackboard.clear.confirm', 'Clear everything')}
            </Box>
          </Stack>
        </ModalDialog>
      </Modal>
    </>
  )
}
