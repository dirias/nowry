import React, { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Typography, Button } from '@mui/joy'
import { EmojiEvents as EmojiEventsIcon } from '@mui/icons-material'
import QuarterReportsView from './QuarterReportsView'
import CloseQuarterModal from './CloseQuarterModal'
import EmptyState from './EmptyState'

/**
 * ReportsTabView — owns the Reports tab's four states. QuarterReportsView is now a
 * pure list renderer, so the empty state (previously an invisible `return null`
 * inside that component, which rendered a blank tab) lives here where the quarter
 * scope and quarter-close availability are both known.
 */
const ReportsTabView = () => {
  const { t } = useTranslation()
  const { plan, areas, goals, quarterReports, quarter, quarterClose, loading, error, reload } = useOutletContext()

  const [showCloseModal, setShowCloseModal] = useState(false)

  // Scoped-first ordering, never a hard filter: hiding the other quarters would
  // make an archive the user knows is populated look broken.
  const orderedReports = useMemo(() => {
    const list = [...(quarterReports || [])]
    if (quarter === 'All') return list.sort((a, b) => b.year - a.year || b.quarter - a.quarter)
    const scoped = Number(quarter)
    return list.sort((a, b) => {
      const aScoped = a.quarter === scoped ? 0 : 1
      const bScoped = b.quarter === scoped ? 0 : 1
      return aScoped - bScoped || b.year - a.year || b.quarter - a.quarter
    })
  }, [quarterReports, quarter])

  // The layout renders the shared error + retry block above the outlet.
  if (error && !loading) return null

  const isEmpty = !loading && orderedReports.length === 0

  if (isEmpty) {
    const { closable, closableQuarter, closableYear, currentQuarter, daysLeft } = quarterClose

    return (
      <>
        <EmptyState
          icon={<EmojiEventsIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />}
          title={t('annualPlanning.reports.emptyTitle')}
          body={t('annualPlanning.reports.emptyBody')}
          bodyMaxWidth={460}
          // A disabled or dead button here would be worse than silence, so when the
          // quarter cannot be closed yet we show the countdown and nothing else.
          action={
            closable && plan ? (
              <Button
                size='sm'
                onClick={() => setShowCloseModal(true)}
                sx={{ mt: 2, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' } }}
              >
                {t('annualPlanning.reports.emptyCtaReady', { quarter: closableQuarter })}
              </Button>
            ) : (
              <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 2 }}>
                {t('annualPlanning.reports.emptyCountdown', { quarter: currentQuarter, count: Math.max(daysLeft, 0) })}
              </Typography>
            )
          }
        />

        {showCloseModal && plan && (
          <CloseQuarterModal
            open={showCloseModal}
            onClose={() => setShowCloseModal(false)}
            onSuccess={() => {
              setShowCloseModal(false)
              reload()
            }}
            targetQuarter={closableQuarter}
            targetYear={closableYear}
            planId={plan._id}
            focusAreas={areas}
            goals={goals}
          />
        )}
      </>
    )
  }

  return <QuarterReportsView reports={orderedReports} loading={loading} highlightQuarter={quarter === 'All' ? null : quarter} />
}

export default ReportsTabView
