import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, IconButton, Typography } from '@mui/joy'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import ImageOutlined from '@mui/icons-material/ImageOutlined'

import { ONBOARDING_TEASER_CARDS } from '../../constants/onboardingTeaserCards'
import { focusRing, sheetInlinePadding, touchTargetBox } from '../Common/Form/formStyles'
import { visuallyHidden } from './taxonomySelectorStyles'

/**
 * OnboardingTeaser — a client-side-only, one-time "what Nowry can do" carousel
 * shown before a user's first real onboarding session.
 *
 * WHY THIS IS NOT A FOURTH ONBOARDING SCREEN
 *
 * `docs/prd-onboarding.md` (FR-001) locks the onboarding journey at exactly
 * three screens, resolved from the server's `resume_screen`
 * (`onboardingScreens.js`, ADR-006). This component knows nothing about that
 * journey: it takes no `journey` prop, calls no onboarding endpoint, and reads
 * no `ONBOARDING_SCREEN` value. `OnboardingRoute` gates it purely on a
 * `localStorage` flag, ahead of — and outside of — the resolved-screen state
 * machine, in the same spirit as `Study/StudyCenter.js`'s
 * check-before-show/set-on-completion pattern. It is deliberately *not*
 * `OnboardingReentry.js`'s pattern: that dismissal is server-governed on
 * purpose and avoids `localStorage` for exactly that reason, which is the
 * opposite of what is true here — nothing about *this* carousel is the
 * server's business.
 *
 * INTERACTION
 *
 * One filmstrip, one active card, `translateX` transition (skipped entirely
 * under `prefers-reduced-motion`, DESIGN_GUIDELINES §14.2/14.4). Touch swipe
 * and a tap on the (active) card advance it on any pointer; explicit prev/next
 * arrows appear from the `sm` breakpoint up for pointer devices that have no
 * swipe gesture. Six clickable progress dots jump straight to a card. `Skip`
 * sits top-right and disappears on the last card, where the swipe/next
 * affordance is replaced by a primary `Get Started` action — both call the
 * same `onComplete`, because both close the teaser out and hand control back
 * to whatever `OnboardingRoute` would otherwise have rendered.
 *
 * COLOUR AND SCALE
 *
 * One accent for the whole sequence — the user's own `primary.*`, on the icon
 * badge, the active dot and the final CTA. Cards themselves are a neutral
 * `background.surface` with a `divider` hairline, identical on every slide;
 * see `onboardingTeaserCards.js` for why per-card hues were removed. The card,
 * its media frame, its badge and its type all scale across `xs`→`lg` so the
 * composition fills a desktop viewport rather than marooning a phone-width
 * block in it, while `CONTENT_MAX_WIDTH` still caps the line length
 * (DESIGN_GUIDELINES NFR-015). Growth is proportional only: no breakpoint adds
 * content that a phone does not get.
 *
 * @param {Object} props
 * @param {Function} props.onComplete - Called once, on Skip or on Get Started.
 */

const CARDS = ONBOARDING_TEASER_CARDS
const TOTAL = CARDS.length
const SWIPE_THRESHOLD_PX = 44

/**
 * The cap on the whole composition — arrows included, so the arrows stay a
 * fixed gap from the card instead of drifting to the viewport edges as the
 * window widens.
 */
const CONTENT_MAX_WIDTH = { xs: '100%', sm: 560, md: 720, lg: 840 }

/**
 * Reserved width for one arrow. The slot exists on the last card too, where
 * the `next` arrow is gone: without it the carousel viewport would widen by an
 * arrow and every slide would jump sideways on the final transition.
 */
const ARROW_SLOT = {
  display: { xs: 'none', sm: 'flex' },
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: { sm: 40, md: 48 }
}

