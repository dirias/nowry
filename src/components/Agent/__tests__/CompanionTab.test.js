/**
 * PET-008 — the species control is a paid generation input.
 *
 * Species shapes the portrait the image model draws; it is not the pet's face.
 * Free users are with Nowry, who is an owl by definition, so the choice would
 * do nothing for them and must not appear — showing a control that cannot
 * change anything is worse than not offering it.
 */
import React from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

// StageJourney fetches on mount and has its own suite; it is not under test here.
jest.mock('../StageJourney', () => {
  const StageJourneyStub = () => <div data-testid='stage-journey' />
  return StageJourneyStub
})

const CompanionTab = require('../CompanionTab').default

const tabElement = (props = {}) => (
  <CompanionTab
    petName='Nowry'
    setPetName={jest.fn()}
    petSpecies='owl'
    onSpeciesSelect={jest.fn()}
    onNameBlur={jest.fn()}
    suggestedSpecies={null}
    hasSuggestion={false}
    error={null}
    tier='pro'
    avatarUrl={null}
    avatarGenerating={false}
    avatarError={null}
    generationsRemaining={3}
    onGenerateAvatar={jest.fn()}
    animationUrl={null}
    animationGenerating={false}
    animationError={null}
    onGenerateAnimation={jest.fn()}
    {...props}
  />
)

const renderTab = (props = {}) => render(tabElement(props))

const speciesCards = () => screen.queryAllByRole('radio')

describe('CompanionTab — species control', () => {
  it('offers every species the generator understands, to a paid user', () => {
    renderTab({ tier: 'pro' })
    expect(speciesCards()).toHaveLength(10)
  })

  it('shows it to Plus as well as Pro', () => {
    renderTab({ tier: 'plus' })
    expect(speciesCards()).toHaveLength(10)
  })

  it('hides it entirely from free users', () => {
    renderTab({ tier: 'free' })
    expect(speciesCards()).toHaveLength(0)
    expect(screen.queryByText('agent.companion.speciesTitle')).not.toBeInTheDocument()
  })

  it('marks the current species as the checked option', () => {
    renderTab({ tier: 'pro', petSpecies: 'dragon' })
    const checked = speciesCards().filter((card) => card.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveTextContent('agent.companion.species.dragon')
  })

  it('reports the chosen slug, not its label', () => {
    const onSpeciesSelect = jest.fn()
    renderTab({ tier: 'pro', onSpeciesSelect })
    fireEvent.click(screen.getByText('agent.companion.species.phoenix'))
    expect(onSpeciesSelect).toHaveBeenCalledWith('phoenix')
  })

  it('is reachable by keyboard, not mouse only', () => {
    const onSpeciesSelect = jest.fn()
    renderTab({ tier: 'pro', onSpeciesSelect })
    const fox = speciesCards().find((card) => card.textContent.includes('fox'))
    fireEvent.keyDown(fox, { key: 'Enter' })
    expect(onSpeciesSelect).toHaveBeenCalledWith('fox')
  })

  // The emoji grid this replaced implied the glyph WAS the companion, which is
  // exactly what the shipped Nowry artwork exists to correct.
  it('labels species with words rather than emoji', () => {
    renderTab({ tier: 'pro' })
    for (const card of speciesCards()) {
      expect(card.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})

/**
 * GEN-004 — this component grew the app's only real progress indicator and kept
 * it private. It now reads the shared one, and these pin the behaviour that had
 * no test at all while it lived here: the stage copy the user reads, and the
 * stall that the shared hook fixes.
 */
describe('CompanionTab — generation progress', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const advance = (ms) =>
    act(() => {
      jest.advanceTimersByTime(ms)
    })
  const barValue = (name) => Number(screen.getByRole('progressbar', { name }).getAttribute('aria-valuenow'))

  // The animation section only exists once a portrait does.
  const PORTRAIT = 'https://example.test/pet.png'
  const AVATAR_LABEL = 'agent.companion.avatarGenerating'
  const ANIMATION_LABEL = 'agent.companion.animationGenerating'

  it('shows no progress bar while nothing is generating', () => {
    renderTab()

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('narrates the avatar generation and advances its stages', () => {
    renderTab({ avatarGenerating: true })

    expect(screen.getByText(/agent\.companion\.avatarStage0/)).toBeInTheDocument()

    advance(9000)
    expect(screen.getByText(/agent\.companion\.avatarStage1/)).toBeInTheDocument()

    advance(20000)
    expect(screen.getByText(/agent\.companion\.avatarStage2/)).toBeInTheDocument()
  })

  it('keeps advancing after a generation outruns its budget', () => {
    // The private hook capped at 95 and stopped. The animation budget is 180s,
    // so a 300s run — which happens — showed a frozen bar for two minutes.
    renderTab({ animationGenerating: true, avatarUrl: PORTRAIT })

    advance(180000)
    const atBudget = barValue(ANIMATION_LABEL)

    advance(180000)
    expect(barValue(ANIMATION_LABEL)).toBeGreaterThan(atBudget)
  })

  it('never claims a generation is finished while it is still running', () => {
    renderTab({ animationGenerating: true, avatarUrl: PORTRAIT })

    advance(3600000)
    expect(barValue(ANIMATION_LABEL)).toBeLessThan(100)
  })

  it('holds no finished bar after a failed generation', () => {
    // A full bar after a failure would claim a success that did not happen.
    const { rerender } = renderTab({ avatarGenerating: true })
    advance(5000)

    act(() => {
      rerender(tabElement({ avatarGenerating: false, avatarError: 'agent.avatar.generateError' }))
    })

    expect(screen.queryByRole('progressbar', { name: AVATAR_LABEL })).not.toBeInTheDocument()
  })
})
