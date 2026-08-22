import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, LinearProgress, Skeleton, Tooltip, Typography } from '@mui/joy'
import { ArrowBackRounded } from '@mui/icons-material'

import { focusRing, sheetInlinePadding } from '../Common/Form/formStyles'
import { TOTAL_ONBOARDING_SCREENS } from './onboardingScreens'

/**
 * OnboardingPageShell — the one chrome all three onboarding screens render in.
 *
 * THE LAYOUT LAW, BORROWED WHOLESALE FROM `FormSheet`
 *
 * This is a full-page route, not a modal, so it is not a `FormSheet`. But the
 * mobile problem is identical and so is the fix: the shell is a flex column,
 * the body is `flex: 1; minHeight: 0; overflowY: auto`, and the footer is a
 * flex **sibling** of the body rather than its last child. A footer inside a
 * scroll region is a footer the user can push off the bottom of the world; a
 * footer beside one cannot move, whatever the body does. NFR-014 asks that no
 * action needed to continue, postpone, retry, fork or exit sits outside the
 * viewport, and that is a structural guarantee here, not a scroll heuristic.
 *
 * The height is `100dvh`, never `100vh` (DESIGN_GUIDELINES §8.2): `vh` keeps
 * its pre-keyboard value, so the primary action ends up underneath the on-screen
 * keyboard, and it also ignores collapsing mobile browser chrome. The superseded
 * wizard used `minHeight: 100vh` with page-level scroll, which is both halves of
 * that mistake at once. `env(safe-area-inset-bottom)` resolves to `0` without a
 * home indicator, so one footer rule covers every device class.
 *
 * The shell is written to be correct in two containers, because it has to be.
 * Mounted bare it is a `100dvh` page. Mounted inside the authenticated app shell
 * — a flex column `<main>` under the site header, which is where `/onboarding`
 * lives today — `flex: 1; minHeight: 0` makes it fill exactly the space that is
 * left, and `maxHeight: 100dvh` stops it outgrowing the visual viewport. Either
 * way the shell never scrolls; only its body does.
 *
 * WHAT IT OWNS BESIDES LAYOUT
 *
 * - **Focus on screen change.** Every change of `screenKey` moves focus to the
 *   `h3` heading, which is what makes a screen reader announce the new screen
 *   (NFR-002). Nothing here traps focus: the shell has no scrim, no focus loop
 *   and no `inert` — a user can Tab out of it into browser chrome at any time.
 * - **Progress that means something.** The five-dot indicator this replaces
 *   showed position and communicated nothing. Position is now a sentence —
 *   `onboarding.steps`, "Step 2 of 3" — in a polite live region, and the bar
 *   beside it is `aria-hidden` decoration of that same fact.
 * - **Reduced motion.** The screen enter animation is a courtesy; it carries no
 *   information that the heading, the step sentence and the content do not
 *   already carry, and it is removed entirely under `prefers-reduced-motion`
 *   (NFR-007).
 *
 * It owns no journey state, no preferences and no copy beyond its own chrome.
 */

/**
 * The constrained desktop reading width (NFR-015). Applied to the header, the
 * body and the footer from one constant so the three can never drift out of
 * alignment — the defect is invisible until the footer's actions stop lining up
 * with the content they act on.
 */
export const ONBOARDING_READING_WIDTH = 640

/** Centre a region's content and cap it at the reading width. */
const readingColumn = { width: '100%', maxWidth: ONBOARDING_READING_WIDTH, mx: 'auto' }

/**
 * The screen enter animation, and its own removal. `both` holds the end state,
 * so dropping the animation under reduced motion leaves the content exactly
 * where the animation would have finished rather than at its first frame.
 */
const screenEnter = {
  '@keyframes onboardingScreenEnter': {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'none' }
  },
  animation: 'onboardingScreenEnter 220ms cubic-bezier(0.4, 0, 0.2, 1) both',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

/** A pulse is motion too. */
const calmSkeleton = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }

/**
 * @param {Object} props
 * @param {string} props.screenKey - Changes when the user moves to another
 *   screen. Drives focus, the scroll reset and the enter animation; it is not
 *   rendered, so it may be any stable identifier including `'loading'`.
 * @param {React.ReactNode} [props.title] - The screen heading. Rendered as the
 *   focusable `h3`; ignored while `loading`.
 * @param {React.ReactNode} [props.subtitle] - Optional supporting line.
 * @param {number|null} [props.stepNumber] - One-based position, or `null` to
 *   show no position (loading, or an out-of-journey state such as an error).
 * @param {number} [props.totalSteps]
 * @param {boolean} [props.loading] - Render the chrome with skeletons instead
 *   of gating the whole page behind a spinner.
 * @param {Function|null} [props.onBack] - Omit or pass `null` on the first
 *   screen; the control is then not rendered and its space is not reserved.
 * @param {React.ReactNode} [props.banner] - Sits between body and footer, for
 *   an unsaved/failed state the user must act on.
 * @param {React.ReactNode} [props.footer] - The screen's required actions.
 * @param {React.ReactNode} props.children - The screen body.
 */
