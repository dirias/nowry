import React, { useState, useEffect } from 'react'
import { Box, Typography, Tooltip, IconButton, Modal, ModalDialog, ModalClose, Stack, Checkbox, Button, Divider } from '@mui/joy'
import { Link as RouterLink } from 'react-router-dom'
import { annualPlanningService, userService } from '../../../api/services'
import TuneIcon from '@mui/icons-material/Tune'
import { useTranslation } from 'react-i18next'

/**
 * FocusBar - Horizontal strip showing goals + priorities at a glance
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimalistic: Single compact row
 * - Horizontal space optimization
 * - Progressive disclosure: Only shows if data exists
 * - User preferences: Allows selecting up to 4 priorities to display
 */
const FocusBar = () => {
  const { t } = useTranslation()
  const [focusAreas, setFocusAreas] = useState([])
  const [allPriorities, setAllPriorities] = useState([]) // All priorities
  const [displayedPriorities, setDisplayedPriorities] = useState([]) // Selected priorities to display
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPriorityIds, setSelectedPriorityIds] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadUserPreferences = async () => {
    try {
      const profile = await userService.getProfile()
      return profile.preferences?.homepage_priority_ids || []
    } catch (error) {
      console.error('Error loading preferences:', error)
      return []
    }
  }

  const saveUserPreferences = async (priorityIds) => {
    try {
      setSaving(true)
      await userService.updateGeneralPreferences({
        homepage_priority_ids: priorityIds
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const loadData = async () => {
    try {
      const annualPlanData = await annualPlanningService.getAnnualPlan().catch(() => null)

      if (annualPlanData) {
        const [areas, prioritiesData] = await Promise.all([
          annualPlanningService.getFocusAreas(annualPlanData._id || annualPlanData.id),
          annualPlanningService.getPriorities(annualPlanData._id || annualPlanData.id)
        ])

        // Fetch goals for each focus area and calculate progress
        const goals = await Promise.all(areas.map((a) => annualPlanningService.getGoals(a._id || a.id)))

        // Create a flat map of all goals with their focus area IDs
        const allGoals = []
        areas.forEach((area, index) => {
          const areaGoals = goals[index] || []
          areaGoals.forEach((goal) => {
            allGoals.push({
              ...goal,
              focus_area_id: area._id || area.id
            })
          })
        })

        // Enrich areas with calculated progress
        const enrichedAreas = areas.map((area, index) => {
          const areaGoals = goals[index] || []
          let areaProgressSum = 0

          areaGoals.forEach((g) => {
            let p = 0
            // Calculate progress based on milestones if they exist
            if (g.milestones && g.milestones.length > 0) {
              const completed = g.milestones.filter((m) => m.completed).length
              p = (completed / g.milestones.length) * 100
            } else {
              // Otherwise use manual progress field
              p = g.progress || 0
            }
            areaProgressSum += p
          })

          return {
            ...area,
            progress: areaGoals.length > 0 ? Math.round(areaProgressSum / areaGoals.length) : 0
          }
        })

        setFocusAreas(enrichedAreas || [])

        // Enrich priorities with focus_area_id from linked goals
        const enrichedPriorities = (prioritiesData || []).map((priority) => {
          if (priority.linked_entity_type === 'goal' && priority.linked_entity_id) {
            const linkedGoal = allGoals.find((g) => (g._id || g.id) === priority.linked_entity_id)
            if (linkedGoal && linkedGoal.focus_area_id) {
              return {
                ...priority,
                focus_area_id: linkedGoal.focus_area_id
              }
            }
          }
          return priority
        })

        // Get all priorities - those with deadlines first (sorted), then those without
        const prioritiesWithDeadlines = enrichedPriorities
          .filter((p) => p.deadline)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))

        const prioritiesWithoutDeadlines = enrichedPriorities.filter((p) => !p.deadline)

        const sortedPriorities = [...prioritiesWithDeadlines, ...prioritiesWithoutDeadlines]

        setAllPriorities(sortedPriorities)

        // Load user preferences
        const savedPriorityIds = await loadUserPreferences()

        if (savedPriorityIds.length > 0) {
          // Show user's selected priorities
          const selectedPriorities = sortedPriorities.filter((p) => savedPriorityIds.includes(p._id || p.id))
          setDisplayedPriorities(selectedPriorities)
          setSelectedPriorityIds(savedPriorityIds)
        } else {
          // Default: show first 4 priorities
          const defaultPriorities = sortedPriorities.slice(0, 4)
          setDisplayedPriorities(defaultPriorities)
          setSelectedPriorityIds(defaultPriorities.map((p) => p._id || p.id))
        }
      }
    } catch (error) {
      console.error('Error loading focus data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (focusArea) => {
    return focusArea.progress || 0
  }

  const handleTogglePriority = (priorityId) => {
    setSelectedPriorityIds((prev) => {
      if (prev.includes(priorityId)) {
        return prev.filter((id) => id !== priorityId)
      } else {
        // Max 4 priorities
        if (prev.length >= 4) {
          return prev
        }
        return [...prev, priorityId]
      }
    })
  }

  const handleSaveSelection = async () => {
    await saveUserPreferences(selectedPriorityIds)

    // Update displayed priorities
    const selectedPriorities = allPriorities.filter((p) => selectedPriorityIds.includes(p._id || p.id))
    setDisplayedPriorities(selectedPriorities)
    setShowModal(false)
  }

  const handleCancelSelection = () => {
    // Reset to current displayed priorities
    setSelectedPriorityIds(displayedPriorities.map((p) => p._id || p.id))
    setShowModal(false)
  }

  const renderPriorityItem = (priority) => {
    const hasDeadline = !!priority.deadline
    const deadline = hasDeadline ? new Date(priority.deadline) : null
    const daysUntil = hasDeadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null
    const isOverdue = hasDeadline && daysUntil < 0
    const isUrgent = hasDeadline && daysUntil <= 3 && daysUntil >= 0

    // Determine entity type
    let entityIcon = '📌'
    if (priority.linked_entity_type === 'goal') {
      entityIcon = '🎯'
    } else if (priority.linked_entity_type === 'task') {
      entityIcon = '📋'
    } else if (priority.linked_entity_type?.includes('routine')) {
      entityIcon = '⏰'
    }

    // Determine navigation path
    let navigationPath = '/annual-planning'
    if (priority.linked_entity_type === 'goal' && priority.focus_area_id) {
      navigationPath = `/annual-planning/area/${priority.focus_area_id}`
    } else if (
      priority.linked_entity_type === 'routine_morning' ||
      priority.linked_entity_type === 'routine_afternoon' ||
      priority.linked_entity_type === 'routine_evening'
    ) {
      navigationPath = '/annual-planning/daily-routine'
    }

    const tooltipText = hasDeadline
      ? `${priority.title} - ${isOverdue ? t('focusBar.overdue') : t('focusBar.daysLeft', { count: daysUntil })}`
      : `${priority.title} - ${t('focusBar.noDeadline')}`

    return (
      <Tooltip key={priority._id || priority.id} title={tooltipText} size='sm'>
        <Box
          component={RouterLink}
          to={navigationPath}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 0.75, md: 1 },
            py: 0.5,
            borderRadius: 'sm',
            border: '1px solid',
            borderColor: hasDeadline ? (isOverdue ? 'danger.outlinedBorder' : isUrgent ? 'warning.outlinedBorder' : 'divider') : 'divider',
            bgcolor: 'background.level1',
            textDecoration: 'none',
            transition: 'all 0.2s',
            minWidth: 0,
            maxWidth: { xs: 120, sm: 160, md: 200 },
            '&:hover': {
              bgcolor: hasDeadline
                ? isOverdue
                  ? 'danger.softBg'
                  : isUrgent
                    ? 'warning.softBg'
                    : 'background.level2'
                : 'background.level2',
              borderColor: hasDeadline
                ? isOverdue
                  ? 'danger.solidBg'
                  : isUrgent
                    ? 'warning.solidBg'
                    : 'neutral.outlinedHoverBorder'
                : 'neutral.outlinedHoverBorder'
            }
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              fontSize: { xs: '0.7rem', md: '0.75rem' },
              flex: 1,
              minWidth: 0
            }}
          >
            {priority.title}
          </Typography>
          <Typography
            level='body-xs'
            sx={{
              fontSize: { xs: '0.625rem', md: '0.65rem' },
              color: hasDeadline ? (isOverdue ? 'danger.solidColor' : isUrgent ? 'warning.solidColor' : 'text.tertiary') : 'text.tertiary',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            {hasDeadline ? (isOverdue ? '!' : `${daysUntil}d`) : entityIcon}
          </Typography>
        </Box>
      </Tooltip>
    )
  }

  // Don't show if no data
  if (loading || (focusAreas.length === 0 && displayedPriorities.length === 0 && allPriorities.length === 0)) {
    return null
  }

  return (
    <>
      {/* Priority Selection Modal */}
      <Modal open={showModal} onClose={handleCancelSelection}>
        <ModalDialog
          sx={{
            minWidth: { xs: '90%', sm: 400, md: 480 },
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <ModalClose />

          {/* Header */}
          <Typography level='h4' sx={{ mb: 1, fontWeight: 700 }}>
            {t('focusBar.modal.title')}
          </Typography>
          <Typography level='body-sm' sx={{ mb: 3, color: 'text.secondary' }}>
            {t('focusBar.modal.description')}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* Priority List */}
          <Stack spacing={1} sx={{ mb: 3 }}>
            {allPriorities.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
                  {t('focusBar.modal.noPriorities')}
                </Typography>
                <Button component={RouterLink} to='/annual-planning' variant='soft' size='sm' onClick={() => setShowModal(false)}>
                  {t('focusBar.modal.createPriorities')}
                </Button>
              </Box>
            ) : (
              allPriorities.map((priority) => {
                const hasDeadline = !!priority.deadline
                const deadline = hasDeadline ? new Date(priority.deadline) : null
                const daysUntil = hasDeadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null
                const isOverdue = hasDeadline && daysUntil < 0
                const isUrgent = hasDeadline && daysUntil <= 3 && daysUntil >= 0
                const isSelected = selectedPriorityIds.includes(priority._id || priority.id)
                const isDisabled = !isSelected && selectedPriorityIds.length >= 4

                // Determine entity type label
                let entityLabel = ''
                if (priority.linked_entity_type === 'goal') {
                  entityLabel = t('focusBar.entity.goal')
                } else if (priority.linked_entity_type === 'task') {
                  entityLabel = t('focusBar.entity.task')
                } else if (priority.linked_entity_type?.includes('routine')) {
                  entityLabel = t('focusBar.entity.routine')
                }

                return (
                  <Box
                    key={priority._id || priority.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 'sm',
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.outlinedBorder' : 'divider',
                      bgcolor: isSelected ? 'primary.softBg' : 'background.level1',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s',
                      '&:hover': isDisabled
                        ? {}
                        : {
                            borderColor: 'primary.outlinedBorder',
                            bgcolor: 'primary.softBg'
                          }
                    }}
                    onClick={() => !isDisabled && handleTogglePriority(priority._id || priority.id)}
                  >
                    <Checkbox checked={isSelected} disabled={isDisabled} size='sm' sx={{ pointerEvents: 'none' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        level='body-sm'
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {priority.title}
                      </Typography>
                      <Typography
                        level='body-xs'
                        sx={{
                          color: hasDeadline
                            ? isOverdue
                              ? 'danger.solidColor'
                              : isUrgent
                                ? 'warning.solidColor'
                                : 'text.tertiary'
                            : 'text.tertiary'
                        }}
                      >
                        {hasDeadline
                          ? isOverdue
                            ? t('focusBar.overdueBy', { count: Math.abs(daysUntil) })
                            : t('focusBar.daysRemaining', { count: daysUntil })
                          : t('focusBar.noDeadlineEntity', { entity: entityLabel })}
                      </Typography>
                    </Box>
                    {hasDeadline ? (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 'sm',
                          bgcolor: isOverdue ? 'danger.softBg' : isUrgent ? 'warning.softBg' : 'background.level2',
                          border: '1px solid',
                          borderColor: isOverdue ? 'danger.outlinedBorder' : isUrgent ? 'warning.outlinedBorder' : 'divider'
                        }}
                      >
                        <Typography
                          level='body-xs'
                          sx={{
                            fontWeight: 700,
                            color: isOverdue ? 'danger.solidColor' : isUrgent ? 'warning.solidColor' : 'text.secondary'
                          }}
                        >
                          {isOverdue ? '!' : `${daysUntil}d`}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 'sm',
                          bgcolor: 'neutral.softBg',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography
                          level='body-xs'
                          sx={{
                            fontWeight: 600,
                            color: 'text.tertiary',
                            fontSize: '0.65rem'
                          }}
                        >
                          {entityLabel === 'Goal' ? '🎯' : entityLabel === 'Task' ? '📋' : '⏰'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )
              })
            )}
          </Stack>

          {/* Footer */}
          <Divider sx={{ mb: 2 }} />

          <Stack direction='row' spacing={1.5} justifyContent='flex-end'>
            <Button variant='plain' color='neutral' onClick={handleCancelSelection} size='sm'>
              {t('focusBar.modal.cancel')}
            </Button>
            <Button
              variant='solid'
              color='primary'
              onClick={handleSaveSelection}
              loading={saving}
              disabled={selectedPriorityIds.length === 0}
              size='sm'
            >
              {t('focusBar.modal.save')}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, md: 1.5 },
          mb: 2,
          px: { xs: 1, md: 1.5 },
          py: 0.75,
          borderRadius: 'sm',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          flexWrap: 'wrap'
        }}
      >
        {/* Focus Areas */}
        {focusAreas.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 } }}>
            {focusAreas.slice(0, 3).map((area) => {
              const progress = calculateProgress(area)
              const hexColor = area.color || '#8B5CF6'

              return (
                <Tooltip key={area._id || area.id} title={`${area.name}: ${progress}%`} size='sm'>
                  <Box
                    component={RouterLink}
                    to={`/annual-planning/area/${area._id || area.id}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: { xs: 0.75, md: 1 },
                      py: 0.5,
                      borderRadius: 'sm',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.level1',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: hexColor,
                        bgcolor: `${hexColor}10`
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, lineHeight: 1 }}>{area.icon || '🎯'}</Typography>
                    <Typography
                      level='body-xs'
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        fontSize: { xs: '0.7rem', md: '0.75rem' }
                      }}
                    >
                      {progress}%
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        )}

        {/* Divider - Desktop only */}
        {focusAreas.length > 0 && (displayedPriorities.length > 0 || allPriorities.length > 0) && (
          <Box
            sx={{
              width: '1px',
              height: 20,
              bgcolor: 'divider',
              flexShrink: 0,
              display: { xs: 'none', md: 'block' }
            }}
          />
        )}

        {/* Priorities - Responsive: 4 on desktop, 2 on mobile */}
        {displayedPriorities.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 }, flex: 1, minWidth: 0 }}>
            {displayedPriorities.slice(0, 4).map((priority, index) => {
              // Hide 3rd and 4th priorities on mobile
              if (index >= 2) {
                return (
                  <Box key={priority._id || priority.id} sx={{ display: { xs: 'none', md: 'flex' }, minWidth: 0 }}>
                    {renderPriorityItem(priority)}
                  </Box>
                )
              }
              return renderPriorityItem(priority)
            })}
          </Box>
        )}

        {/* Sort/Filter Button - At the end */}
        {allPriorities.length > 0 && (
          <Tooltip title={t('focusBar.choosePrioritiesTooltip')} size='sm'>
            <IconButton
              onClick={() => setShowModal(true)}
              size='sm'
              variant='plain'
              color='neutral'
              sx={{
                minWidth: 28,
                width: 28,
                height: 28,
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'transparent',
                flexShrink: 0,
                ml: 'auto',
                '&:hover': {
                  borderColor: 'primary.outlinedBorder',
                  bgcolor: 'primary.softBg'
                }
              }}
            >
              <TuneIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Empty State - No Priorities */}
        {displayedPriorities.length === 0 && allPriorities.length === 0 && focusAreas.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', fontSize: '0.75rem' }}>
              {t('focusBar.noPrioritiesYet')}
            </Typography>
            <Button
              component={RouterLink}
              to='/annual-planning'
              size='sm'
              variant='soft'
              color='primary'
              sx={{
                minHeight: 28,
                fontSize: '0.75rem',
                px: 1.5
              }}
            >
              {t('focusBar.createPriority')}
            </Button>
          </Box>
        )}
      </Box>
    </>
  )
}

export default FocusBar
