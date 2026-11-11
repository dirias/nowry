/**
 * EVO-013 (ADR-075 §4, §5) — a portrait's reveal.
 *
 * A new portrait plays the full sequence and ends with the server's count; a
 * portrait already made plays the short one; nothing plays when the server
 * refused; and the sequence itself never asks the server for anything, so
 * playing or skipping it cannot move the month's count.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, options) => (options ? `${key}:${JSON.stringify(options)}` : key), i18n: { language: 'en' } })
}))
jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: () => false }))
jest.mock('../../../theme/DynamicThemeProvider', () => ({ useThemePreferences: () => ({ themeColor: '#2a6971' }) }))
jest.mock('../CompanionArt', () => ({ CompanionArt: ({ stage }) => <span data-testid={`default-art-${stage}`} /> }))
jest.mock('../StudyPet', () => ({ PetOrb: ({ stage }) => <div data-testid={`orb-stage-${stage}`} /> }))

const mockService = { getJourney: jest.fn(), generateAvatar: jest.fn(), wearPortrait: jest.fn() }
jest.mock('@nowry/core/api/services/agent.service', () => ({ agentService: mockService }))

let mockWearPortrait = jest.fn()
jest.mock('@nowry/core/context/AgentContext', () => ({
  usePet: () => ({
    avatarUrl: 'https://img.test/a.png',
    generateNextStageArt: jest.fn().mockResolvedValue(false),
    wearPortrait: mockWearPortrait
  })
}))

const PortraitReveal = require('../PortraitReveal').default
const StageJourney = require('../StageJourney').default
const { evolutionBeats } = require('@nowry/core/domain/petEvolution')

const dialog = () => screen.queryByRole('dialog')
const playThrough = (variant) => {
  for (const { ms } of evolutionBeats(variant)) act(() => jest.advanceTimersByTime(ms))
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
})
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false
})
beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})
afterEach(() => jest.useRealTimers())

describe('a new portrait', () => {
  const generated = { kind: 'generated', stage: 3, fromUrl: null, toUrl: 'https://img.test/new.png', generationsRemaining: 2 }

  it('starts from the default form when there was no portrait before, and ends on the new one with the count', async () => {
    render(<PortraitReveal reveal={generated} onClose={jest.fn()} />)
    expect(dialog()).toHaveAttribute('data-evolution-kind', 'generated')
    expect(screen.getByTestId('default-art-3')).toBeInTheDocument()
    playThrough('full')
    await waitFor(() => expect(document.querySelector('[data-portrait-side="to"]')).toHaveAttribute('src', generated.toUrl))
    expect(screen.getByTestId('evolution-generations-left')).toHaveTextContent('pet.evolution.generationsLeft:{"count":2}')
  })

  it('asks the server for nothing, played or skipped, so the count cannot move', async () => {
    const { unmount } = render(<PortraitReveal reveal={generated} onClose={jest.fn()} />)
    playThrough('full')
    unmount()
    render(<PortraitReveal reveal={generated} onClose={jest.fn()} />)
    fireEvent.click(dialog())
    await waitFor(() => expect(dialog()).toHaveAttribute('data-evolution-phase', 'done'))
    expect(screen.getByTestId('evolution-generations-left')).toHaveTextContent('"count":2')
    for (const call of Object.values(mockService)) expect(call).not.toHaveBeenCalled()
  })

  it('renders nothing without a confirmed result', () => {
    render(<PortraitReveal reveal={null} onClose={jest.fn()} />)
    expect(dialog()).not.toBeInTheDocument()
  })
})

describe('wearing a portrait already made', () => {
  const stages = [1, 2, 3, 4, 5, 6].map((n) => ({
    stage: n,
    level_required: 1,
    xp_required: 0,
    reached: n <= 3,
    reached_at: null,
    xp_remaining: n <= 3 ? null : 100,
    ...(n === 3 ? { portraits: ['https://img.test/a.png', 'https://img.test/b.png'], art_url: 'https://img.test/a.png' } : {})
  }))
  const journey = { current_stage: 3, current_level: 6, current_xp: 700, is_default_companion: false, stages }

  const openJourney = async () => {
    mockService.getJourney.mockResolvedValue(journey)
    render(<StageJourney />)
    jest.useRealTimers()
    const options = await screen.findAllByRole('radio')
    jest.useFakeTimers()
    return options
  }

  it('plays the short version once the server accepts, and closes itself', async () => {
    mockWearPortrait = jest.fn().mockResolvedValue(true)
    const options = await openJourney()
    await act(async () => {
      fireEvent.click(options[1])
    })
    expect(mockWearPortrait).toHaveBeenCalledWith(3, 'https://img.test/b.png')
    expect(dialog()).toHaveAttribute('data-evolution-kind', 'worn')
    expect(dialog()).toHaveAttribute('data-evolution-phase', 'sweep')
    expect(screen.queryByTestId('evolution-generations-left')).not.toBeInTheDocument()
    playThrough('short')
    act(() => jest.advanceTimersByTime(1000))
    expect(dialog()).not.toBeInTheDocument()
  })

  it('plays nothing when the server refuses', async () => {
    mockWearPortrait = jest.fn().mockResolvedValue(false)
    const options = await openJourney()
    await act(async () => {
      fireEvent.click(options[1])
    })
    expect(mockWearPortrait).toHaveBeenCalled()
    expect(dialog()).not.toBeInTheDocument()
  })
})
