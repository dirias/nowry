/**
 * The one column the three signed-out forms stand in (docs/prd-public-site.md
 * D-M2 as amended by D-M10, SITE-010, MOB-125) — the phone's expression of the
 * web's `AuthShell`.
 *
 * The first cut drew its own 44-point row with Back and the lockup above the
 * title. The app bar does both now (MOB-122): the arrow is in the bar and the
 * bar names the product, so the row went, and the column keeps the web's
 * order under it — the display wordmark, the title at `h2` (the screen's
 * heading), one line, the fields, and the footer IN THE FLOW. The footer used
 * to be pinned above the home indicator, which on Sign in put most of a screen
 * of empty ground between the form and its one link; a footer that follows the
 * form is where the eye already is.
 */
import { Link } from 'expo-router'
import { Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { legalUrl } from '@nowry/core/constants/site'
import { useTheme } from '../../theme'
import { Button } from '../Button'
import { Divider } from '../Divider'
import { Screen } from '../Screen'
import { Stack } from '../Stack'
import { Typography } from '../Typography'
import { BrandWordmark } from './BrandMark'

export function AuthShell({ title, subtitle, footer = null, children }) {
  const theme = useTheme()

  return (
    // No companion floats over a guest screen, so the bubble clearance the
    // default padding reserves would be dead space under the footer.
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing[3] }}>
      <Stack spacing={3}>
        <BrandWordmark level='display-md' />

        <Stack spacing={0.5}>
          <Typography level='h2' accessibilityRole='header'>
            {title}
          </Typography>
          {subtitle ? (
            <Typography level='body-md' color='text.secondary'>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={3}>{children}</Stack>

        {footer}
      </Stack>
    </Screen>
  )
}

/**
 * The footer line every form ends on: a sentence and the one link it offers,
 * as a tertiary so the target is 44 points tall (BUTTONS.md §2). Centred, as
 * the web's is: it is the column's last line, not a control at the rail.
 */
export function AuthFooter({ prompt = null, href, label }) {
  return (
    <Stack direction='row' alignItems='center' justifyContent='center' spacing={0.5} flexWrap='wrap'>
      {prompt ? (
        <Typography level='body-sm' color='text.secondary'>
          {prompt}
        </Typography>
      ) : null}
      <Link href={href} replace asChild>
        <Button variant='tertiary' size='sm'>
          {label}
        </Button>
      </Link>
    </Stack>
  )
}

/**
 * "or continue with", between two rules — the web's divider row. The first
 * cut set the label flush left with one rule to its right, and the rule was
 * faint enough that the row read as a misaligned label (canvas flag 6).
 */
export function AuthDivider() {
  const { t } = useTranslation()
  return (
    <Stack direction='row' alignItems='center' spacing={1.5}>
      <Divider style={{ flex: 1 }} />
      <Typography level='body-xs' color='text.tertiary'>
        {t('auth.orContinueWith')}
      </Typography>
      <Divider style={{ flex: 1 }} />
    </Stack>
  )
}

/**
 * "By continuing, you agree to…" — the line the web shows under both forms.
 * The phone has no legal routes; the links open the web's pages (D-M6).
 */
export function AuthLegal() {
  const { t } = useTranslation()
  const open = (kind) => () => Linking.openURL(legalUrl(kind))

  return (
    <Typography level='body-xs' color='text.tertiary' style={{ textAlign: 'center' }}>
      {t('auth.byContinuing')}{' '}
      <Typography level='body-xs' color='primary.plainColor' weight='lg' onPress={open('terms')} accessibilityRole='link'>
        {t('auth.termsOfService')}
      </Typography>{' '}
      {t('auth.and')}{' '}
      <Typography level='body-xs' color='primary.plainColor' weight='lg' onPress={open('privacy')} accessibilityRole='link'>
        {t('auth.privacyPolicy')}
      </Typography>
    </Typography>
  )
}

export default AuthShell
