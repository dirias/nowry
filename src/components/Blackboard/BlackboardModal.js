import React, { useCallback, useRef, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, Modal, ModalDialog, Typography, IconButton, Tooltip, CircularProgress } from '@mui/joy'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useTranslation } from 'react-i18next'
import StickyNoteNode from './nodes/StickyNoteNode'
import EntityNode from './nodes/EntityNode'
import TitleNode from './nodes/TitleNode'
import SquareNode from './nodes/SquareNode'
import BlackboardToolbar from './BlackboardToolbar'
import BoardListSelector from './BoardListSelector'
import ShareBoardModal from './ShareBoardModal'
import ConvertToCardsModal from './ConvertToCardsModal'
import { blackboardService } from '../../api/services/blackboard.service'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'
import { useSubscription } from '../../hooks/useSubscription'
import { tasksService } from '../../api/services'

const BOARD_ID = 'main' // fallback board id for legacy boards
const AUTOSAVE_DELAY = 1500

const nodeTypes = {
  stickyNote: StickyNoteNode,
  entity: EntityNode,
  titleNode: TitleNode,
  squareNode: SquareNode
}

// Inner canvas — must be inside ReactFlowProvider
function BlackboardCanvas({ goals, priorities, tasks, activeBoardId, currentBoardName, onConvertToCards, onOpenConvertModal, onShareBoard, onOpenBoardSwitcher, tier }) {
  const { t } = useTranslation()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const autosaveTimer = useRef(null)
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 })

  // ── Cleanup autosave timer on unmount ─────────────────────────────────
  useEffect(() => {
    return () => clearTimeout(autosaveTimer.current)
  }, [])

  // ── Auto-save (debounced 1.5s) ────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          // Strip non-serializable callbacks before sending to backend
          const serializableNodes = currentNodes.map((n) => ({
            ...n,
            data: Object.fromEntries(Object.entries(n.data).filter(([k]) => typeof n.data[k] !== 'function'))
          }))
          blackboardService
            .saveBoard(activeBoardId, {
              nodes: serializableNodes,
              edges: currentEdges,
              viewport: viewportRef.current
            })
            .catch(console.error)
          return currentEdges
        })
        return currentNodes
      })
    }, AUTOSAVE_DELAY)
  }, [activeBoardId, setNodes, setEdges])

  // ── Node CRUD helpers ─────────────────────────────────────────────────
  const updateNodeData = useCallback(
    (id, updates) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)))
      scheduleSave()
    },
    [setNodes, scheduleSave]
  )

  const deleteNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      scheduleSave()
    },
    [setNodes, setEdges, scheduleSave]
  )

  // ── Rehydrate node callbacks after load ───────────────────────────────
  const rehydrateNode = useCallback(
    (node) => {
      if (node.type === 'stickyNote') {
        return {
          ...node,
          data: {
            ...node.data,
            onUpdate: (updates) => updateNodeData(node.id, updates),
            onDelete: () => deleteNode(node.id)
          }
        }
      }
      if (node.type === 'entity') {
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: () => deleteNode(node.id)
          }
        }
      }
      return node
    },
    [updateNodeData, deleteNode]
  )

  // ── Load board when activeBoardId changes ─────────────────────────────
  useEffect(() => {
    if (!activeBoardId) return
    setLoading(true)
    blackboardService
      .getBoard(activeBoardId)
      .then((board) => {
        // Rehydrate callbacks — they're stripped out during JSON serialization
        const rehydratedNodes = (board.nodes || []).map((n) => rehydrateNode(n))
        setNodes(rehydratedNodes)
        setEdges(board.edges || [])
        if (board.viewport) viewportRef.current = board.viewport
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeBoardId, rehydrateNode, setEdges, setNodes])

  // ── Edge connect ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds))
      scheduleSave()
    },
    [setEdges, scheduleSave]
  )

  // ── Edge connect ──────────────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      // Only save on position changes (drag end), not on select/hover
      if (changes.some((c) => c.type === 'position' && !c.dragging)) {
        scheduleSave()
      }
    },
    [onNodesChange, scheduleSave]
  )

  const onNodeDragStart = useCallback(
    (_, node) => {
      setNodes((nds) => {
        const maxZ = Math.max(0, ...nds.map((n) => n.zIndex || 0))
        return nds.map((n) => (n.id === node.id ? { ...n, zIndex: maxZ + 1 } : n))
      })
    },
    [setNodes]
  )

  const onNodeClick = useCallback(
    (_, node) => {
      setNodes((nds) => {
        const maxZ = Math.max(0, ...nds.map((n) => n.zIndex || 0))
        return nds.map((n) => (n.id === node.id && (n.zIndex || 0) < maxZ ? { ...n, zIndex: maxZ + 1 } : n))
      })
    },
    [setNodes]
  )

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      if (changes.some((c) => c.type === 'remove')) scheduleSave()
    },
    [onEdgesChange, scheduleSave]
  )

  // ── Add new nodes with callbacks injected ─────────────────────────────
  // Intercept addNodes to inject callbacks (ReactFlowProvider.addNodes doesn't support this)
  // We use a workaround: wrap the nodeTypes so they receive setters via closure
  // — handled by rehydrating callbacks in StickyNoteNode's data.onUpdate

  // Clear board
  const handleClearBoard = useCallback(async () => {
    setNodes([])
    setEdges([])
    await blackboardService.clearBoard(activeBoardId)
  }, [activeBoardId, setNodes, setEdges])

  // Handle convert to cards — capture selected nodes and open modal
  const handleConvertToCards = useCallback(() => {
    const selected = nodes.filter((n) => n.selected)
    onConvertToCards?.(selected)
    onOpenConvertModal?.()
  }, [nodes, onConvertToCards, onOpenConvertModal])

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size='sm' />
      </Box>
    )
  }

  return (
    <Box sx={{ flex: 1, position: 'relative' }}>
      {/* ── Override React Flow control button styles ── */}
      <style>{`
        .react-flow__controls {
          background: transparent;
          border: none;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .react-flow__controls-button {
          background: var(--joy-palette-background-surface);
          border: 1px solid var(--joy-palette-neutral-outlinedBorder);
          border-radius: 8px;
          width: 28px;
          height: 28px;
          padding: 5px;
          color: var(--joy-palette-text-secondary);
          fill: var(--joy-palette-text-secondary);
          transition: background 0.15s, border-color 0.15s;
        }
        .react-flow__controls-button:hover {
          background: var(--joy-palette-background-level1);
          border-color: var(--joy-palette-neutral-outlinedHoverBorder);
        }
        .react-flow__controls-button svg {
          fill: var(--joy-palette-text-secondary);
          max-width: 14px;
          max-height: 14px;
        }
        .react-flow__minimap {
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
      <ReactFlow
        nodes={nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onUpdate: (updates) => updateNodeData(n.id, updates),
            onDelete: () => deleteNode(n.id),
            onChange: (value) => updateNodeData(n.id, { label: value })
          }
        }))}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        onMoveEnd={(_, vp) => {
          viewportRef.current = vp
          scheduleSave()
        }}
        nodeTypes={nodeTypes}
        defaultViewport={viewportRef.current}
        deleteKeyCode='Delete'
        multiSelectionKeyCode='Shift'
        panOnScroll={true}
        selectionOnDrag={true}
        selectionMode='partial'
        snapToGrid={true}
        snapGrid={[20, 20]}
        style={{ background: 'transparent' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color='var(--joy-palette-neutral-outlinedBorder)' />
        <Controls />
        <MiniMap
          zoomable
          pannable
          style={{
            background: 'var(--joy-palette-background-level1)',
            border: '1px solid var(--joy-palette-neutral-outlinedBorder)'
          }}
          nodeColor={(n) => (n.type === 'stickyNote' ? '#f59e0b' : '#10b981')}
        />
        <BlackboardToolbar
          goals={goals}
          priorities={priorities}
          tasks={tasks}
          onClearBoard={handleClearBoard}
          nodes={nodes}
          onConvertToCards={handleConvertToCards}
          onShareBoard={onShareBoard}
          onOpenBoardSwitcher={onOpenBoardSwitcher}
          currentBoardName={currentBoardName}
          tier={tier}
        />
      </ReactFlow>
    </Box>
  )
}

// ── Main exported modal ────────────────────────────────────────────────────
export default function BlackboardModal({ open, onClose }) {
  const { t } = useTranslation()
  const { goals, priorities } = useAnnualPlan(new Date().getFullYear())
  const { tier } = useSubscription()
  const [tasks, setTasks] = React.useState([])
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [activeBoardId, setActiveBoardId] = useState(null)
  const [activeBoardName, setActiveBoardName] = useState('')
  const [showBoardSelector, setShowBoardSelector] = useState(false) // Pro switcher only
  const [showShareModal, setShowShareModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState([])

  // Model B: auto-resolve board on mount — no selector gate for Free/Plus
  useEffect(() => {
    if (!open) return
    setBoardsLoading(true)
    setActiveBoardId(null)
    setActiveBoardName('')
    blackboardService
      .listBoards()
      .then(async (boards) => {
        if (!boards || boards.length === 0) {
          // No boards yet — auto-create "My Blackboard"
          const created = await blackboardService.createBoard('My Blackboard')
          setActiveBoardId(created.id)
          setActiveBoardName(created.name || 'My Blackboard')
        } else {
          // Use first board (most recent from API, Pro multi-board also uses first)
          const first = boards[0]
          setActiveBoardId(first.id)
          setActiveBoardName(first.name || 'My Blackboard')
        }
      })
      .catch(() => {
        // Fallback to legacy board id if API fails
        setActiveBoardId(BOARD_ID)
      })
      .finally(() => setBoardsLoading(false))
  }, [open])

  const handleSelectBoard = (board) => {
    setActiveBoardId(board.id)
    setActiveBoardName(board.name || '')
    setShowBoardSelector(false)
  }

  useEffect(() => {
    if (!open) return
    tasksService
      .getAll()
      .then(setTasks)
      .catch(() => {})
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          style: {
            backdropFilter: 'blur(4px)',
            top: 64 // leave header visible
          }
        }
      }}
      sx={{ top: 64 }} // modal root starts below header
    >
      <ModalDialog
        sx={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          // Reset Joy's default centering
          transform: 'none',
          maxWidth: 'unset',
          maxHeight: 'unset',
          width: '100%',
          height: 'calc(100vh - 64px)',
          bgcolor: 'background.body',
          border: 'none',
          borderRadius: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, var(--joy-palette-background-body) 0%, var(--joy-palette-background-level1) 100%)'
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2.5,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            bgcolor: 'background.surface',
            backdropFilter: 'blur(8px)'
          }}
        >
          <Box component='span' sx={{ mr: 1, fontSize: '1.2rem' }}>
            🧠
          </Box>
          <Typography level='title-md' fontWeight={600}>
            {t('blackboard.title', 'Blackboard')}
          </Typography>
          <Typography level='body-xs' sx={{ ml: 1.5, color: 'text.tertiary' }}>
            {t('blackboard.subtitle', 'Brainstorm freely — auto-saved')}
          </Typography>

          {/* Keyboard hint */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, mr: 1 }}>
            {[
              { key: 'Delete', label: 'remove node' },
              { key: 'Shift+drag', label: 'multi-select' },
              { key: 'Scroll', label: 'zoom' }
            ].map(({ key, label }) => (
              <Box key={key} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    bgcolor: 'background.level1',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 'xs',
                    fontSize: '0.6rem',
                    color: 'text.secondary',
                    fontWeight: 600
                  }}
                >
                  {key}
                </Box>
                <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.6rem' }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Tooltip title={t('common.close', 'Close')} size='sm'>
            <IconButton size='sm' variant='plain' color='neutral' onClick={onClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Board selector modal — Pro switcher only ── */}
        <BoardListSelector open={showBoardSelector} onClose={() => setShowBoardSelector(false)} onSelectBoard={handleSelectBoard} />

        {/* ── Loading state — resolving board ── */}
        {boardsLoading && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <CircularProgress size='md' />
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('blackboard.toolbar.loadingBoard', 'Opening your board…')}
            </Typography>
          </Box>
        )}

        {/* ── Canvas — renders once board ID is resolved ── */}
        {!boardsLoading && activeBoardId && (
          <ReactFlowProvider>
            <BlackboardCanvas
              goals={goals}
              priorities={priorities}
              tasks={tasks}
              activeBoardId={activeBoardId}
              currentBoardName={activeBoardName}
              tier={tier}
              onConvertToCards={setSelectedNodes}
              onOpenConvertModal={() => setShowConvertModal(true)}
              onShareBoard={() => setShowShareModal(true)}
              onOpenBoardSwitcher={() => setShowBoardSelector(true)}
            />
          </ReactFlowProvider>
        )}

        {/* ── Share Board Modal ── */}
        <ShareBoardModal open={showShareModal} onClose={() => setShowShareModal(false)} boardId={activeBoardId} />

        {/* ── Convert to Cards Modal ── */}
        <ConvertToCardsModal
          open={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          boardId={activeBoardId}
          selectedNodes={selectedNodes}
        />
      </ModalDialog>
    </Modal>
  )
}
