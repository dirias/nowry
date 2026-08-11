import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Container, Stack, Typography } from '@mui/joy'
import { Timeline as TimelineIcon, ArrowForward as ArrowForwardIcon, Warning as WarningIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'
import useAnnualPlan from '../../hooks/useAnnualPlan'
import { useAuth } from '../../context/AuthContext'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import { apiCache } from '../../api/utils/cache'
import { ROUTINE_CACHE_KEY, ROUTINE_TTL, todayKey } from '../../api/utils/routineCache'
import goalAIService from '../../api/services/goalAI.service'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import CloseQuarterModal from './CloseQuarterModal'
import GoalAIPanel from './GoalAIPanel'
import PlanIdentityBlock from './PlanIdentityBlock'
import PlanScopeBar from './PlanScopeBar'
import { getQuarterCloseState } from './quarterUtils'

/**
 * AnnualPlanningLayout — the single route element behind /annual-planning and its
 * index/goals/reports children.
 *
 * Owns the *only* useAnnualPlan call in this feature. Previously each tab was its
 * own top-level route with its own hook call and its own <AnnualPlanningTabBar />,
 * so the plan header disappeared on every tab switch and four independent
 * loading/error states raced over one cached payload. Children now read
 * everything through useOutletContext().
 */
const AnnualPlanningLayout = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const year = new Date().getFullYear()
  const { user } = useAuth()
  const { tier } = useSubscription()
  const { openUpgradeModal } = useSubscriptionContext()

  const {
    plan: hookPlan,
    focusAreas: hookAreas,
    goals: hookGoals,
    priorities: hookPriorities,
    quarterReports: hookQuarterReports,
    loading,
    error,
    reload
  } = useAnnualPlan(year, user)

  const currentQCalc = String(Math.floor(new Date().getMonth() / 3) + 1)
  const selectedQuarter = searchParams.get('q') || currentQCalc

  const [plan, setPlan] = useState(null)
  const [areas, setAreas] = useState([])
  const [priorities, setPriorities] = useState([])
  const [quarterReports, setQuarterReports] = useState([])
  const [metrics, setMetrics] = useState({ totalGoals: 0, completedGoals: 0, progress: 0 })
  const [quarterGoals, setQuarterGoals] = useState([])
  const [routineStats, setRoutineStats] = useState({ total: 0, completedToday: 0 })

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingQuarter, setClosingQuarter] = useState(null)
  const [closingYear, setClosingYear] = useState(null)

  const [showDeletePlan, setShowDeletePlan] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState(false)

  // Goal AI state
  const [panelOpen, setPanelOpen] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [aiNoPlan, setAiNoPlan] = useState(false)

  // Sticky collapse — IntersectionObserver on a zero-height sentinel at the end of
  // Zone A. A scroll listener would re-render this subtree on every frame and jank
  // the bar.
  //
  // Attached via a *callback ref*, not a useEffect with [] deps. That is load-bearing:
  // the lazy tab view rendered into this layout's <Outlet> suspends against the
  // <Suspense> that wraps all of <Routes>, so React tears this subtree down and mounts
  // a fresh one — new sentinel node — after the first commit. A []-dep effect captures
  // the *first* node and never re-runs, leaving the observer bound to a detached
  // element that reports an all-zero rect forever and never reports a crossing. The
  // bar then never collapses at all. A callback ref re-binds whenever the live node
  // changes, and is called with null on unmount, which disconnects.
  const observerRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)

  const sentinelRef = useCallback((node) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node || typeof IntersectionObserver === 'undefined') return
    // Collapse on the sentinel's own live geometry rather than on the `entry` snapshot
    // or `!entry.isIntersecting`. All three agree at the real crossing — the root is
    // shrunk 1px at the top, so the callback fires exactly as top passes 1px — but the
    // snapshot can be stale by the time the callback runs (React commits and Suspense
    // reveals both relayout this header), and a stale reading latches the bar into the
    // wrong form until the *next* crossing. Re-measuring when the callback actually
    // runs avoids that, and still needs no scroll listener.
    const observer = new IntersectionObserver(
      () => {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight
        if (!viewportHeight) return
        const rect = node.getBoundingClientRect()
        // A detached or unlaid-out node reports an all-zero rect; ignore it rather
        // than treating it as "scrolled past the top".
        if (!rect.top && !rect.bottom && !rect.left && !rect.right) return
        setCollapsed(rect.top < 1)
      },
      {
        rootMargin: '-1px 0px 0px 0px',
        threshold: 0
      }
    )
    observer.observe(node)
    observerRef.current = observer
  }, [])

  // Sync hook data into local state (needed so mutations can update UI immediately).
  // The quarter-scoping math below is moved verbatim from AnnualPlanningHome.js — it is
  // already snapshot-aware for closed quarters and must stay that way.
  useEffect(() => {
    if (loading) return
    setPlan(hookPlan)
    setEditTitle(hookPlan?.title || `Annual Plan ${year}`)
    setAreas(hookAreas)
    setPriorities(hookPriorities)
    setQuarterReports(hookQuarterReports || [])

    // Compute global metrics from the flat goals list
    let totalProgressSum = 0
    let completedGoalsCount = 0

    // Filter goals based on selected global Quarter
    let activeGoals = selectedQuarter === 'All' ? hookGoals : hookGoals.filter((g) => g.quarter === Number(selectedQuarter))

    // Pull from snapshot if the quarter is historically closed
    if (selectedQuarter !== 'All' && hookPlan?.year) {
      const report = (hookQuarterReports || []).find((r) => r.quarter === Number(selectedQuarter) && r.year === hookPlan.year)
      if (report && report.goals_summary) {
        activeGoals = report.goals_summary
      }
    }

    activeGoals.forEach((g) => {
      let goalProgress = 0
      if (g.milestones?.length > 0) {
        const done = g.milestones.filter((m) => m.completed).length
        goalProgress = (done / g.milestones.length) * 100
      } else {
        goalProgress = g.progress || 0
      }
      if (g.status === 'completed' || goalProgress === 100) completedGoalsCount++
      totalProgressSum += goalProgress
    })

    setQuarterGoals(activeGoals)
    setMetrics({
      totalGoals: activeGoals.length,
      completedGoals: completedGoalsCount,
      progress: activeGoals.length > 0 ? Math.round(totalProgressSum / activeGoals.length) : 0
    })
  }, [loading, hookPlan, hookAreas, hookGoals, hookPriorities, hookQuarterReports, selectedQuarter, year])

  // RTN-03/D-09: fetch daily routine data via the same apiCache entry SideMenu.js uses,
  // so a toggle in either surface keeps this header's count fresh.
  useEffect(() => {
    if (loading) return
    let cancelled = false
    apiCache
      .get(ROUTINE_CACHE_KEY, ROUTINE_TTL, () => annualPlanningService.getDailyRoutine())
      .then((routine) => {
        if (cancelled) return
        const total =
          (routine?.morning_routine?.length || 0) + (routine?.afternoon_routine?.length || 0) + (routine?.evening_routine?.length || 0)
        const completedToday = (routine?.daily_completions?.[todayKey()] || []).length
        setRoutineStats({ total, completedToday })
      })
      .catch((err) => {
        console.error('Failed to load daily routine stats:', err)
        // fail safe: leave routineStats at { total: 0, completedToday: 0 } so the chip stays hidden
      })
    return () => {
      cancelled = true
    }
  }, [loading])

  // Redirect to setup if loaded but no focus areas exist yet
  useEffect(() => {
    if (!loading && plan && areas.length === 0) {
      navigate('/annual-planning/setup')
    }
  }, [loading, plan, areas, navigate])

  const setQuarter = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams)
      next.set('q', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSaveTitle = async () => {
    if (!plan) return
    try {
      const updated = await annualPlanningService.updateAnnualPlan(plan._id, { title: editTitle })
      setPlan(updated)
      setIsEditingTitle(false)
    } catch (err) {
      console.error('Failed to update plan title', err)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const newPlan = await annualPlanningService.createAnnualPlan({ year, title: `My ${year} Plan` })
      setPlan(newPlan)
      setEditTitle(newPlan.title)
      navigate('/annual-planning/setup')
    } catch (err) {
      console.error('Failed to create annual plan:', err)
    }
  }

  const handleDeletePlan = async () => {
    if (!plan) return
    setDeletingPlan(true)
    try {
      await annualPlanningService.deleteAnnualPlan(plan._id)
      setShowDeletePlan(false)
      // Clearing local state first means the create-plan empty state renders
      // immediately instead of flashing the deleted plan's chrome while reload runs.
      setPlan(null)
      setAreas([])
      setPriorities([])
      await reload()
    } catch (err) {
      console.error('Failed to delete annual plan', err)
    } finally {
      setDeletingPlan(false)
    }
  }

  const quarterClose = useMemo(() => getQuarterCloseState({ plan, quarterReports }), [plan, quarterReports])

  const handleOpenCloseModal = useCallback((q, y) => {
    setClosingQuarter(q)
    setClosingYear(y)
    setShowCloseModal(true)
  }, [])

  const runAIAnalysis = async () => {
    setAiLoading(true)
    setAiError(false)
    setAiNoPlan(false)
    setAiAnalysis(null)
    try {
      const data = await goalAIService.analyzeGoals()
      setAiAnalysis(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setAiNoPlan(true)
      } else {
        setAiError(true)
      }
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIAssist = () => {
    if (tier !== 'pro') {
      openUpgradeModal(t('goalAi.upgradeHeadline'))
      return
    }
    setPanelOpen(true)
    runAIAnalysis()
  }

  const planContext = useMemo(
    () => ({
      plan,
      areas,
      goals: hookGoals,
      priorities,
      setPriorities,
      quarterReports,
      loading,
      error,
      reload,
      quarter: selectedQuarter,
      setQuarter,
      quarterGoals,
      metrics,
      quarterClose,
      openCloseQuarterModal: handleOpenCloseModal
    }),
    [
      plan,
      areas,
      hookGoals,
      priorities,
      quarterReports,
      loading,
      error,
      reload,
      selectedQuarter,
      setQuarter,
      quarterGoals,
      metrics,
      quarterClose,
      handleOpenCloseModal
    ]
  )

  // No plan at all — hide the chrome entirely. There is no plan identity to persist,
  // so the onboarding CTA owns the whole viewport. Checked *after* the error branch
  // below would be wrong: a transient 500 must not look like "no plan exists yet"
  // and misdirect an existing user into a duplicate-plan POST.
  if (!error && !plan && !loading) {
    return (
      <Container maxWidth='xl' sx={{ py: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <TimelineIcon sx={{ fontSize: { xs: 60, md: 80 }, color: 'primary.plainColor', mb: 1.5 }} />
          <Typography level='h2' sx={{ mb: 1.5 }}>
            {t('annualPlanning.home.startJourney', { year })}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.tertiary', maxWidth: 500, mx: 'auto' }}>
            {t('annualPlanning.home.startDescription')}
          </Typography>
        </Box>
        <Button
          onClick={handleCreatePlan}
          size='lg'
          endDecorator={<ArrowForwardIcon />}
          sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
        >
          {t('annualPlanning.home.createPlan')}
        </Button>
      </Container>
    )
  }

  const showQuarterAlert = Boolean(quarterClose.overdueQuarter || quarterClose.closingSoon)
  const alertColor = quarterClose.overdueQuarter || quarterClose.daysLeft <= 2 ? 'danger' : 'warning'

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 1, md: 1.5 } }}>
      <PlanIdentityBlock
        plan={plan}
        loading={loading}
        metrics={metrics}
        priorities={priorities}
        routineStats={routineStats}
        areas={areas}
        totalGoalsAllYear={hookGoals.length}
        quarterClose={quarterClose}
        onOpenCloseQuarter={handleOpenCloseModal}
        onDeletePlan={() => setShowDeletePlan(true)}
        isEditingTitle={isEditingTitle}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        onStartEditTitle={() => setIsEditingTitle(true)}
        onSaveTitle={handleSaveTitle}
        onCancelEditTitle={() => setIsEditingTitle(false)}
        onAIAssist={handleAIAssist}
        tier={tier}
      />

      {/* Quarter-close alert sits between Zone A and Zone B: it carries its own CTA,
          and duplicating that into the sticky bar would break Single Primary Action. */}
      {!loading && showQuarterAlert && (
        <Alert
          variant='soft'
          color={alertColor}
          startDecorator={<WarningIcon />}
          endDecorator={
            <Button
              size='sm'
              variant='solid'
              color={alertColor}
              onClick={() => handleOpenCloseModal(quarterClose.closableQuarter, quarterClose.closableYear)}
              sx={{
                borderRadius: 'lg',
                fontWeight: 600,
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
              }}
            >
              {t('annualPlanning.home.reviewNow')}
            </Button>
          }
          sx={{ mb: 2, alignItems: 'center', borderRadius: 'xl', boxShadow: 'sm', fontWeight: 600, textAlign: 'left' }}
        >
          {quarterClose.overdueQuarter
            ? t('annualPlanning.home.quarterEndedOn', {
                quarter: quarterClose.overdueQuarter,
                // Format against the app's active language, not the browser's: passing
                // `undefined` renders "30 de junio" inside an otherwise-English alert
                // whenever the two disagree.
                date: quarterClose.overdueEndDate?.toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' })
              })
            : quarterClose.daysLeft === 0
              ? t('annualPlanning.home.quarterEndsToday', { quarter: quarterClose.currentQuarter })
              : t('annualPlanning.home.quarterEndingIn', { quarter: quarterClose.currentQuarter, count: quarterClose.daysLeft })}
        </Alert>
      )}

      {/* Zero-height IntersectionObserver target. Deliberately sits at the *end* of
          Zone A rather than above it: it must leave the viewport at the exact moment
          Zone B pins to the top. Placed above Zone A it fires after 1px of scroll,
          collapsing the bar into its small-title state while the full-size title is
          still on screen — two plan titles at once. */}
      <Box ref={sentinelRef} sx={{ height: 0 }} />

      <PlanScopeBar
        collapsed={collapsed}
        quarter={selectedQuarter}
        onQuarterChange={setQuarter}
        planTitle={plan?.title || `${t('annualPlanning.title')} ${plan?.year || ''}`}
        progress={metrics.progress}
        loading={loading}
        onAIAssist={handleAIAssist}
        aiPanelOpen={panelOpen}
        tier={tier}
      />

      {panelOpen && <GoalAIPanel analysis={aiAnalysis} loading={aiLoading} error={aiError} noPlan={aiNoPlan} onRefresh={runAIAnalysis} />}

      {/* Error renders *below* the persistent header, never instead of it — losing plan
          identity is worst precisely when the user needs orientation to recover. */}
      {error && !loading && (
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start', py: 4 }}>
          <Typography level='title-md' sx={{ color: 'danger.plainColor' }}>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button
            size='sm'
            variant='soft'
            onClick={reload}
            sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
          >
            {t('common.retry')}
          </Button>
        </Stack>
      )}

      <Box aria-busy={loading}>
        <Outlet context={planContext} />
      </Box>

      {showCloseModal && closingQuarter && closingYear && plan && (
        <CloseQuarterModal
          open={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false)
            reload()
          }}
          targetQuarter={closingQuarter}
          targetYear={closingYear}
          planId={plan._id}
          focusAreas={areas}
          goals={hookGoals}
        />
      )}

      {/* Deleting a plan cascades to every focus area, goal and report the backend
          holds for it, so it never goes through a bare window.confirm. */}
      <DeleteConfirmationModal
        open={showDeletePlan}
        onClose={() => setShowDeletePlan(false)}
        onConfirm={handleDeletePlan}
        loading={deletingPlan}
        title={t('annualPlanning.header.deletePlanTitle')}
        description={t('annualPlanning.header.deletePlanBody', { title: plan?.title || '' })}
      />
    </Container>
  )
}

export default AnnualPlanningLayout
