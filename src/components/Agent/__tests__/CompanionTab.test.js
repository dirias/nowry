/**
 * PET-008 — the species control is a paid generation input.
 *
 * Species shapes the portrait the image model draws; it is not the pet's face.
 * Free users are with Nowry, who is an owl by definition, so the choice would
 * do nothing for them and must not appear — showing a control that cannot
 * change anything is worse than not offering it.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

// StageJourney fetches on mount and has its own suite; it is not under test here.
jest.mock('../StageJourney', () => {
  const StageJourneyStub = () => <div data-testid='stage-journey' />
  return StageJourneyStub
})

const CompanionTab = require('../CompanionTab').default

const renderTab = (props = {}) =>
  render(
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
