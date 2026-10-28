import { NEAR_EVOLUTION, isNearEvolution } from '../petStages'

describe('isNearEvolution (EVO-004)', () => {
  it('is true from the threshold to the next form', () => {
    expect(isNearEvolution(3, NEAR_EVOLUTION)).toBe(true)
    expect(isNearEvolution(3, 0.99)).toBe(true)
    expect(isNearEvolution(3, NEAR_EVOLUTION - 0.01)).toBe(false)
  })

  it('is never true at the last form, or while progress is unknown', () => {
    expect(isNearEvolution(6, 0.95)).toBe(false)
    expect(isNearEvolution(2, null)).toBe(false)
    expect(isNearEvolution(2, undefined)).toBe(false)
  })
})
