/**
 * OnboardingTeaser — the pre-onboarding "feature teaser" carousel.
 *
 * This component owns no journey state and no `localStorage` write itself —
 * both belong to `OnboardingRoute` (see `OnboardingRoute.test.js`'s
 * "pre-onboarding teaser gate" block). What is tested here is the carousel's
 * own contract: it shows one card at a time, dots and arrows move it, only the
 * active card is reachable, the last card swaps the forward affordance for a
 * primary action, and `onComplete` fires exactly once per exit path.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      }
    })
  }
})

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import OnboardingTeaser from '../OnboardingTeaser'
import { ONBOARDING_TEASER_CARDS } from '../../../constants/onboardingTeaserCards'
import en from '../../../locales/en/translation.json'

const teaser = en.onboarding.teaser
const FIRST = ONBOARDING_TEASER_CARDS[0]
const LAST = ONBOARDING_TEASER_CARDS[ONBOARDING_TEASER_CARDS.length - 1]

const cardTitle = (card) => teaser.cards[card.i18nKey].title
const dotLabel = (card) => teaser.dotLabel.replace('{{title}}', cardTitle(card))

const renderTeaser = (onComplete = jest.fn()) => {
  render(<OnboardingTeaser onComplete={onComplete} />)
  return onComplete
}

// Per the accessible-name spec, a hidden node's computed name is the empty
// string — so an inactive card cannot be found by role+name at all, active or
// not. `data-testid` sidesteps that and finds the card regardless of state.
const groupFor = (card) => screen.getByTestId(`onboarding-teaser-card-${card.id}`)

const touch = (type, element, clientX) => {
  fireEvent[type](element, { touches: [{ clientX }] })
}

describe('OnboardingTeaser', () => {
  // The teaser holds ONE accent — the user's own `primary.*` — across all six
  // slides, because the primary colour is user-selectable and any fixed hue
  // palette eventually collides with somebody's brand colour. A card therefore
  // carries no colour field of its own; the icon is its only differentiator.
  it('no card declares an accent of its own', () => {
    ONBOARDING_TEASER_CARDS.forEach((card) => {
      expect(Object.keys(card).sort()).toEqual(['Icon', 'i18nKey', 'id'])
    })
  })

  it('renders one region naming all six cards, only the first one reachable', () => {
    renderTeaser()

    expect(screen.getByRole('region', { name: teaser.regionLabel })).toBeInTheDocument()
    ONBOARDING_TEASER_CARDS.forEach((card) => {
      expect(screen.getByText(cardTitle(card))).toBeInTheDocument()
    })

    const firstGroup = groupFor(FIRST)
    expect(firstGroup).not.toHaveAttribute('aria-hidden', 'true')
    const secondGroup = groupFor(ONBOARDING_TEASER_CARDS[1])
    expect(secondGroup).toHaveAttribute('aria-hidden', 'true')
  })

  it('starts with Skip visible and Get Started absent', () => {
    renderTeaser()

    expect(screen.getByRole('button', { name: teaser.skip })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: teaser.getStarted })).toBeNull()
  })

  it('a dot jumps straight to its card', () => {
    renderTeaser()

    fireEvent.click(screen.getByRole('button', { name: dotLabel(ONBOARDING_TEASER_CARDS[2]) }))

    expect(groupFor(ONBOARDING_TEASER_CARDS[2])).not.toHaveAttribute('aria-hidden', 'true')
    expect(groupFor(FIRST)).toHaveAttribute('aria-hidden', 'true')
  })

  it('the desktop next/previous arrows move one card at a time and disable at the ends', () => {
    renderTeaser()

    const previous = screen.getByRole('button', { name: teaser.previous })
    const next = screen.getByRole('button', { name: teaser.next })
    expect(previous).toBeDisabled()

    fireEvent.click(next)
    expect(groupFor(ONBOARDING_TEASER_CARDS[1])).not.toHaveAttribute('aria-hidden', 'true')
    expect(previous).not.toBeDisabled()

    fireEvent.click(previous)
    expect(groupFor(FIRST)).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('on the last card, Skip is gone and Get Started replaces the next arrow', () => {
    renderTeaser()

    fireEvent.click(screen.getByRole('button', { name: dotLabel(LAST) }))

    expect(screen.queryByRole('button', { name: teaser.skip })).toBeNull()
    expect(screen.queryByRole('button', { name: teaser.next })).toBeNull()
    expect(screen.getByRole('button', { name: teaser.getStarted })).toBeInTheDocument()
  })

  it('Skip calls onComplete exactly once', () => {
    const onComplete = renderTeaser()

    fireEvent.click(screen.getByRole('button', { name: teaser.skip }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('Get Started on the last card calls onComplete exactly once', () => {
    const onComplete = renderTeaser()

    fireEvent.click(screen.getByRole('button', { name: dotLabel(LAST) }))
    fireEvent.click(screen.getByRole('button', { name: teaser.getStarted }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('tapping the active card advances it by one, but a click right after a swipe does not double-advance', () => {
    renderTeaser()
    const track = groupFor(FIRST)

    fireEvent.click(track)
    expect(groupFor(ONBOARDING_TEASER_CARDS[1])).not.toHaveAttribute('aria-hidden', 'true')

    // A real swipe: touchstart/move/end past the threshold, then the browser's
    // synthetic click that follows a touch sequence. That click must be
    // absorbed, not counted as a second, separate tap-to-advance.
    const activeCard = groupFor(ONBOARDING_TEASER_CARDS[1])
    const viewport = activeCard.closest('div').parentElement
    touch('touchStart', viewport, 300)
    touch('touchMove', viewport, 200)
    touch('touchEnd', viewport, 200)
    expect(groupFor(ONBOARDING_TEASER_CARDS[2])).not.toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(groupFor(ONBOARDING_TEASER_CARDS[2]))
    expect(groupFor(ONBOARDING_TEASER_CARDS[2])).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('a small touch move under the swipe threshold snaps back rather than advancing', () => {
    renderTeaser()
    const activeCard = groupFor(FIRST)
    const viewport = activeCard.closest('div').parentElement

    touch('touchStart', viewport, 300)
    touch('touchMove', viewport, 285) // 15px — under the 44px threshold
    touch('touchEnd', viewport, 285)

    expect(groupFor(FIRST)).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('the ArrowRight/ArrowLeft keys move the carousel', () => {
    renderTeaser()
    const region = screen.getByRole('region', { name: teaser.regionLabel })

    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(groupFor(ONBOARDING_TEASER_CARDS[1])).not.toHaveAttribute('aria-hidden', 'true')

    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(groupFor(FIRST)).not.toHaveAttribute('aria-hidden', 'true')
  })
})
