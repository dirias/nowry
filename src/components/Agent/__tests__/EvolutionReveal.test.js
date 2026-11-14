import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { buildDynamicTheme } from '../../../theme/DynamicThemeProvider'
import { MotionGlobalConfig } from 'framer-motion'
import EvolutionReveal from '../EvolutionReveal'
import { beatDuration, evolutionBeats, evolutionDuration } from '@nowry/core/domain/petEvolution'

let mockReduceMotion = false
jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: () => mockReduceMotion }))

const renderReveal = (onClose = jest.fn(), props = {}) => {
  render(
    <CssVarsProvider theme={buildDynamicTheme()}>
      <EvolutionReveal
        fromStage={2}
        toStage={3}
        level={6}
        onClose={onClose}
        renderForm={(stage, side) => <span data-form={stage} data-side={side} />}
        {...props}
      />
    </CssVarsProvider>
  )
  return onClose
}

const phase = () => screen.getByRole('dialog').getAttribute('data-evolution-phase')
const shown = () => document.querySelector('[data-evolution-form]')
const shownForm = () => shown()?.getAttribute('data-evolution-form')
const shownSide = () => shown()?.getAttribute('data-evolution-side')
const spiral = () => document.querySelector('[data-spiral-beat]')
const beatMs = (variant, beat) => beatDuration(variant, beat)
/** Each beat sets the next one's timer from an effect, so the clock is walked a beat at a time. */
const playThrough = (variant) => {
  for (const { ms } of evolutionBeats(variant)) act(() => jest.advanceTimersByTime(ms))
}

// jsdom paints no frames, so an exit would never finish and an exiting form
// would stay in the cell for ever. The sequence is the component's; the
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

describe('EvolutionReveal — a stage earned by level (EVO-003, ADR-075)', () => {
  it('holds the old form while the spiral draws and tightens, swaps under the flash, then shows the new form and its name', async () => {
    renderReveal()
    expect(phase()).toBe('anticipation')
    expect(shownForm()).toBe('2')
    expect(spiral()).toHaveAttribute('data-spiral-beat', 'anticipation')

    act(() => jest.advanceTimersByTime(beatMs('full', 'anticipation')))
    expect(phase()).toBe('transformation')
    expect(shownForm()).toBe('2')

    act(() => jest.advanceTimersByTime(beatMs('full', 'transformation')))
    expect(phase()).toBe('flash')

    act(() => jest.advanceTimersByTime(beatMs('full', 'flash')))
    expect(phase()).toBe('reveal')
    // The exit settles on a promise, after the timers.
    await waitFor(() => expect(shownForm()).toBe('3'))

    act(() => jest.advanceTimersByTime(beatMs('full', 'reveal')))
    expect(phase()).toBe('done')
    expect(spiral()).toBeNull()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('pet.stage.3.name')
    expect(screen.getByRole('button', { name: 'pet.evolution.continue' })).toBeInTheDocument()
    expect(screen.queryByTestId('evolution-generations-left')).not.toBeInTheDocument()
  })

  it('lights the gold flash the moment its beat starts, over the old form as it fades, not after it has gone', () => {
    renderReveal()
    act(() => jest.advanceTimersByTime(beatMs('full', 'anticipation')))
    act(() => jest.advanceTimersByTime(beatMs('full', 'transformation')))
    expect(phase()).toBe('flash')
    // No promise is let settle here: the flash may not wait for the old form's exit.
    const flash = document.querySelector('[data-evolution-flash]')
    expect(flash).not.toBeNull()
    // The old form is still there, fading, and the flash is drawn after it, over it.
    const from = document.querySelector('[data-evolution-side="from"]')
    expect(from).not.toBeNull()
    expect(from.compareDocumentPosition(flash) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('is a dialog named by its heading', () => {
    renderReveal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', screen.getByRole('heading', { level: 2 }).id)
  })

  it('goes straight to the new form under reduced motion, with no spiral', () => {
    mockReduceMotion = true
    renderReveal()
    expect(phase()).toBe('done')
    expect(shownForm()).toBe('3')
    expect(spiral()).toBeNull()
  })

  it('skips to the end on a tap, and says so while it runs', async () => {
    const onClose = renderReveal()
    expect(screen.getByText('pet.evolution.skip')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('dialog'))
    expect(phase()).toBe('done')
    await waitFor(() => expect(shownForm()).toBe('3'))
    expect(screen.queryByText('pet.evolution.skip')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes from its button once it has played, and from Escape at any time', () => {
    const onClose = renderReveal()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: 'pet.evolution.continue' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('EvolutionReveal — a new portrait (EVO-013, ADR-075)', () => {
  const generated = (generationsRemaining) => ({ kind: 'generated', fromStage: 3, toStage: 3, generationsRemaining })

  it('plays the full sequence between two portraits of one stage, then says how many are left', async () => {
    renderReveal(jest.fn(), generated(2))
    expect(phase()).toBe('anticipation')
    expect(shownSide()).toBe('from')
    playThrough('full')
    await waitFor(() => expect(phase()).toBe('done'))
    await waitFor(() => expect(shownSide()).toBe('to'))
    expect(screen.getByTestId('evolution-generations-left')).toHaveTextContent('pet.evolution.generationsLeft')
    expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument()
  })

  it('says it was the last one, and when more come back', () => {
    mockReduceMotion = true
    renderReveal(jest.fn(), generated(0))
    const line = screen.getByTestId('evolution-generations-left')
    expect(line).toHaveTextContent('pet.evolution.generationsNone')
    expect(line).toHaveTextContent('pet.evolution.resetsOn')
  })

  it('states no count the server did not give', () => {
    mockReduceMotion = true
    renderReveal(jest.fn(), generated(undefined))
    expect(screen.queryByTestId('evolution-generations-left')).not.toBeInTheDocument()
  })
})

describe('EvolutionReveal — a portrait already made (EVO-013, ADR-075)', () => {
  const worn = { kind: 'worn', fromStage: 3, toStage: 3, generationsRemaining: 2 }

  it('plays the short version, states no count, and closes itself', async () => {
    const onClose = renderReveal(jest.fn(), worn)
    expect(phase()).toBe('sweep')
    playThrough('short')
    await waitFor(() => expect(phase()).toBe('done'))
    expect(evolutionDuration('short')).toBeLessThanOrEqual(1200)
    expect(screen.queryByTestId('evolution-generations-left')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(1000))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
