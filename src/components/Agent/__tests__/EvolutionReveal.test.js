import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { buildDynamicTheme } from '../../../theme/DynamicThemeProvider'
import { MotionGlobalConfig } from 'framer-motion'
import EvolutionReveal from '../EvolutionReveal'

let mockReduceMotion = false
jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: () => mockReduceMotion }))

const renderReveal = (onClose = jest.fn()) => {
  render(
    <CssVarsProvider theme={buildDynamicTheme()}>
      <EvolutionReveal fromStage={2} toStage={3} level={6} onClose={onClose} renderForm={(stage) => <span data-form={stage} />} />
    </CssVarsProvider>
  )
  return onClose
}

const phase = () => screen.getByRole('dialog').getAttribute('data-evolution-phase')
const shownForm = () => document.querySelector('[data-evolution-form]')?.getAttribute('data-evolution-form')

// jsdom paints no frames, so an exit would never finish and `mode='wait'` would
// hold the next form back forever. The sequence is the component's; the
// tweening is framer's.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
})
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false
})

beforeEach(() => {
  mockReduceMotion = false
  jest.useFakeTimers()
})
afterEach(() => jest.useRealTimers())

describe('EvolutionReveal (EVO-003)', () => {
  it('shows the old form, then a flash, then the new form and its name', async () => {
    renderReveal()
    expect(phase()).toBe('from')
    expect(shownForm()).toBe('2')

    act(() => jest.advanceTimersByTime(900))
    expect(phase()).toBe('flash')

    act(() => jest.advanceTimersByTime(160))
    expect(phase()).toBe('to')
    // The exit settles on a promise, after the timers.
    await waitFor(() => expect(shownForm()).toBe('3'))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('pet.stage.3.name')
  })

  it('is a dialog named by its heading', () => {
    renderReveal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', screen.getByRole('heading', { level: 2 }).id)
  })

  it('goes straight to the new form under reduced motion', () => {
    mockReduceMotion = true
    renderReveal()
    expect(phase()).toBe('to')
    expect(shownForm()).toBe('3')
  })

  it('closes from its button and from Escape', () => {
    const onClose = renderReveal()
    fireEvent.click(screen.getByRole('button', { name: 'pet.evolution.continue' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
