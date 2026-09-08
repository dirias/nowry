/**
 * ADR-021's numbers, checked against the decision.
 *
 * These are the shapes a screen is made of, so a drift here is not a styling
 * nit — it is the row grammar quietly diverging between the two clients.
 */
import { LIST_ROW_HEIGHT as SHARED } from '@nowry/core/tokens/tokens'
import { IDENTITY_TILE_SIZE, LIST_ROW_HEIGHT, MEASURE_HEIGHT, MEASURE_WIDTH, SUMMARY_EDGE_HEIGHT } from '../patterns/rowSpec'

describe('the row and summary grammar (ADR-021)', () => {
  it('uses the `xs` row height, because a phone is always `xs`', () => {
    expect(LIST_ROW_HEIGHT).toBe(56)
    expect(LIST_ROW_HEIGHT).toBe(SHARED.xs)
    // Taken from the shared token, not transcribed, so the web cannot move
    // without this moving too.
    expect(SHARED.sm).toBe(52)
  })

  it('measures 64 by 3, per §4', () => {
    expect(MEASURE_WIDTH).toBe(64)
    expect(MEASURE_HEIGHT).toBe(3)
  })

  it('draws the identity tile at 16, per §2', () => {
    expect(IDENTITY_TILE_SIZE).toBe(16)
  })

  it('makes the summary object’s progress a 3px edge, not a bar inside it', () => {
    expect(SUMMARY_EDGE_HEIGHT).toBe(3)
    expect(SUMMARY_EDGE_HEIGHT).toBe(MEASURE_HEIGHT)
  })

  it('keeps the row taller than the minimum touch target', () => {
    // A row that is a control must still be pressable without aiming.
    expect(LIST_ROW_HEIGHT).toBeGreaterThanOrEqual(44)
  })
})
