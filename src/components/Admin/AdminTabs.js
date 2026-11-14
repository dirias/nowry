import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Box, Button, Sheet } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useWaitingCount } from '@nowry/core/hooks/useAdminWaitlist'
import { useToReviewCount } from '@nowry/core/hooks/useAdminModeration'
import { segment, segmentedGroup } from '../Common/Form/formStyles'
import { ADMIN_TABS } from './adminTabList'

/**
 * The admin tab bar (board A): one segmented object of links (BUTTONS.md §5),
 * the engaged tab on the level2 ground with the accent underline. It spans the
 * content's rails and scrolls inside itself when the tabs outgrow a phone.
 * A tab with a `count` carries it after its label, quieter ("Waitlist 37").
 */
export default function AdminTabs({ tabs = ADMIN_TABS }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const counts = { waiting: useWaitingCount(), toReview: useToReviewCount() }
  return (
    <Sheet
      component='nav'
      variant='outlined'
      aria-label={t('admin.tabsLabel')}
      sx={{ ...segmentedGroup, width: 'fit-content', maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}
    >
      {tabs.map((tab, index) => {
        const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`)
        const label = t(tab.labelKey)
        const count = tab.count ? counts[tab.count] : null
        return (
          <Button
            key={tab.key}
            component={Link}
            to={tab.path}
            variant='plain'
            color='neutral'
            aria-current={active ? 'page' : undefined}
            aria-label={count == null ? undefined : `${label} ${count}`}
            sx={{ ...segment(active, index === 0), flex: 'none', fontWeight: active ? 'lg' : 'md' }}
          >
            {label}
            {count != null && (
              <Box component='span' sx={{ ml: 0.75, color: 'text.tertiary', fontWeight: 'md', fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </Box>
            )}
          </Button>
        )
      })}
    </Sheet>
  )
}
