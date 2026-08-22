/**
 * ONB-005 — useOnboardingJourney.
 *
 * The cases worth writing are the ones where a plausible controller gets it
 * wrong: inferring activation from a screen or an AI response, treating a
 * lost fork response as a duplicate, regenerating the idempotency key on every
 * retry, or reporting "already activated" as a save failure. Each of those is
 * a test below.
 */
import { act, renderHook, waitFor } from '@testing-library/react'

jest.mock('../api/services/user.service', () => ({
  userService: {
    getOnboardingState: jest.fn(),
    recordOnboardingPoint: jest.fn(),
    postponeOnboarding: jest.fn()
  }
}))

jest.mock('../api/services/publicContent.service', () => ({
  publicContentService: {
    browseOfficialDecks: jest.fn(),
    forkDeckForOnboarding: jest.fn()
  }
}))

jest.mock('../api/services/cards.service', () => ({
  cardsService: { generateOnboardingFallback: jest.fn() }
}))

const { userService } = require('../api/services/user.service')
const { publicContentService } = require('../api/services/publicContent.service')
const { cardsService } = require('../api/services/cards.service')

const useOnboardingJourney = require('./useOnboardingJourney').default
const { ACTION_PHASE, BROWSE_PHASE, JOURNEY_PHASE, classifyError } = require('./useOnboardingJourney')

const incompleteJourney = (overrides = {}) => ({
  status: 'incomplete',
  last_meaningful_point: 'personalization',
  postponed_at: null,
  activated_at: null,
  updated_at: '2026-08-13T02:00:00Z',
  show_reentry: false,
  resume_screen: 'personalization',
  ...overrides
})

const activatedJourney = () => ({
  status: 'activated',
  last_meaningful_point: 'personalization',
  postponed_at: null,
  activated_at: '2026-08-13T03:00:00Z',
  updated_at: '2026-08-13T03:00:00Z',
  show_reentry: false,
  resume_screen: null
})

const httpError = (status, detail) => {
  const error = new Error(`Request failed with status code ${status}`)
  error.response = { status, data: { detail } }
  return error
}

/** Mount and wait until the initial journey read has settled. */
const setup = async (options = {}) => {
  let view
  await act(async () => {
    view = renderHook(() => useOnboardingJourney({ forkRetryDelayMs: 0, ...options }))
  })
  await waitFor(() => expect(view.result.current.journeyPhase).not.toBe(JOURNEY_PHASE.LOADING))
  return view
}

beforeEach(() => {
  jest.clearAllMocks()
  window.sessionStorage.clear()
  userService.getOnboardingState.mockResolvedValue(incompleteJourney())
})

describe('journey read', () => {
  it('loads on mount and exposes only the server-derived resume screen', async () => {
    userService.getOnboardingState.mockResolvedValue(incompleteJourney({ resume_screen: 'first_deck', show_reentry: true }))

    const { result } = await setup()

    expect(result.current.journeyPhase).toBe(JOURNEY_PHASE.READY)
    expect(result.current.resumeScreen).toBe('first_deck')
    expect(result.current.showReentry).toBe(true)
    expect(result.current.isActivated).toBe(false)
  })

  it('reports an activated user with no resume screen', async () => {
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    const { result } = await setup()

    expect(result.current.isActivated).toBe(true)
    expect(result.current.resumeScreen).toBeNull()
  })

  it('exposes a recoverable read failure and recovers on retry', async () => {
    userService.getOnboardingState.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = await setup()

    expect(result.current.journeyPhase).toBe(JOURNEY_PHASE.ERROR)
    expect(result.current.journeyError.recoverable).toBe(true)
    expect(result.current.isActivated).toBe(false)

    userService.getOnboardingState.mockResolvedValue(incompleteJourney())
    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.journeyPhase).toBe(JOURNEY_PHASE.READY)
    expect(result.current.journeyError).toBeNull()
  })

  it('does not read on mount when autoLoad is off', async () => {
    renderHook(() => useOnboardingJourney({ autoLoad: false }))
    expect(userService.getOnboardingState).not.toHaveBeenCalled()
  })
})

