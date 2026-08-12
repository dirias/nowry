import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, CircularProgress, List, ListItem, ListItemButton, Tab, TabList, Tabs, Typography, tabClasses } from '@mui/joy'
import { Check } from '@mui/icons-material'

import { focusRing, touchTarget } from '../../Common/Form/formStyles'

/**
 * How a config surface discloses: by navigation.
 *
 * Variant E takes the shell and the accessibility baseline but not the
 * disclosure rail — a chip offering to "add a pace mode" would be offering
 * something that already has a value (§3, S2). The section list is the correct
 * pattern for this shape and it already shipped; what it gains here is a
 * touch-sized target at `xs` and an explicit focus ring.
 *
 * The per-section saving and saved indicators are preserved from the shipped
 * version: they say *which* section persisted, which the sheet's status line
 * cannot.
 */
const DeckSettingsNav = ({ sections, active, onChange, savingSection, savedSection }) => {
  const { t } = useTranslation()

  const indicatorFor = (key) => {
    if (savingSection === key) return <CircularProgress size='sm' sx={{ '--CircularProgress-size': '14px' }} />
    if (savedSection === key) return <Check sx={{ fontSize: 14, color: 'success.plainColor' }} />
    return null
  }

  return (
    <>
      <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 152, flexShrink: 0 }}>
        <List size='sm' sx={{ gap: 0.25 }}>
          {sections.map(({ key, Icon }) => (
            <ListItem key={key} disablePadding>
              <ListItemButton selected={active === key} onClick={() => onChange(key)} sx={{ borderRadius: 'sm', gap: 1, ...focusRing }}>
                <Icon sx={{ fontSize: 16 }} />
                <Typography level='body-sm' sx={{ flex: 1 }}>
                  {t(`deckSettings.nav.${key}`)}
                </Typography>
                {indicatorFor(key)}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* At `xs` the same navigation as a segmented control, because a 152px
          column beside the content would leave the content ~200px wide. */}
      <Tabs value={active} onChange={(_, value) => onChange(value)} sx={{ display: { xs: 'block', sm: 'none' }, bgcolor: 'transparent' }}>
        <TabList
          disableUnderline
          sx={{
            bgcolor: 'background.level1',
            borderRadius: 'xl',
            p: 0.5,
            gap: 0.5,
            [`& .${tabClasses.root}`]: { borderRadius: 'lg', fontWeight: 500, ...touchTarget, ...focusRing },
            [`& .${tabClasses.root}[aria-selected="true"]`]: { bgcolor: 'background.surface', boxShadow: 'sm' }
          }}
        >
          {sections.map(({ key }) => (
            <Tab key={key} disableIndicator value={key}>
              {t(`deckSettings.nav.${key}`)}
            </Tab>
          ))}
        </TabList>
      </Tabs>
    </>
  )
}

export default DeckSettingsNav
