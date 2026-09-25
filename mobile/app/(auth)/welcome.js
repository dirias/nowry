/**
 * Welcome — the phone's front door (docs/prd-public-site.md D-M1, SITE-009).
 *
 * Before this, a signed-out cold start landed on the sign-in form and nothing
 * on the phone said what Nowry is. This is the landing's first view at 390
 * wide, from the same keys: the display wordmark, the headline, the sentence,
 * the loop as four rows, then the two actions pinned above the home indicator.
 * Top-aligned, one column, one solid (ADR-035 §2–§3). A returning user taps
 * Sign in once.
 */
import { Fragment } from 'react'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../src/theme'
import { Button, Divider, Screen, Stack, Typography } from '../../src/ui'
import { BrandWordmark } from '../../src/ui/patterns/BrandMark'

/** The product's own order (PRD D3): the same keys the web's loop reads. */
const STEPS = ['read', 'cards', 'study', 'plan']

export default function Welcome() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    // No companion floats over a guest screen, so the bubble clearance the
    // default padding reserves would be dead space under the pinned actions.
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing[3] }}>
      <Stack spacing={4} flex={1}>
        <Stack spacing={3} flex={1}>
          <BrandWordmark level='display-md' />

          <Stack spacing={1.5}>
            <Typography level='h1'>{t('landing.hero.title')}</Typography>
            <Typography level='body-md' color='text.secondary'>
              {t('landing.hero.lead')}
            </Typography>
          </Stack>

          <Stack accessibilityRole='list'>
            {STEPS.map((step, index) => (
              <Fragment key={step}>
                <Divider />
                <Stack direction='row' spacing={1.5} alignItems='flex-start' style={{ paddingVertical: theme.spacing[1.5] }}>
                  <Typography level='title-sm' color='text.tertiary' style={{ width: 22, fontVariant: ['tabular-nums'] }}>
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Stack spacing={0.5} flex={1}>
                    <Typography level='title-md'>{t(`landing.loop.${step}.title`)}</Typography>
                    <Typography level='body-sm' color='text.secondary'>
                      {t(`landing.loop.${step}.desc`)}
                    </Typography>
                  </Stack>
                </Stack>
              </Fragment>
            ))}
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          <Link href='/register' asChild>
            <Button size='lg' accessibilityLabel={t('landing.hero.cta')}>
              {t('landing.hero.cta')}
            </Button>
          </Link>
          <Link href='/login' asChild>
            <Button variant='secondary' size='lg' accessibilityLabel={t('auth.signIn')}>
              {t('auth.signIn')}
            </Button>
          </Link>
          <Typography level='body-xs' color='text.tertiary'>
            {t('auth.createAccountSubtitle')}
          </Typography>
        </Stack>
      </Stack>
    </Screen>
  )
}
