/** The focus timer. Built in MOB-024, over the shared PomodoroContext. */
import { useTranslation } from 'react-i18next'
import { Screen, Stack, Typography } from '../../src/ui'

export default function Focus() {
  const { t } = useTranslation()
  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>{t('nav.focus')}</Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder for MOB-024. The timer state already exists in @nowry/core and survives a cold start.
        </Typography>
      </Stack>
    </Screen>
  )
}
