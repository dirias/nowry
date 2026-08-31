/**
 * GEN-002 — the shared generation waiting state.
 *
 * The rendering is thin; what is worth pinning is the accessibility contract,
 * because it is the part a future edit is most likely to break by accident. The
 * bar carries the progress, one polite live region carries the stage text, and
 * the elapsed counter is kept out of both — a per-second announcement would make
 * every long generation unusable with a screen reader.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.seconds !== undefined ? `${key}:${options.seconds}` : key),
    i18n: { language: 'en' }
  })
}))

import GenerationProgress from '../GenerationProgress'

const progress = (over = {}) => ({
  visible: true,
  value: 40,
  mode: 'estimated',
  stage: { icon: '✨', msgKey: 'surface.stage1' },
  elapsedSeconds: 12,
  isSettling: false,
  ...over
})

describe('GenerationProgress', () => {
  it('renders nothing when the run is not visible', () => {
    const { container } = render(<GenerationProgress progress={progress({ visible: false })} label='Generating' />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when handed no progress at all', () => {
    const { container } = render(<GenerationProgress progress={undefined} label='Generating' />)

    expect(container).toBeEmptyDOMElement()
  })

  it('exposes the value on the progress bar, named by the label', () => {
    render(<GenerationProgress progress={progress()} label='Generating cards' />)

    const bar = screen.getByRole('progressbar', { name: 'Generating cards' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  it('announces the stage through one polite live region', () => {
    render(<GenerationProgress progress={progress()} label='Generating' />)

    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('surface.stage1')
  })

  it('keeps the elapsed counter out of the live region and out of the a11y tree', () => {
    render(<GenerationProgress progress={progress()} label='Generating' />)

    // Visible to sighted users…
    const elapsed = screen.getByText('generation.elapsedSeconds:12')
    expect(elapsed).toBeInTheDocument()
    // …and silent to a screen reader, which would otherwise hear it once a second.
    expect(elapsed).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).not.toHaveTextContent('generation.elapsedSeconds')
  })

  it('can drop the elapsed counter for surfaces that do not want one', () => {
    render(<GenerationProgress progress={progress()} label='Generating' showElapsed={false} />)

    expect(screen.queryByText('generation.elapsedSeconds:12')).not.toBeInTheDocument()
  })

  it('shows the caller detail line, such as a counted total', () => {
    render(<GenerationProgress progress={progress({ mode: 'counted' })} label='Generating' detail='3 of 12' />)

    expect(screen.getByText('3 of 12')).toBeInTheDocument()
  })

  it('survives a surface that supplies no stages', () => {
    render(<GenerationProgress progress={progress({ stage: null })} label='Generating' />)

    expect(screen.getByRole('progressbar', { name: 'Generating' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
