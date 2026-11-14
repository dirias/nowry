/** LOG-002 — the attempt behind a grade, measured and shaped once (ADR-059 §1–2). */
import { attemptPayload, attemptTimings, emptyHelp } from '../attempt'

describe('attemptTimings', () => {
  it('splits shown → flipped → graded into think and judge time', () => {
    expect(attemptTimings({ shownAt: 1000, flippedAt: 2800, gradedAt: 3700 })).toEqual({ thinkMs: 1800, judgeMs: 900 })
  })

  it('has no judge time when the card was never flipped', () => {
    expect(attemptTimings({ shownAt: 1000, flippedAt: null, gradedAt: 2500 })).toEqual({ thinkMs: 1500, judgeMs: null })
  })

  it('knows nothing when the card was never shown', () => {
    expect(attemptTimings({ shownAt: null, gradedAt: 2500 })).toEqual({ thinkMs: null, judgeMs: null })
  })

  it('never sends a negative or an absurd time', () => {
    expect(attemptTimings({ shownAt: 5000, flippedAt: 4000, gradedAt: 4500 }).thinkMs).toBeNull()
    expect(attemptTimings({ shownAt: 0, flippedAt: 10000000, gradedAt: 10000001 }).thinkMs).toBe(3600000)
  })
})

describe('attemptPayload', () => {
  it("writes the API's names from the clients' words", () => {
    const body = attemptPayload({
      clientSessionId: 's1',
      showing: 'practice',
      side: 'front',
      thinkMs: 1800,
      judgeMs: 900,
      help: { companion: 'chat', audio: 2 },
      position: 3,
      total: 16,
      scope: 'deck',
      localHour: 23,
      client: 'phone'
    })
    expect(body).toEqual({
      client_session_id: 's1',
      showing: 'practice',
      side: 'front',
      think_ms: 1800,
      judge_ms: 900,
      confidence: null,
      chosen_option: null,
      help: { companion: 'chat', audio: 2, hint: false, source: false },
      position: 3,
      total: 16,
      scope: 'deck',
      block_id: null,
      local_hour: 23,
      client: 'phone'
    })
  })

  it('defaults to a scheduled showing with empty help and the local hour', () => {
    const body = attemptPayload({})
    expect(body.showing).toBe('scheduled')
    expect(body.help).toEqual(emptyHelp())
    expect(body.local_hour).toBe(new Date().getHours())
  })
})
