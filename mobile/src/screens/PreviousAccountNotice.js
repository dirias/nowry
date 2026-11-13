/**
 * "This address had a Nowry account" on the phone's Home (ADR-089, FR-041):
 * after the new account's address is verified, within 30 days of the old one's
 * deletion, once. The same hook and words as the web.
 */
import { useTranslation } from 'react-i18next'
import { usePreviousAccountNotice } from '@nowry/core/hooks/usePreviousAccountNotice'
import { Box, Button, Stack, Typography } from '../ui'

export function PreviousAccountNotice() {
  const { t, i18n } = useTranslation()
  const { visible, dates, dismiss } = usePreviousAccountNotice(i18n.language)
  if (!visible) return null

  return (
    <Box bg='background.level1' radius='md' padding={2} accessibilityRole='summary' testID='previous-account-notice'>
      <Stack spacing={1}>
        <Typography level='title-sm'>{t('previousAccount.title')}</Typography>
        <Typography level='body-sm'>{t('previousAccount.body', dates)}</Typography>
        <Typography level='body-sm'>{t('previousAccount.mistake')}</Typography>
        <Button variant='secondary' size='sm' onPress={dismiss} accessibilityLabel={t('previousAccount.dismissAria')}>
          {t('previousAccount.dismiss')}
        </Button>
      </Stack>
    </Box>
  )
}
