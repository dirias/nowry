/**
 * The one column the three signed-out forms stand in (docs/prd-public-site.md
 * D-M2, SITE-010) — the phone's expression of the web's `AuthShell`.
 *
 * A 44-point row with Back and the lockup, the title at `h2` (the screen's
 * heading; the phone has no h1 chrome above it), one line, the fields, and a
 * footer pinned above the home indicator. Top-aligned: the form no longer
 * floats mid-screen and no longer jumps when the keyboard opens.
 *
 * `backHref` defaults to Welcome, the screen every form is reached from; Reset
 * passes Sign in. `replace`, because a cold start that lands on a form (a deep
 * link, a restored route) has no history to go back to.
 */
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { Button } from '../Button'
import { Icon } from '../icons'
import { Screen } from '../Screen'
import { Stack } from '../Stack'
import { Typography } from '../Typography'
import { MIN_TOUCH_TARGET } from '../buttonSpec'
import { BrandLockup } from './BrandMark'

export function AuthShell({ title, subtitle, backHref = '/welcome', footer = null, children }) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Screen contentContainerStyle={{ paddingBottom: theme.spacing[3] }}>
      <Stack spacing={3} flex={1}>
        <Stack
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          // The tertiary's own padding is what aligns its glyph to the rail.
          style={{ minHeight: MIN_TOUCH_TARGET, marginLeft: -theme.spacing[1.5] }}
        >
          <Link href={backHref} replace asChild>
            <Button
              variant='tertiary'
              size='sm'
              startGlyph={<Icon name='ArrowLeft' size='sm' color='primary.plainColor' />}
              accessibilityLabel={t('common.back')}
            >
              {t('common.back')}
            </Button>
          </Link>
          <BrandLockup markSize={24} />
        </Stack>

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

        <Stack spacing={3} flex={1}>
          {children}
        </Stack>

        {footer}
      </Stack>
    </Screen>
  )
}

/**
 * The footer line every form ends on: a sentence and the one link it offers,
 * as a tertiary so the target is 44 points tall (BUTTONS.md §2).
 */
export function AuthFooter({ prompt = null, href, label }) {
  return (
    <Stack direction='row' alignItems='center' spacing={0.5} flexWrap='wrap'>
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

export default AuthShell
