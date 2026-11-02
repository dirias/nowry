/** The sessions service sends the client session id with a log and reads a session's ledger (ADR-058 §2, ADR-059). */
jest.mock('../../client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }))

import { apiClient } from '../../client'
import { studySessionsService } from '../studySessions.service'

beforeEach(() => {
  apiClient.post.mockReset()
  apiClient.get.mockReset()
})

it('log sends the client session id and the session kind', async () => {
  apiClient.post.mockResolvedValue({ data: { logged: true, score_percentage: 50, session_id: 'S' } })
  const result = await studySessionsService.log({
    deckId: 'd1',
    deckName: null,
    startedAt: new Date('2026-11-02T08:00:00Z'),
    clientSessionId: 'abc',
    sessionType: 'drill',
    cards: [{ cardId: 'c1', cardTitle: '果物', grade: 'again', evaluation: 'incorrect' }]
  })
  expect(apiClient.post).toHaveBeenCalledWith(
    '/v1/study-sessions/log',
    expect.objectContaining({
      session_type: 'drill',
      deck_id: 'd1',
      client_session_id: 'abc',
      started_at: '2026-11-02T08:00:00.000Z',
      cards: [{ card_id: 'c1', card_title: '果物', grade: 'again', evaluation: 'incorrect' }]
    })
  )
  expect(result).toEqual({ logged: true, scorePercentage: 50, sessionId: 'S' })
})

it('log defaults to a flashcard review with no session id', async () => {
  apiClient.post.mockResolvedValue({ data: {} })
  await studySessionsService.log({ deckId: null, deckName: null, startedAt: '2026-11-02T08:00:00Z', cards: [] })
  expect(apiClient.post.mock.calls[0][1]).toMatchObject({ session_type: 'srs_review', client_session_id: null })
})

it("attempts reads a session's ledger into the clients' words", async () => {
  apiClient.get.mockResolvedValue({ data: { attempts: [{ card_id: 'c1' }], median_think_ms: 1500, days_since_previous: 19 } })
  expect(await studySessionsService.attempts('S 1')).toEqual({ attempts: [{ card_id: 'c1' }], medianThinkMs: 1500, daysSincePrevious: 19 })
  expect(apiClient.get).toHaveBeenCalledWith('/v1/study-sessions/S%201/attempts')
})
