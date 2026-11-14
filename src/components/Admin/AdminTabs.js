import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, Sheet } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { segment, segmentedGroup } from '../Common/Form/formStyles'
import { ADMIN_TABS } from './adminTabList'

/**
 * The admin tab bar (board A): one segmented object of links (BUTTONS.md §5),
 * the engaged tab on the level2 ground with the accent underline. It spans the
 * content's rails and scrolls inside itself when the tabs outgrow a phone.
 */
export default function AdminTabs({ tabs = ADMIN_TABS }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <Sheet
      component='nav'
      variant='outlined'
      aria-label={t('admin.tabsLabel')}
      sx={{ ...segmentedGroup, width: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}
    >
      {tabs.map((tab, index) => {
        const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`)
        return (
          <Button
            key={tab.key}
            component={Link}
            to={tab.path}
            variant='plain'
            color='neutral'
            aria-current={active ? 'page' : undefined}
            sx={{ ...segment(active, index === 0), flex: 'none', fontWeight: active ? 'lg' : 'md' }}
          >
            {t(tab.labelKey)}
          </Button>
        )
      })}
    </Sheet>
  )
}
