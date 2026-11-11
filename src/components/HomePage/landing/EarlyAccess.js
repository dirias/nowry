import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { CompanionMark } from '../../Agent/CompanionMark'

/**
 * What stands where prices were while `SHOW_PRICING` is off (ADR-073): one
 * sentence and one key to the early-access sign-up. The landing renders it as
 * its `#pricing` section (an `h2`), `/pricing` as the page's own `h1`.
 *
 * `folded` is the landing on a phone: this section and the early-access note
 * were two asks for the same sign-up a thumb apart, so there they are one —
 * the companion, the sentence, the note's paragraph and one key — under the
 * same `#pricing` anchor.
 */
const EarlyAccess = ({ id, headingComponent = 'h2', folded = false }) => {
  const { t } = useTranslation()

  return (
    <Box component='section' id={id} aria-labelledby='early-access-title' sx={{ py: { xs: 4, md: 10 }, scrollMarginTop: 80 }}>
      <Stack spacing={3} alignItems='flex-start' sx={{ maxWidth: 640 }}>
        {folded && (
          <Box sx={{ color: 'primary.plainColor' }}>
            <CompanionMark stage={5} mood='happy' size={72} />
          </Box>
        )}
        <Stack spacing={1.5}>
          <Typography id='early-access-title' level='h2' component={headingComponent} sx={{ color: 'text.primary' }}>
            {t('beta.earlyAccess')}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
            {t('beta.pricing.message')}
          </Typography>
          {folded && (
            <Typography level='body-md' sx={{ color: 'text.secondary' }}>
              {t('landing.note.body')}
            </Typography>
          )}
        </Stack>
        <Button component={Link} to='/register' size='lg'>
          {t('beta.pricing.cta')}
        </Button>
      </Stack>
    </Box>
  )
}

export default EarlyAccess
