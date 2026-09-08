/**
 * The next-steps panel (ADR-024, ONB-023).
 *
 * Capability named after activation: three destinations, each with a title and
 * a sentence, each marked done once its signal counts at least one. It is the
 * mobile expression of the same panel the web shows, over the same two hooks.
 *
 * Two rules from the decision, both easy to lose:
 *
 *   - **A finished row keeps its place.** It becomes a record rather than an
 *     invitation, so progress stays visible; it does not vanish and reflow the
 *     list under the reader's thumb.
 *   - **It disappears entirely once every row is done.** Nobody should have to
 *     dismiss a list of things they have already finished.
 */
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useNextSteps } from '@nowry/core/hooks/useNextSteps'
import { useNextStepsPanel } from '@nowry/core/hooks/useNextStepsPanel'
import { Divider } from '../Divider'
import { Icon } from '../icons'
import { IconButton } from '../IconButton'
import { Sheet } from '../Sheet'
import { Stack } from '../Stack'
import { Typography } from '../Typography'
import { KEY_TO_LUCIDE } from '../icons/iconMap'
import { ListRow } from './ListRow'

export function NextStepsPanel() {
  const { t } = useTranslation()
  const router = useRouter()
  const { offered, dismiss } = useNextStepsPanel()
  const { steps, allDone } = useNextSteps()

  // Nobody dismisses a list of things they have already finished.
  if (!offered || allDone) return null

  return (
    <Sheet padding={2}>
      <Stack spacing={1}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <Stack flex={1} spacing={2}>
            <Typography level='title-md'>{t('home.nextSteps.title')}</Typography>
            <Typography level='body-sm' color='text.tertiary'>
              {t('home.nextSteps.body')}
            </Typography>
          </Stack>
          <IconButton accessibilityLabel={t('home.nextSteps.dismiss')} onPress={dismiss}>
            <Icon name='X' size='sm' />
          </IconButton>
        </Stack>

        <Divider />

        {steps.map(({ id, i18nKey, to, iconKey, done }) => (
          <ListRow
            key={id}
            tile={
              <Icon
                name={done ? 'CircleCheck' : KEY_TO_LUCIDE[iconKey]}
                size='md'
                color={done ? 'success.plainColor' : 'primary.plainColor'}
              />
            }
            name={t(`home.nextSteps.items.${i18nKey}.title`)}
            meta={t(`home.nextSteps.items.${i18nKey}.description`)}
            // A finished row is a record, not an invitation: it keeps its place
            // and gives up the press that would read as "do this again".
            onPress={done ? undefined : () => router.push(to)}
            accessibilityLabel={
              done ? t('home.nextSteps.doneLabel') : t('home.nextSteps.openLabel', { title: t(`home.nextSteps.items.${i18nKey}.title`) })
            }
          />
        ))}
      </Stack>
    </Sheet>
  )
}

export default NextStepsPanel