describe('recording a meaningful point', () => {
  it('confirms only what the server echoed back', async () => {
    const { result } = await setup()
    userService.recordOnboardingPoint.mockResolvedValue(
      incompleteJourney({ last_meaningful_point: 'first_deck', resume_screen: 'first_deck' })
    )

    await act(async () => {
      await result.current.recordPoint('first_deck')
    })

    expect(userService.recordOnboardingPoint).toHaveBeenCalledWith('first_deck')
    expect(result.current.resumeScreen).toBe('first_deck')
    expect(result.current.pointState.phase).toBe(ACTION_PHASE.SUCCEEDED)
    expect(result.current.pointState.unsavedPoint).toBeNull()
  })

  it('keeps the intended point as an unsaved draft when the save fails, without moving the confirmed state', async () => {
    const { result } = await setup()
    userService.recordOnboardingPoint.mockRejectedValue(httpError(503, 'unavailable'))

    await act(async () => {
      await result.current.recordPoint('first_deck')
    })

    expect(result.current.pointState.phase).toBe(ACTION_PHASE.ERROR)
    expect(result.current.pointState.unsavedPoint).toBe('first_deck')
    expect(result.current.pointState.error.recoverable).toBe(true)
    // The confirmed snapshot is untouched — a reload resumes where the server agreed.
    expect(result.current.resumeScreen).toBe('personalization')

    userService.recordOnboardingPoint.mockResolvedValue(incompleteJourney({ resume_screen: 'first_deck' }))
    await act(async () => {
      await result.current.retryRecordPoint()
    })

    expect(userService.recordOnboardingPoint).toHaveBeenLastCalledWith('first_deck')
    expect(result.current.pointState.phase).toBe(ACTION_PHASE.SUCCEEDED)
  })

  it('treats 409 onboarding_already_activated as done, re-reads, and reports no failure', async () => {
    const { result } = await setup()
    userService.recordOnboardingPoint.mockRejectedValue(httpError(409, 'onboarding_already_activated'))
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    let outcome
    await act(async () => {
      outcome = await result.current.recordPoint('first_deck')
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.alreadyActivated).toBe(true)
    expect(result.current.pointState.error).toBeNull()
    expect(result.current.isActivated).toBe(true)
  })
})

describe('postponing', () => {
  it('confirms the postponement from the server snapshot', async () => {
    const { result } = await setup()
    userService.postponeOnboarding.mockResolvedValue(incompleteJourney({ postponed_at: '2026-08-13T04:00:00Z', show_reentry: false }))

    await act(async () => {
      await result.current.postpone()
    })

    expect(result.current.postponeState.phase).toBe(ACTION_PHASE.SUCCEEDED)
    // show_reentry stays the server's answer — never derived from postponed_at here.
    expect(result.current.showReentry).toBe(false)
  })

  it('surfaces a postpone failure with a retry', async () => {
    const { result } = await setup()
    userService.postponeOnboarding.mockRejectedValue(httpError(500, { code: 'boom' }))

    await act(async () => {
      await result.current.postpone()
    })

    expect(result.current.postponeState.phase).toBe(ACTION_PHASE.ERROR)
    expect(result.current.postponeState.error.recoverable).toBe(true)
  })
})

describe('curated browse', () => {
  it('separates an uncovered topic (empty) from a failure (error)', async () => {
    const { result } = await setup()

    publicContentService.browseOfficialDecks.mockResolvedValue({ items: [], total: 0 })
    await act(async () => {
      await result.current.loadOfficialDecks('philosophy')
    })

    expect(result.current.browseState.phase).toBe(BROWSE_PHASE.EMPTY)
    expect(result.current.browseState.error).toBeNull()

    publicContentService.browseOfficialDecks.mockRejectedValue(new Error('Network Error'))
    await act(async () => {
      await result.current.loadOfficialDecks('science')
    })

    expect(result.current.browseState.phase).toBe(BROWSE_PHASE.ERROR)
    expect(result.current.browseState.error.recoverable).toBe(true)
  })

  it('retries the same topic that failed', async () => {
    const { result } = await setup()
    publicContentService.browseOfficialDecks.mockRejectedValue(new Error('Network Error'))
    await act(async () => {
      await result.current.loadOfficialDecks('science')
    })

    publicContentService.browseOfficialDecks.mockResolvedValue({ items: [{ _id: 'd1' }], total: 1 })
    await act(async () => {
      await result.current.retryOfficialDecks()
    })

    expect(publicContentService.browseOfficialDecks).toHaveBeenLastCalledWith({ category: 'science' })
    expect(result.current.browseState.phase).toBe(BROWSE_PHASE.READY)
    expect(result.current.browseState.items).toHaveLength(1)
  })

  it('never activates onboarding from a browse result', async () => {
    const { result } = await setup()
    publicContentService.browseOfficialDecks.mockResolvedValue({ items: [{ _id: 'd1' }], total: 1 })

    await act(async () => {
      await result.current.loadOfficialDecks('science')
    })

    expect(result.current.isActivated).toBe(false)
  })
})

describe('fork and activation', () => {
  const forkSuccess = {
    created: true,
    forkedDeck: { _id: 'private-deck' },
    onboarding: { status: 'activated', activated_at: '2026-08-13T03:00:00Z' }
  }

  it('activates only from the server onboarding block and re-reads the canonical snapshot', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockResolvedValue(forkSuccess)
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    let outcome
    await act(async () => {
      outcome = await result.current.forkOfficialDeck('deck-1')
    })

    expect(outcome).toMatchObject({ ok: true, activated: true, created: true })
    expect(result.current.isActivated).toBe(true)
    expect(result.current.resumeScreen).toBeNull()
    expect(result.current.forkState.phase).toBe(ACTION_PHASE.SUCCEEDED)
  })

  it('does not activate when a successful fork carried no onboarding block', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockResolvedValue({
      created: true,
      forkedDeck: { _id: 'private-deck' },
      onboarding: null
    })

    let outcome
    await act(async () => {
      outcome = await result.current.forkOfficialDeck('deck-1')
    })

    expect(outcome.activated).toBe(false)
    expect(result.current.isActivated).toBe(false)
  })

  it('treats a replay (created=false) as success and still learns it is activated', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockResolvedValue({ ...forkSuccess, created: false })
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    let outcome
    await act(async () => {
      outcome = await result.current.forkOfficialDeck('deck-1')
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.created).toBe(false)
    expect(result.current.isActivated).toBe(true)
    expect(result.current.forkState.error).toBeNull()
  })

  it('sends one stable idempotency key across every retry of the same chosen deck', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding
      .mockRejectedValueOnce(httpError(500, { code: 'activation_failed' }))
      .mockRejectedValueOnce(httpError(500, { code: 'activation_failed' }))
      .mockResolvedValue(forkSuccess)
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })
    await act(async () => {
      await result.current.retryFork()
    })
    await act(async () => {
      await result.current.retryFork()
    })

    const keys = publicContentService.forkDeckForOnboarding.mock.calls.map(([, key]) => key)
    expect(keys).toHaveLength(3)
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(result.current.isActivated).toBe(true)
  })

  it('gives a different chosen deck its own key', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockRejectedValue(httpError(500, { code: 'activation_failed' }))

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })
    await act(async () => {
      await result.current.forkOfficialDeck('deck-2')
    })

    const [[, firstKey], [, secondKey]] = publicContentService.forkDeckForOnboarding.mock.calls
    expect(firstKey).not.toBe(secondKey)
  })

  it('reuses the key of an interrupted action after a reload', async () => {
    const first = await setup()
    publicContentService.forkDeckForOnboarding.mockRejectedValue(httpError(500, { code: 'activation_failed' }))
    await act(async () => {
      await first.result.current.forkOfficialDeck('deck-1')
    })
    first.unmount()

    // Fresh mount, same tab — the user retries the action they already chose.
    const second = await setup()
    await act(async () => {
      await second.result.current.forkOfficialDeck('deck-1')
    })

    const [[, firstKey], [, secondKey]] = publicContentService.forkDeckForOnboarding.mock.calls
    expect(secondKey).toBe(firstKey)
  })

  it('surfaces activation_failed as recoverable and never as a fork failure', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockRejectedValue(httpError(500, { code: 'activation_failed' }))

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })

    expect(result.current.forkState.phase).toBe(ACTION_PHASE.ERROR)
    expect(result.current.forkState.error).toMatchObject({ code: 'activation_failed', recoverable: true })
    expect(result.current.isActivated).toBe(false)
  })

  it('waits out fork_in_progress and completes without a visible error', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding
      .mockRejectedValueOnce(httpError(409, { code: 'fork_in_progress' }))
      .mockResolvedValue(forkSuccess)
    userService.getOnboardingState.mockResolvedValue(activatedJourney())

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })

    expect(publicContentService.forkDeckForOnboarding).toHaveBeenCalledTimes(2)
    expect(result.current.forkState.phase).toBe(ACTION_PHASE.SUCCEEDED)
    expect(result.current.isActivated).toBe(true)
  })

  it('stops repeating fork_in_progress and reports it as recoverable', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockRejectedValue(httpError(409, { code: 'fork_in_progress' }))

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })

    expect(publicContentService.forkDeckForOnboarding).toHaveBeenCalledTimes(3)
    expect(result.current.forkState.error).toMatchObject({ code: 'fork_in_progress', recoverable: true })
  })

  it('marks source_not_official terminal — retrying cannot make a deck curated', async () => {
    const { result } = await setup()
    publicContentService.forkDeckForOnboarding.mockRejectedValue(httpError(409, { code: 'source_not_official' }))

    await act(async () => {
      await result.current.forkOfficialDeck('deck-1')
    })

    expect(publicContentService.forkDeckForOnboarding).toHaveBeenCalledTimes(1)
    expect(result.current.forkState.error).toMatchObject({ code: 'source_not_official', recoverable: false })
    expect(result.current.isActivated).toBe(false)
  })
})

