import React from 'react'
import { CORE_BOUNDARY, BoundaryContext, BoundaryProvider, readBoundary } from '../boundary'

describe('@nowry/core boundary (ADR-031)', () => {
  it('exports a plain value', () => {
    expect(CORE_BOUNDARY).toBe('core-boundary-ok')
  })

  it('builds a provider element without JSX', () => {
    const element = BoundaryProvider({ children: 'child' })
    expect(element.type).toBe(BoundaryContext.Provider)
    expect(element.props.value).toEqual({ ok: true })
  })

  it('supports spread, optional chaining and async', async () => {
    await expect(readBoundary({ other: 1 })).resolves.toBe('core-boundary-ok')
    await expect(readBoundary(undefined)).resolves.toBe('core-boundary-ok')
  })

  it('runs with no DOM in scope', () => {
    expect(typeof globalThis.window).toBe('undefined')
    expect(typeof globalThis.document).toBe('undefined')
    expect(React.createElement).toBeInstanceOf(Function)
  })
})
