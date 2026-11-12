/**
 * The beta flags say whether they were answered (WAIT-011, FR-015).
 *
 * The flags keep ADR-038's default when the server is silent; `loading` and
 * `failed` let the landing hero tell "no beta" from "no answer".
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const mockGetConfig = jest.fn()
jest.mock('../../api/services/beta.service', () => ({ betaService: { getConfig: (...args) => mockGetConfig(...args) } }))

import { BetaProvider, useBeta } from '../BetaContext'

const Probe = () => {
  const { config, loading, failed } = useBeta()
  return React.createElement('output', null, JSON.stringify({ invite: config.invite_required, loading, failed }))
}
const read = () => JSON.parse(screen.getByRole('status').textContent)
const mount = () => render(React.createElement(BetaProvider, null, React.createElement(Probe)))

it('is loading, with the no-beta default, until the server answers', async () => {
  let answer
  mockGetConfig.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  mount()
  expect(read()).toEqual({ invite: false, loading: true, failed: false })
  answer({ active: true, invite_required: true, upgrades_open: false })
  await waitFor(() => expect(read()).toEqual({ invite: true, loading: false, failed: false }))
})

it('says the call failed, and keeps the no-beta default', async () => {
  mockGetConfig.mockRejectedValue(new Error('unreachable'))
  mount()
  await waitFor(() => expect(read()).toEqual({ invite: false, loading: false, failed: true }))
})

it('reads as answered, no beta, outside a provider', () => {
  render(React.createElement(Probe))
  expect(read()).toEqual({ invite: false, loading: false, failed: false })
})
