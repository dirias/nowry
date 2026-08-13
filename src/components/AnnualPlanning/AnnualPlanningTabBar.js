import React from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Tabs, TabList, Tab, Typography, tabClasses } from '@mui/joy'

const TABS = [
  { key: 'overview', path: '/annual-planning', labelKey: 'annualPlanning.tabs.overview' },
  { key: 'goals', path: '/annual-planning/goals', labelKey: 'annualPlanning.tabs.goals' },
  { key: 'priorities', path: '/annual-planning/priorities', labelKey: 'annualPlanning.tabs.priorities' },
  { key: 'reports', path: '/annual-planning/reports', labelKey: 'annualPlanning.tabs.reports' }
]

/**
 * Appends the active quarter scope to any Annual Planning link so the scope
 * survives navigation into detail routes (`/area/:id`, `/priorities`) as well as
 * between tabs. Exported so the focus-area cards and priority links share one rule.
 */
export const withQuarter = (path, q) => (q && q !== 'All' ? `${path}?q=${q}` : path)

const AnnualPlanningTabBar = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const q = searchParams.get('q')
  const qSuffix = q ? '?q=' + q : ''

  const activeTabIndex = TABS.findIndex((tab) => tab.path === location.pathname)

  // No sticky/border/margin here: PlanScopeBar (Zone B) owns the sticky container
  // this bar is embedded in, so a second sticky context would fight it.
  return (
    <Box>
      {/* Desktop Tab Bar (md and up) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Tabs
          aria-label={t('annualPlanning.tabs.ariaLabel')}
          value={activeTabIndex}
          onChange={(event, newValue) => {
            const tab = TABS[newValue]
            if (tab) navigate(`${tab.path}${qSuffix}`)
          }}
          sx={{ bgcolor: 'transparent' }}
        >
          <TabList
            disableUnderline
            sx={{
              p: 0,
              gap: 4,
              borderRadius: 0,
              bgcolor: 'transparent',
              display: 'flex',
              width: '100%',
              mx: 0,
              [`& .${tabClasses.root}`]: {
                bgcolor: 'transparent',
                fontWeight: 400,
                color: 'text.tertiary',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                paddingBottom: '8px',
                marginBottom: '-1px',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '2px solid transparent',
                '&:hover': { color: 'text.primary', bgcolor: 'transparent' }
              },
              [`& .${tabClasses.root}[aria-selected="true"]`]: {
                boxShadow: 'none',
                bgcolor: 'transparent',
                color: 'primary.plainColor',
                fontWeight: 700,
                borderBottomColor: 'primary.solidBg'
              }
            }}
          >
            {TABS.map((tab, index) => (
              <Tab key={tab.key} value={index} disableIndicator sx={{ borderRadius: 0, px: 1, py: 1 }}>
                {t(tab.labelKey)}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </Box>

      {/* Mobile Segmented Control (xs/sm) */}
      <Box
        role='tablist'
        aria-label={t('annualPlanning.tabs.ariaLabel')}
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 0.5,
          mb: 0.75,
          borderRadius: 'xl',
          bgcolor: 'background.level1',
          overflow: 'hidden'
        }}
      >
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <Box
              key={tab.key}
              role='tab'
              tabIndex={0}
              aria-selected={isActive}
              aria-label={t(tab.labelKey)}
              onClick={() => navigate(`${tab.path}${qSuffix}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`${tab.path}${qSuffix}`)
                }
              }}
              sx={{
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' },
                flex: 1,
                minHeight: 44,
                py: 1,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: 'lg',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: isActive ? 'background.surface' : 'transparent',
                boxShadow: isActive ? 'sm' : 'none',
                color: isActive ? 'primary.plainColor' : 'text.secondary',
                fontWeight: isActive ? 700 : 400,
                userSelect: 'none'
              }}
            >
              <Typography level='body-sm' textColor='inherit' fontWeight='inherit'>
                {t(tab.labelKey)}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default AnnualPlanningTabBar