/** The shared placeholder standing in for a real product screenshot/crop. */
const TeaserImagePlaceholder = () => {
  const { t } = useTranslation()
  return (
    <Box
      role='img'
      aria-label={t('onboarding.teaser.imagePlaceholder')}
      sx={{
        mt: { xs: 2, md: 3 },
        // The one element that grows most with the breakpoint, so it is also the
        // one that has to answer to the viewport's HEIGHT: a flat 260px looks
        // right on a tall monitor and pushes the progress dots off a 720px-tall
        // laptop. `min()` takes whichever of the two is smaller, so the frame
        // grows into a big window and yields in a short one.
        height: { xs: 132, sm: 160, md: 'min(22dvh, 200px)', lg: 'min(22dvh, 280px)' },
        borderRadius: 'lg',
        bgcolor: 'background.level1',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ImageOutlined aria-hidden='true' sx={{ fontSize: { xs: 36, md: 44 }, color: 'text.tertiary' }} />
    </Box>
  )
}

/** One card in the filmstrip. Only the active card is reachable by tap or Tab. */
const TeaserCard = ({ card, isActive, onTap }) => {
  const { t } = useTranslation()
  const { Icon, i18nKey } = card
  const title = t(`onboarding.teaser.cards.${i18nKey}.title`)
  const description = t(`onboarding.teaser.cards.${i18nKey}.description`)

  return (
    <Box
      role='group'
      aria-roledescription='slide'
      aria-label={title}
      aria-hidden={!isActive}
      // Per the accessible-name spec, a hidden node's own computed name is the
      // empty string, so an inactive slide is deliberately unnamed to
      // assistive tech — this is only a stable hook for tests to find the
      // right card regardless of active/hidden state.
      data-testid={`onboarding-teaser-card-${card.id}`}
      onClick={isActive ? onTap : undefined}
      sx={{
        flex: `0 0 ${100 / TOTAL}%`,
        width: `${100 / TOTAL}%`,
        boxSizing: 'border-box',
        px: { xs: 0.5, sm: 1 }
      }}
    >
      <Box
        sx={{
          borderRadius: 'xl',
          bgcolor: 'background.surface',
          // A hairline, not a shadow: `background.surface` sits only a shade
          // off `background.body` in both schemes, and a shadow all but
          // disappears against the near-black dark body — the border is the one
          // delineator that reads in both.
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2.5, sm: 3, md: 4 },
          cursor: isActive ? 'pointer' : 'default'
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            width: { xs: 40, sm: 44, md: 52 },
            height: { xs: 40, sm: 44, md: 52 },
            borderRadius: 'md',
            bgcolor: 'primary.solidBg',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {/* `solidColor` and not a fixed white: it is the token the theme
              derives from `solidBg`, so the glyph stays legible on every one of
              the seven user-selectable accents, light ones included. */}
          <Icon sx={{ fontSize: { xs: 22, sm: 24, md: 28 }, color: 'primary.solidColor' }} />
        </Box>

        <TeaserImagePlaceholder />

        <Typography level='title-lg' sx={{ mt: { xs: 2, md: 3 }, color: 'text.primary', typography: { md: 'h4', lg: 'h3' } }}>
          {title}
        </Typography>
        <Typography level='body-sm' sx={{ mt: { xs: 0.5, md: 1 }, color: 'text.secondary', typography: { md: 'body-md', lg: 'body-lg' } }}>
          {description}
        </Typography>

        {/* A build-time reminder only, never shown to a user (see the module
            doc in `onboardingTeaserCards.js`): where the real crop for this
            card should be captured once product screenshots exist. */}
        {process.env.NODE_ENV === 'development' && (
          <Typography level='body-xs' aria-hidden='true' sx={{ mt: 1, color: 'text.tertiary', fontStyle: 'italic' }}>
            dev: crop target — {i18nKey}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

const OnboardingTeaser = ({ onComplete }) => {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartXRef = useRef(null)
  const lastDeltaRef = useRef(0)
  const suppressTapRef = useRef(false)

  const isLast = activeIndex === TOTAL - 1
  const activeCard = CARDS[activeIndex]
  const activeTitle = t(`onboarding.teaser.cards.${activeCard.i18nKey}.title`)

  const goToIndex = useCallback((index) => {
    setActiveIndex(Math.min(Math.max(index, 0), TOTAL - 1))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(current + 1, TOTAL - 1))
  }, [])

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(current - 1, 0))
  }, [])

  const handleTouchStart = useCallback((event) => {
    dragStartXRef.current = event.touches[0].clientX
    lastDeltaRef.current = 0
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((event) => {
    if (dragStartXRef.current === null) return
    const delta = event.touches[0].clientX - dragStartXRef.current
    lastDeltaRef.current = delta
    setDragOffset(delta)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (dragStartXRef.current === null) return
    const delta = lastDeltaRef.current
    dragStartXRef.current = null
    setIsDragging(false)
    setDragOffset(0)

    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    suppressTapRef.current = true
    if (delta < 0) goNext()
    else goPrevious()
  }, [goNext, goPrevious])

  // A touch device fires a synthetic click right after `touchend`. Without this
  // guard, a real swipe would also register as the "tap the active card to
  // advance" gesture and skip an extra card.
  const handleCardTap = useCallback(() => {
    if (suppressTapRef.current) {
      suppressTapRef.current = false
      return
    }
    goNext()
  }, [goNext])

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrevious()
      }
    },
    [goNext, goPrevious]
  )

  const handleSkip = useCallback(() => onComplete(), [onComplete])
  const handleGetStarted = useCallback(() => onComplete(), [onComplete])

  const trackTranslate = `calc(-${(activeIndex * 100) / TOTAL}% + ${dragOffset}px)`

  return (
    <Box
      component='section'
      aria-label={t('onboarding.teaser.regionLabel')}
      onKeyDown={handleKeyDown}
      sx={{
        // Same two-container contract as `OnboardingPageShell`, and for the
        // same reason: `/onboarding` renders inside the app's flex `<main>`,
        // under the site header. `minHeight: 100dvh` there meant a viewport-tall
        // block starting 64px down — the progress dots fell off the bottom of
        // the screen, which is why they looked "missing". `flex: 1; minHeight: 0`
        // takes exactly the space that is left; `height`/`maxHeight` keep it a
        // viewport-tall page when it is mounted bare. `overflowY` is the safety
        // valve for very short windows — nothing is ever clipped out of reach.
        flex: 1,
        minHeight: 0,
        height: '100dvh',
        maxHeight: '100dvh',
        overflowY: 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.body',
        px: sheetInlinePadding,
        pt: 'calc(12px + env(safe-area-inset-top))',
        pb: 'calc(16px + env(safe-area-inset-bottom))'
      }}
    >
      {/* Capped to the same width as the carousel so Skip stays over the card's
          own right edge instead of drifting into a far corner on wide screens. */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          minHeight: 44,
          flexShrink: 0,
          maxWidth: CONTENT_MAX_WIDTH,
          width: '100%',
          mx: 'auto'
        }}
      >
        {!isLast && (
          <Button variant='plain' color='neutral' onClick={handleSkip} sx={{ minHeight: 44, ...focusRing }}>
            {t('onboarding.teaser.skip')}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: CONTENT_MAX_WIDTH,
          width: '100%',
          mx: 'auto',
          py: { xs: 1, md: 2 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
          <Box sx={ARROW_SLOT}>
            <IconButton
              aria-label={t('onboarding.teaser.previous')}
              onClick={goPrevious}
              disabled={activeIndex === 0}
              variant='plain'
              color='neutral'
              sx={{ ...touchTargetBox, ...focusRing }}
            >
              <ChevronLeftRounded />
            </IconButton>
          </Box>

          <Box
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <Box
              sx={{
                display: 'flex',
                width: `${TOTAL * 100}%`,
                transform: `translateX(${trackTranslate})`,
                transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
              }}
            >
              {CARDS.map((card, index) => (
                <TeaserCard key={card.id} card={card} isActive={index === activeIndex} onTap={handleCardTap} />
              ))}
            </Box>
          </Box>

          <Box sx={ARROW_SLOT}>
            {!isLast && (
              <IconButton
                aria-label={t('onboarding.teaser.next')}
                onClick={goNext}
                variant='plain'
                color='neutral'
                sx={{ ...touchTargetBox, ...focusRing }}
              >
                <ChevronRightRounded />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: { xs: 3, md: 4 } }}>
          {CARDS.map((card, index) => {
            const dotTitle = t(`onboarding.teaser.cards.${card.i18nKey}.title`)
            const isActive = index === activeIndex
            return (
              <Box
                key={card.id}
                component='button'
                type='button'
                onClick={() => goToIndex(index)}
                aria-label={t('onboarding.teaser.dotLabel', { title: dotTitle })}
                aria-current={isActive ? 'true' : undefined}
                sx={{
                  ...touchTargetBox,
                  p: 0,
                  border: 'none',
                  bgcolor: 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  ...focusRing,
                  // WHY THE DOT IS A PSEUDO-ELEMENT AND NOT A CHILD <Box>
                  //
                  // HISTORICAL, AND NO LONGER BINDING. `src/index.css` used to
                  // carry a global
                  // `button *:not(…) { background-color: transparent !important }`
                  // reset. A nested Box inside this button matched it, so the
                  // dot's fill was stripped — in BOTH colour schemes, at any
                  // token. That, not the token, is why the dots were invisible.
                  // `::after` is not a descendant *element*, so the reset did
                  // not reach it.
                  //
                  // That reset has since been deleted (see the deletion note in
                  // `src/index.css`), so a plain child <Box> would render
                  // correctly here now. `::after` is kept because it works and
                  // costs nothing, not because it is still required — treat the
                  // choice as free if this component is reworked.
                  //
                  // The colours are the second half of the
                  // problem. Inactive is `text.tertiary`, not
                  // `neutral.outlinedBorder`: the theme overrides no dark
                  // `neutral`, so Joy's default there is a near-black grey on a
                  // near-black body. Active is `plainColor`, not `solidBg`:
                  // `solidBg` is a *fill* token, derived dark enough to carry
                  // white button text, which on the dark body measures 1.4:1 —
                  // dimmer than the inactive dots it is meant to outrank.
                  // `plainColor` is the same brand accent under the theme's own
                  // "legible directly on background.body" guarantee.
                  '&::after': {
                    content: '""',
                    display: 'block',
                    width: isActive ? { xs: 20, md: 24 } : { xs: 8, md: 10 },
                    height: { xs: 8, md: 10 },
                    borderRadius: 'sm',
                    bgcolor: isActive ? 'primary.plainColor' : 'text.tertiary',
                    transition: 'width 200ms ease',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                  }
                }}
              />
            )
          })}
        </Box>

        <Typography role='status' aria-live='polite' level='body-xs' sx={visuallyHidden}>
          {t('onboarding.teaser.progress', { current: activeIndex + 1, total: TOTAL, title: activeTitle })}
        </Typography>

        {isLast && (
          <Button
            onClick={handleGetStarted}
            variant='solid'
            color='primary'
            sx={{ mt: { xs: 3, md: 4 }, minHeight: { xs: 44, md: 52 }, alignSelf: 'center', px: { xs: 4, md: 6 }, ...focusRing }}
          >
            {t('onboarding.teaser.getStarted')}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default OnboardingTeaser
