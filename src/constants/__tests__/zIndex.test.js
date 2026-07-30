/**
 * Phase 28 Plan 01 — zIndex.js tier-ordering invariant test (PET-02, D-05).
 * Dependency-free: imports only the constants module, no component/context mocks.
 */
import { Z_NAV, Z_PET_RESTING, Z_FULLSCREEN, Z_PET_FULLSCREEN, Z_CELEBRATION } from '../zIndex'

describe('zIndex constants — tier ordering invariant (Phase 28, D-05/PET-02)', () => {
  it('preserves Z_NAV < Z_PET_RESTING < Z_FULLSCREEN < Z_PET_FULLSCREEN < Z_CELEBRATION', () => {
    expect(Z_NAV).toBeLessThan(Z_PET_RESTING)
    expect(Z_PET_RESTING).toBeLessThan(Z_FULLSCREEN)
    expect(Z_FULLSCREEN).toBeLessThan(Z_PET_FULLSCREEN)
    expect(Z_PET_FULLSCREEN).toBeLessThan(Z_CELEBRATION)
  })

  it('exports all five constants as numbers', () => {
    ;[Z_NAV, Z_PET_RESTING, Z_FULLSCREEN, Z_PET_FULLSCREEN, Z_CELEBRATION].forEach((v) => {
      expect(typeof v).toBe('number')
    })
  })
})
