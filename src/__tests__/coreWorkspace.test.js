/**
 * The web client's half of the ADR-031 guard.
 *
 * `packages/core` is consumed as source through an npm workspace symlink, which
 * webpack and jest both resolve to a real path outside `src`. This test fails the
 * moment that arrangement stops working, which is cheaper than discovering it in
 * a deploy.
 */
import { CORE_BOUNDARY, BoundaryProvider, BoundaryContext, readBoundary } from '@nowry/core'

describe('@nowry/core resolves from the web client', () => {
  it('imports a plain export across the workspace boundary', () => {
    expect(CORE_BOUNDARY).toBe('core-boundary-ok')
  })

  it('imports a createElement provider', () => {
    const element = BoundaryProvider({ children: null })
    expect(element.type).toBe(BoundaryContext.Provider)
  })

  it('imports modern syntax compiled without a build step', async () => {
    await expect(readBoundary({})).resolves.toBe('core-boundary-ok')
  })
})
