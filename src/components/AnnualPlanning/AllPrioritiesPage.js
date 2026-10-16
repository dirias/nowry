import React, { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Typography, Stack, Skeleton, Box } from '@mui/joy'
import { Flag as FlagIcon } from '@mui/icons-material'
import usePriorityStatus from '@nowry/core/hooks/usePriorityStatus'
import PriorityList from './PriorityList'
import EmptyState from './EmptyState'

/**
 * AllPrioritiesPage — the Priorities tab.
 *
 * A priority is a flag on a task or a milestone (ADR-046 §5), so this page
 * lists the flagged items in two groups, open and completed, and offers the two
 * things a flag allows: done, and the flag off. Nothing is created here — an
 * item is flagged in its own sheet — so there is no Add key and the empty state
 * says where a priority comes from instead of offering to make one.
 *
 * It renders as a child of AnnualPlanningLayout, so it inherits the persistent
 * header and reads plan data from outlet context. It must not call useAnnualPlan:
 * that would reintroduce the duplicate fetch and the second unshared loading state
 * the layout exists to remove. It also carries no title of its own — the tab names
 * the view.
 */
const AllPrioritiesPage = () => {
  const { t } = useTranslation()
  const { areas, priorities, setPriorities, loading, error } = useOutletContext()

  const { openPriorities, completedPriorities } = useMemo(
    () => ({
      openPriorities: priorities.filter((p) => !p.is_completed),
      completedPriorities: priorities.filter((p) => p.is_completed)
    }),
    [priorities]
  )

  // Both writes are optimistic and shared with FocusAreaView and the Overview
  // card (ADR-015 point 6).
  const { toggleComplete, unflag } = usePriorityStatus(setPriorities)

  // The layout renders the shared error + retry block above the outlet.
  if (error && !loading) return null

  const isEmpty = !loading && priorities.length === 0

  return (
    <Box>
      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          ))}
        </Stack>
      ) : isEmpty ? (
        <EmptyState
          icon={<FlagIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
          title={t('annualPlanning.priority.emptyTitle')}
          body={t('annualPlanning.priority.emptyBody')}
          bodyMaxWidth={420}
        />
      ) : (
        <Stack spacing={3}>
          <PriorityList
            priorities={openPriorities}
            areas={areas}
            onToggleComplete={toggleComplete}
            onUnflag={unflag}
            emptyMessage={t('annualPlanning.priority.noActivePriorities')}
          />

          {completedPriorities.length > 0 && (
            <Box>
              {/* Section header — without this, completed rows read as an
                  unexplained second group (UAT gap-01). */}
              <Typography level='title-sm' sx={{ mb: 1, color: 'text.secondary' }}>
                {t('annualPlanning.priority.completedSection')}
              </Typography>
              <PriorityList priorities={completedPriorities} areas={areas} onToggleComplete={toggleComplete} onUnflag={unflag} />
            </Box>
          )}
        </Stack>
      )}
    </Box>
  )
}

export default AllPrioritiesPage
