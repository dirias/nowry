/** STUDY-014 — a client-minted id is distinct across calls and has no browser dependency (ADR-058 §2). */
import { newClientId } from '../clientId'

it('mints distinct, non-empty ids', () => {
  const ids = new Set(Array.from({ length: 200 }, newClientId))
  expect(ids.size).toBe(200)
  ids.forEach((id) => expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/))
})
