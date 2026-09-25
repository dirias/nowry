import React from 'react'
import { Box, Stack, Typography } from '@mui/joy'
import { BrandWordmark } from '../Common/Brand/BrandMark'

/**
 * The one column every auth page stands in (docs/prd-public-site.md D7).
 *
 * The display wordmark (BRAND-009) at 64px, the page's title as its `<h1>` at
 * `h2` size, one line under it, then the form. No side panel, no repeated
 * hero: the column is a single object, which is why it is the one thing on
 * the public site that is centred (ADR-035 §2). `lead` is for a control that
 * belongs above the title, such as "Back to sign in".
 */
const AuthShell = ({ title, subtitle, lead = null, children }) => (
  <Box component='main' sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', px: 2, py: { xs: 4, md: 8 } }}>
    <Stack spacing={4} sx={{ width: '100%', maxWidth: 400 }}>
      <Box sx={{ color: 'text.primary' }}>
        <BrandWordmark fontSize={64} />
      </Box>
      <Stack spacing={1} alignItems='flex-start'>
        {lead}
        <Typography level='h2' component='h1' sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Stack>
      <Box>{children}</Box>
    </Stack>
  </Box>
)

export default AuthShell
