/**
 * ONB-005 — the onboarding API adapters.
 *
 * These tests exist for one reason: the wire format is the contract. A journey
 * PATCH that omits `point`, a browse that drops `sort_by=curated`, or a fork
 * that forgets `{context: 'onboarding'}` all fail *silently* against a live
 * server — the request succeeds and simply never activates anyone. So every
 * assertion here is about the exact bytes sent, not about the happy path.
 */

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn()
  }
}))

// cards.service reaches for the real Firebase SDK at import time for its
// streaming path; the fallback adapter under test never touches it.
jest.mock('../../config/firebase.config', () => ({ auth: { currentUser: null } }))

const { apiClient } = require('../client')
const { userService } = require('./user.service')
const { publicContentService, OFFICIAL_DECK_PAGE_SIZE } = require('./publicContent.service')
const { cardsService } = require('./cards.service')

/** Query string of the last GET, parsed — order-independent assertions. */
const lastGetQuery = () => {
  const url = apiClient.get.mock.calls.at(-1)[0]
  return new URLSearchParams(url.split('?')[1] || '')
}

const JOURNEY_SNAPSHOT = {
  status: 'incomplete',
  last_meaningful_point: 'personalization',
  postponed_at: '2026-08-12T01:00:00Z',
  activated_at: null,
  updated_at: '2026-08-13T02:00:00Z',
  show_reentry: true,
  resume_screen: 'personalization'
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('journey adapters', () => {
  it('reads the journey from GET /users/onboarding and returns the server fields untouched', async () => {
    apiClient.get.mockResolvedValue({ data: JOURNEY_SNAPSHOT })

    const state = await userService.getOnboardingState()

    expect(apiClient.get).toHaveBeenCalledWith('/users/onboarding')
    // show_reentry and resume_screen are server-derived: passed through, never recomputed.
    expect(state).toEqual(JOURNEY_SNAPSHOT)
  })

  it('records a point as exactly one action with its point', async () => {
    apiClient.patch.mockResolvedValue({ data: JOURNEY_SNAPSHOT })

    await userService.recordOnboardingPoint('first_deck')

    expect(apiClient.patch).toHaveBeenCalledWith('/users/onboarding', {
      action: 'record_point',
      point: 'first_deck'
    })
  })

  it('postpones without a point — a postpone carrying one is a 400 invalid_action', async () => {
    apiClient.patch.mockResolvedValue({ data: JOURNEY_SNAPSHOT })

    await userService.postponeOnboarding()

    const [, body] = apiClient.patch.mock.calls.at(-1)
    expect(body).toEqual({ action: 'postpone' })
    expect(body).not.toHaveProperty('point')
  })
})

describe('curated browse adapter', () => {
  const emptyPage = { items: [], total: 0, page: 1, page_size: 3, total_pages: 0 }

  it('sends official=true with sort_by=curated and page/page_size, not skip/limit', async () => {
    apiClient.get.mockResolvedValue({ data: emptyPage })

    await publicContentService.browseOfficialDecks({ category: 'science' })

    const query = lastGetQuery()
    expect(apiClient.get.mock.calls.at(-1)[0]).toMatch(/^\/public\/decks\?/)
    expect(query.get('category')).toBe('science')
    expect(query.get('official')).toBe('true')
    expect(query.get('sort_by')).toBe('curated')
    expect(query.get('page')).toBe('1')
    expect(query.get('page_size')).toBe(String(OFFICIAL_DECK_PAGE_SIZE))
    expect(query.has('skip')).toBe(false)
    expect(query.has('limit')).toBe(false)
  })

  it('defaults to the three curated options First Deck shows', () => {
    expect(OFFICIAL_DECK_PAGE_SIZE).toBe(3)
  })

  it('returns an uncovered topic as a successful empty page, not an error', async () => {
    apiClient.get.mockResolvedValue({ data: emptyPage })

    await expect(publicContentService.browseOfficialDecks({ category: 'philosophy' })).resolves.toEqual(emptyPage)
  })

  it('omits category entirely when none is given rather than sending an empty one', async () => {
    apiClient.get.mockResolvedValue({ data: emptyPage })

    await publicContentService.browseOfficialDecks({})

    expect(lastGetQuery().has('category')).toBe(false)
  })
})

describe('onboarding fork adapter', () => {
  const forkResponse = {
    message: 'Deck forked successfully',
    created: true,
    forked_deck: { _id: 'private-deck-id', name: 'Foundations of Biology (Forked)' },
    onboarding: { status: 'activated', activated_at: '2026-08-13T03:00:00Z' }
  }

  it('sends the onboarding context and the idempotency key header', async () => {
    apiClient.post.mockResolvedValue({ data: forkResponse })

    await publicContentService.forkDeckForOnboarding('deck-id', 'a3f1c0de-0000-4000-8000-000000000001')

    expect(apiClient.post).toHaveBeenCalledWith(
      '/public/decks/deck-id/fork',
      { context: 'onboarding' },
      { headers: { 'Idempotency-Key': 'a3f1c0de-0000-4000-8000-000000000001' } }
    )
  })

  it('returns the deck and the activation state together', async () => {
    apiClient.post.mockResolvedValue({ data: forkResponse })

    const result = await publicContentService.forkDeckForOnboarding('deck-id', 'key-1')

    expect(result).toEqual({
      created: true,
      forkedDeck: forkResponse.forked_deck,
      onboarding: { status: 'activated', activated_at: '2026-08-13T03:00:00Z' }
    })
  })

  it('surfaces a replay as a success carrying activation, not as a duplicate', async () => {
    // The lost-response case: created=false, same deck, activation still reported.
    apiClient.post.mockResolvedValue({ data: { ...forkResponse, created: false } })

    const result = await publicContentService.forkDeckForOnboarding('deck-id', 'key-1')

    expect(result.created).toBe(false)
    expect(result.forkedDeck).toEqual(forkResponse.forked_deck)
    expect(result.onboarding.status).toBe('activated')
  })

  it('reports no activation when the server sent no onboarding block', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'ok', created: true, forked_deck: { _id: 'd' } } })

    const result = await publicContentService.forkDeckForOnboarding('deck-id', 'key-1')

    expect(result.onboarding).toBeNull()
  })

  it('leaves the ordinary library fork untouched — no context, no header', async () => {
    apiClient.post.mockResolvedValue({ data: forkResponse })

    await publicContentService.forkDeck('deck-id')

    expect(apiClient.post).toHaveBeenCalledWith('/public/decks/deck-id/fork')
  })
})

describe('AI fallback adapter', () => {
  it('posts to the unchanged generation endpoint and never touches a journey route', async () => {
    apiClient.post.mockResolvedValue({ data: [{ title: 'Cell' }] })

    const cards = await cardsService.generateOnboardingFallback('science', 5)

    expect(cards).toEqual([{ title: 'Cell' }])
    const [url, body] = apiClient.post.mock.calls.at(-1)
    expect(url).toBe('/card/generate')
    expect(body).toMatchObject({ sampleText: 'science', sampleNumber: 5 })

    // FR-006/FR-033: generating cards is not activation.
    expect(apiClient.patch).not.toHaveBeenCalled()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
})
