import React from 'react'
import { Box, Button, Sheet, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { endsAfter } from './inviteDates'

/**
 * The invitation email, previewed in the chosen language (board I).
 *
 * The email itself is rendered and sent by the API (`beta.invitation`, five
 * locales); this card mirrors its words from the web locales so the admin sees
 * what an address not on the waitlist will read. Keep the two in step.
 */
export default function EmailPreview({ locale, lifetimeDays }) {
  const { t, i18n } = useTranslation()
  const tl = typeof i18n?.getFixedT === 'function' ? i18n.getFixedT(locale) : t
  const until = endsAfter(lifetimeDays, locale)
  return (
    <Sheet
      variant='outlined'
      component='section'
      aria-labelledby='invite-preview-title'
      sx={{ bgcolor: 'background.surface', borderRadius: 'lg', p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Stack direction='row' gap={1} alignItems='baseline' flexWrap='wrap'>
        <Typography id='invite-preview-title' component='h3' level='title-md'>
          {t('admin.inv.preview.title')}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t(`admin.inv.languages.${locale}`)}
        </Typography>
      </Stack>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 'md', overflow: 'hidden', bgcolor: 'background.body' }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', px: 1.75, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          {tl('admin.inv.email.from')} · {tl('admin.inv.email.subject')}
        </Typography>
        <Stack gap={1.5} sx={{ p: 2.25 }}>
          <Typography level='body-md'>{tl('admin.inv.email.body', { date: until })}</Typography>
          {/* A picture of the email's button, not a control. */}
          <Button tabIndex={-1} aria-hidden='true' sx={{ alignSelf: 'flex-start', pointerEvents: 'none' }}>
            {tl('admin.inv.email.button')}
          </Button>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {tl('admin.inv.email.android')}
          </Typography>
        </Stack>
      </Box>
    </Sheet>
  )
}
