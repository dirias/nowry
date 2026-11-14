import React from 'react'
import { Box, Button, Checkbox, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { inviteKeyLabel, selectionLabel } from '@nowry/core/domain/waitlist'

/**
 * The selection bar (board E): the select-all box, "3 selected · Spanish ·
 * oldest first", Clear (not on a phone) and the one primary, "Invite 3 to
 * c1-waitlist", full width on a phone.
 */
export default function WaitlistBar({ allState, count, locale, cohort, sending, onToggleAll, onClear, onInvite }) {
  const { t } = useTranslation()
  const summary = selectionLabel(count, locale)
  const key = inviteKeyLabel(count, cohort)
  return (
    <Sheet
      variant='soft'
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.25,
        borderRadius: 'lg',
        bgcolor: 'background.level1',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Checkbox
        size='sm'
        checked={allState === 'all'}
        indeterminate={allState === 'some'}
        onChange={onToggleAll}
        slotProps={{ input: { 'aria-label': t('admin.wl.bar.selectAll') } }}
      />
      <Typography level='body-sm' sx={{ flex: 1, minWidth: 0, fontVariantNumeric: 'tabular-nums' }}>
        <Box component='span' sx={{ fontWeight: 'lg', color: 'text.primary' }}>
          {t(summary.key, summary.values)}
        </Box>
        <Box component='span' sx={{ color: 'text.secondary' }}>
          {summary.languageKey && (
            <>
              {' · '}
              <span>{t(summary.languageKey)}</span>
            </>
          )}
          {' · '}
          <span>{t('admin.wl.bar.oldestFirst')}</span>
        </Box>
      </Typography>
      <Button size='sm' variant='soft' color='neutral' onClick={onClear} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
        {t('admin.wl.bar.clear')}
      </Button>
      <Button loading={sending} onClick={onInvite} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {t(key.key, key.values)}
      </Button>
    </Sheet>
  )
}
