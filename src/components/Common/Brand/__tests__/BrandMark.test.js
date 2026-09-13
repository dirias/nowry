import React from 'react'
import { render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { BrandLockup, BrandMark } from '../BrandMark'

const wrap = (node) => render(<CssVarsProvider>{node}</CssVarsProvider>)

describe('BrandMark (ADR-034)', () => {
  it('is decorative unless it is given a name', () => {
    const { container } = wrap(<BrandMark size={40} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelector('path').getAttribute('d')).toMatch(/^M[\d. L-]+Z$/)
  })

  it('names itself when it stands alone', () => {
    wrap(<BrandMark title='Nowry' />)
    expect(screen.getByRole('img', { name: 'Nowry' })).toBeInTheDocument()
  })

  it('cuts the eye out with a mask the drawing actually references', () => {
    const { container } = wrap(<BrandMark />)
    const mask = container.querySelector('mask')
    expect(container.querySelector('g').getAttribute('mask')).toBe(`url(#${mask.id})`)
    expect(mask.id).toMatch(/^[a-zA-Z0-9_-]+$/)
  })

  it('draws in currentColor, so the mark wears the ground it sits on', () => {
    const { container } = wrap(<BrandMark />)
    expect(container.querySelector('g')).toHaveAttribute('fill', 'currentColor')
  })

  it('sets the wordmark beside the mark', () => {
    wrap(<BrandLockup />)
    expect(screen.getByText('nowry')).toBeInTheDocument()
  })
})