const OnboardingPageShell = ({
  screenKey,
  title = null,
  subtitle = null,
  stepNumber = null,
  totalSteps = TOTAL_ONBOARDING_SCREENS,
  loading = false,
  onBack = null,
  banner = null,
  footer = null,
  children
}) => {
  const { t } = useTranslation()
  const headingRef = useRef(null)
  const bodyRef = useRef(null)

  // NFR-002: focus moves predictably when the screen changes. The heading is
  // the destination because it is the one element that names where the user
  // now is, and `tabIndex={-1}` makes it focusable without adding a tab stop.
  useEffect(() => {
    headingRef.current?.focus()
    // A new screen starts at its own beginning. Instant, never smooth: this is
    // a navigation, and animating it would be motion carrying no meaning.
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [screenKey])

  const hasStep = typeof stepNumber === 'number' && stepNumber > 0
  const stepText = hasStep ? t('onboarding.steps', { current: stepNumber, total: totalSteps }) : ''

  return (
    <Box
      component='section'
      aria-label={t('onboarding.shell.regionLabel')}
      sx={{
        // Bare: a viewport-tall page. Inside the app's flex `<main>`: exactly
        // the space left over. `maxHeight` caps both against the *visual*
        // viewport, so the footer rides up with the keyboard instead of
        // disappearing under it.
        flex: 1,
        minHeight: 0,
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.body',
        // The shell itself never scrolls — only its body does. Without this the
        // page could scroll the footer away, which is the whole defect.
        overflow: 'hidden'
      }}
    >
      <Box
        component='header'
        sx={{
          flexShrink: 0,
          px: sheetInlinePadding,
          pt: { xs: 'calc(12px + env(safe-area-inset-top))', md: 'calc(20px + env(safe-area-inset-top))' },
          pb: { xs: 1.5, md: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ ...readingColumn, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {onBack && (
            <Tooltip title={t('onboarding.back')}>
              <IconButton
                aria-label={t('onboarding.back')}
                onClick={onBack}
                variant='plain'
                color='neutral'
                sx={{ flexShrink: 0, minWidth: 44, minHeight: 44, ...focusRing }}
              >
                <ArrowBackRounded />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* One live region, mounted for the life of the journey so its
                later changes are actually announced. It says the position in
                words because a dot cannot; the bar below repeats it visually
                and is hidden from assistive technology so it is not read
                twice (NFR-004, NFR-005). */}
            <Typography level='body-xs' role='status' sx={{ position: 'relative', color: 'text.tertiary', minHeight: '1.25rem' }}>
              <Skeleton loading={loading} sx={{ width: 96, ...calmSkeleton }}>
                {stepText}
              </Skeleton>
            </Typography>

            <LinearProgress
              determinate
              value={hasStep ? (stepNumber / totalSteps) * 100 : 0}
              aria-hidden='true'
              variant='soft'
              size='sm'
              sx={{
                mt: 0.75,
                '--LinearProgress-radius': '3px',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
              }}
            />
          </Box>
        </Box>
      </Box>

      <Box
        ref={bodyRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: sheetInlinePadding,
          py: { xs: 3, md: 4 }
        }}
      >
        {/* Keyed so a screen change remounts the column: the enter animation
            replays, the heading ref rebinds, and no stale DOM survives. */}
        <Box key={screenKey} sx={{ ...readingColumn, ...screenEnter }}>
          <Typography ref={headingRef} level='h3' tabIndex={-1} sx={{ position: 'relative', m: 0, ...focusRing }}>
            <Skeleton loading={loading} sx={{ width: '60%', ...calmSkeleton }}>
              {title}
            </Skeleton>
          </Typography>

          {subtitle && (
            <Typography level='body-md' sx={{ mt: 1, color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}

          <Box sx={{ mt: { xs: 3, md: 4 } }}>{children}</Box>
        </Box>
      </Box>

      {/* Between body and footer, exactly as in `FormSheet`: something the user
          must act on belongs above the actions, not behind them. */}
      {banner && (
        <Box sx={{ flexShrink: 0, px: sheetInlinePadding, pb: 2 }}>
          <Box sx={readingColumn}>{banner}</Box>
        </Box>
      )}

      {footer && (
        <Box
          component='footer'
          sx={{
            flexShrink: 0,
            px: sheetInlinePadding,
            pt: { xs: 2, md: 3 },
            pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', md: 'calc(24px + env(safe-area-inset-bottom))' },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface'
          }}
        >
          <Box sx={readingColumn}>{footer}</Box>
        </Box>
      )}
    </Box>
  )
}

export default OnboardingPageShell