describe('AI fallback', () => {
  it('runs only when a caller asks, and never activates', async () => {
    const { result } = await setup()
    cardsService.generateOnboardingFallback.mockResolvedValue([{ title: 'Cell' }])

    // Nothing has fired from mounting, loading, or an empty browse.
    publicContentService.browseOfficialDecks.mockResolvedValue({ items: [], total: 0 })
    await act(async () => {
      await result.current.loadOfficialDecks('philosophy')
    })
    expect(cardsService.generateOnboardingFallback).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.requestAiFallback('philosophy', 10)
    })

    expect(cardsService.generateOnboardingFallback).toHaveBeenCalledWith('philosophy', 10)
    expect(result.current.fallbackState.phase).toBe(ACTION_PHASE.SUCCEEDED)
    // FR-006 / FR-033: cards are not activation.
    expect(result.current.isActivated).toBe(false)
    expect(userService.recordOnboardingPoint).not.toHaveBeenCalled()
  })

  it('surfaces a generation failure without touching the journey', async () => {
    const { result } = await setup()
    cardsService.generateOnboardingFallback.mockRejectedValue(httpError(500, { code: 'generation_failed' }))

    await act(async () => {
      await result.current.requestAiFallback('philosophy')
    })

    expect(result.current.fallbackState.phase).toBe(ACTION_PHASE.ERROR)
    expect(result.current.journeyPhase).toBe(JOURNEY_PHASE.READY)
    expect(result.current.isActivated).toBe(false)
  })
})

describe('classifyError', () => {
  it('reads both FastAPI detail shapes', () => {
    expect(classifyError(httpError(400, 'invalid_action')).code).toBe('invalid_action')
    expect(classifyError(httpError(409, { code: 'source_not_official' })).code).toBe('source_not_official')
  })

  it('treats a response-less failure as recoverable', () => {
    expect(classifyError(new Error('Network Error'))).toMatchObject({
      code: 'network_error',
      recoverable: true
    })
  })

  it('does not invent recoverability for an unlisted 4xx', () => {
    expect(classifyError(httpError(400, 'cannot_fork_own_content')).recoverable).toBe(false)
  })
})
