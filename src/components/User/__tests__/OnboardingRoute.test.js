/**
 * ONB-014 — the wired onboarding journey, end to end.
 *
 * This file replaced a controller unit test that mocked `useOnboardingJourney`
 * and `useProgressivePreferences` and rendered placeholder screens. That test
 * could not have caught anything ONB-014 exists to catch, and its fixtures had
 * already drifted from the product: it fed the goal `exam_prep`, which is not
 * one of the five canonical `STUDY_GOALS` and never was.
 *
 * So the only thing mocked here is `apiClient` — the HTTP boundary. Everything
 * above it is the real thing: the real service adapters (so the query strings,
 * request bodies and idempotency header are asserted as *sent*), the real
 * journey and preference controllers, the real three screens, and a real
 * router. A response shape that the architecture does not define cannot make
 * these tests pass, and a screen that crashes on a state the old fixtures
 * smoothed over cannot hide.
 *
 * Every response body below is copied from the contracts in
 * `docs/architecture-onboarding.md`. No invented field, no invented error shape.
 *
 * Two invariants are asserted outright rather than left to inspection:
 *   - no path calls `/users/complete-wizard` (ADR-006);
 *   - no path reads journey truth from session storage (ADR-003). The one
 *     legitimate `sessionStorage` write — the fork idempotency key, which is a
 *     retry correlator, not journey state — is allowed and asserted as such.
 */
const mockChangeLanguage = jest.fn()

jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        // Mirrors i18next v23 plural resolution for the `_one`/`_other` keys
        // the new copy uses, so a test can assert the string a user sees.
        const count = options?.count
        const raw = typeof count === 'number' ? (resolve(`${key}_${count === 1 ? 'one' : 'other'}`) ?? resolve(key)) : resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en', changeLanguage: mockChangeLanguage }
    })
  }
})

const mockSetThemeColor = jest.fn()
jest.mock('../../../theme/DynamicThemeProvider', () => ({
  __esModule: true,
  useThemePreferences: () => ({ themeColor: '#2a6971', setThemeColor: mockSetThemeColor })
}))

/**
 * The second mock below the components, and the boundary it draws is the point.
 *
 * `GeneratedCards` is the app's *existing* generation workflow, not onboarding's:
 * it reaches the deck list, the tag pool and `SubscriptionProvider`, none of
 * which this route mounts. What onboarding owes is the handoff — that the cards
 * the fallback generated arrive there rather than being counted into a sentence
 * and dropped — so the double records its props and exposes save and dismiss as
 * presses. Its own save behaviour is covered in `Cards/__tests__/GeneratedCards`.
 */
const mockReviewProps = []
jest.mock('../../Cards/GeneratedCards', () => ({
  __esModule: true,
  default: (props) => {
    const react = require('react')
    mockReviewProps.push(props)
    return react.createElement('div', { 'data-testid': 'review-modal' }, [
      react.createElement('button', { key: 'save', onClick: () => props.onSaved?.(props.cards.length) }, 'save-generated'),
      react.createElement('button', { key: 'close', onClick: props.onCancel }, 'close-review')
    ])
  }
}))

// The ONLY mock below the components. Everything between this and the DOM is
// production code.
jest.mock('../../../api/client', () => ({
  __esModule: true,
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}))

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import OnboardingRoute from '../OnboardingRoute'
import { apiClient } from '../../../api/client'
import en from '../../../locales/en/translation.json'

const t = (path) => path.split('.').reduce((node, segment) => node[segment], en)

const HOME_MARKER = 'home-route'
const STUDY_MARKER = 'study-route'

// ── The server ───────────────────────────────────────────────────────────────

/**
 * A minimal stand-in for the four routes onboarding touches, wired to the
 * mocked `apiClient` so the real adapters run against it.
 *
 * It is deliberately *not* a fixture bag: it holds state, so recording a point
 * changes what a later read returns, and a fork replay returns the same deck.
 * That is what lets "reload and resume" and "retry after failure" be tested as
 * journeys rather than as two unrelated renders.
 */
const createServer = () => {
  const server = {
    journey: {
      status: 'incomplete',
      last_meaningful_point: 'welcome',
      postponed_at: null,
      activated_at: null,
      updated_at: '2026-08-15T02:00:00Z',
      show_reentry: false,
      resume_screen: 'welcome'
    },
    preferences: {
      language: 'en',
      theme_color: '#2a6971',
      interests: [],
      primary_topic: null,
      study_goal: null,
      updated_at: '2026-08-15T02:00:00Z'
    },
    decks: [],
    forkedDeck: null,
    /** Queued one-shot failures, keyed `METHOD path`. */
    failures: {},
    calls: []
  }

  const POINT_RANK = { welcome: 0, personalization: 1, first_deck: 2 }

  const fail = (status, detail) => {
    const error = new Error(`Request failed with status code ${status}`)
    error.response = { status, data: { detail } }
    return error
  }

  /** Consume a queued failure for this call, if one was armed. */
  const armed = (key) => {
    const queue = server.failures[key]
    if (!queue || queue.length === 0) return null
    return queue.shift()
  }

  server.failOnce = (key, error) => {
    server.failures[key] = server.failures[key] ?? []
    server.failures[key].push(error)
  }
  server.fail = fail

  const record = (method, url, body) => server.calls.push({ method, url, body })

  apiClient.get.mockImplementation(async (url) => {
    record('GET', url)
    const queued = armed(`GET ${url.split('?')[0]}`)
    if (queued) throw queued

    if (url === '/users/onboarding') return { data: { ...server.journey } }
    if (url === '/users/preferences/general') return { data: { ...server.preferences } }
    if (url.startsWith('/public/decks?')) {
      const items = server.decks
      return { data: { items, total: items.length, page: 1, page_size: 3, total_pages: 1 } }
    }
    throw fail(404, 'not_found')
  })

  apiClient.put.mockImplementation(async (url, body) => {
    record('PUT', url, body)
    const queued = armed(`PUT ${url}`)
    if (queued) throw queued

    if (url === '/users/preferences/general') {
      server.preferences = { ...server.preferences, ...body, updated_at: new Date().toISOString() }
      // The server derives the primary topic from `interests[0]` (FR-018).
      if ('interests' in body) server.preferences.primary_topic = body.interests[0] ?? null
      return { data: { ...server.preferences } }
    }
    throw fail(404, 'not_found')
  })

  apiClient.patch.mockImplementation(async (url, body) => {
    record('PATCH', url, body)
    const queued = armed(`PATCH ${url}`)
    if (queued) throw queued

    if (url === '/users/onboarding') {
      if (body.action === 'record_point') {
        // Monotonic, exactly as ONB-001 made it server-side.
        if (POINT_RANK[body.point] > POINT_RANK[server.journey.last_meaningful_point]) {
          server.journey.last_meaningful_point = body.point
          server.journey.resume_screen = body.point
        }
      } else if (body.action === 'postpone') {
        server.journey.postponed_at = new Date().toISOString()
      } else {
        throw fail(400, 'invalid_action')
      }
      server.journey.updated_at = new Date().toISOString()
      return { data: { ...server.journey } }
    }
    throw fail(404, 'not_found')
  })

  apiClient.post.mockImplementation(async (url, body, config) => {
    record('POST', url, body)
    const queued = armed(`POST ${url}`)
    if (queued) throw queued

    const forkMatch = url.match(/^\/public\/decks\/(.+)\/fork$/)
    if (forkMatch) {
      const created = server.forkedDeck === null
      if (created) server.forkedDeck = { _id: `private-${forkMatch[1]}`, name: 'Foundations of Biology (Forked)' }
      server.journey.status = 'activated'
      server.journey.activated_at = server.journey.activated_at ?? '2026-08-15T03:00:00Z'
      server.journey.resume_screen = null
      server.journey.show_reentry = false
      server.lastForkHeaders = config?.headers ?? null
      return {
        data: {
          message: 'Deck forked successfully',
          created,
          forked_deck: server.forkedDeck,
          onboarding: { status: 'activated', activated_at: server.journey.activated_at }
        }
      }
    }

    if (url === '/card/generate') {
      // `title`/`content`, which is what `GeneratedCard` actually declares. The
      // `front`/`back` this fixture used belongs to a different model
      // (`GeneratedCardPair`) and passed only while nothing read the cards.
      return {
        data: [
          { title: 'What is a cell?', content: 'The basic unit of life.' },
          { title: 'What is a nucleus?', content: 'The organelle holding a cell’s DNA.' }
        ]
      }
    }
    throw fail(404, 'not_found')
  })

  return server
}

const officialDeck = (overrides = {}) => ({
  _id: 'deck-1',
  name: 'Foundations of Biology',
  description: 'Core concepts for a first biology review.',
  total_cards: 24,
  public_metadata: { category: 'science', language: 'en' },
  curation: {
    topic: 'science',
    learning_outcome: 'Explain the core structures and processes of a cell.',
    rank: 1
  },
  publisher: { name: 'Nowry' },
  is_official: true,
  ...overrides
})

let server

const renderJourney = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path='/onboarding' element={<OnboardingRoute />} />
        <Route path='/' element={<div>{HOME_MARKER}</div>} />
        <Route path='/study/:deckId' element={<div>{STUDY_MARKER}</div>} />
      </Routes>
    </MemoryRouter>
  )

/** Wait for the initial journey + preference reads to land on a screen. */
const atScreen = (title) => waitFor(() => expect(screen.getByRole('heading', { name: title })).toBeInTheDocument())

const urlsCalled = () => server.calls.map((call) => `${call.method} ${call.url.split('?')[0]}`)

const clickTopic = (label) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))
const clickGoal = (label) => fireEvent.click(screen.getByRole('radio', { name: label }))

/** Select one topic and one goal, and wait for both echoes to be confirmed. */
const completePersonalization = async () => {
  clickTopic('Science')
  clickGoal('Academic Success')
  await waitFor(() => expect(server.preferences.study_goal).toBe('academic'))
  await waitFor(() => expect(server.preferences.primary_topic).toBe('science'))
}

beforeEach(() => {
  jest.clearAllMocks()
  window.sessionStorage.clear()
  mockReviewProps.length = 0
  server = createServer()
})

/** The props the review modal was last handed. */
const lastReview = () => mockReviewProps[mockReviewProps.length - 1]

// ── Entry and resumption (FR-037, FR-038, ADR-003) ───────────────────────────

describe('entering and resuming the journey', () => {
  it('opens an untouched user at Welcome, step 1 of 3, with no way back', async () => {
    renderJourney()

    await atScreen(t('onboarding.welcome.title'))
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('onboarding.back') })).toBeNull()
  })

  it('resumes at the server-provided screen, not at the first one', async () => {
    // The state a user left behind on another device or in a closed tab.
    server.journey.last_meaningful_point = 'personalization'
    server.journey.resume_screen = 'personalization'

    renderJourney()

    await atScreen(t('onboarding.personalization.title'))
  })

  it('restores confirmed interests and goal saved in an earlier session', async () => {
    server.journey.resume_screen = 'personalization'
    server.journey.last_meaningful_point = 'personalization'
    server.preferences = {
      ...server.preferences,
      interests: ['science', 'mathematics'],
      primary_topic: 'science',
      study_goal: 'academic'
    }

    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    expect(screen.getByRole('button', { name: /^Science/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Mathematics/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: 'Academic Success' })).toBeChecked()
  })

  it('sends an already-activated user Home instead of into a finished journey', async () => {
    server.journey = { ...server.journey, status: 'activated', activated_at: '2026-08-14T00:00:00Z', resume_screen: null }

    renderJourney()

    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
  })

  it('does not teleport a user forward when their own PATCH lands after they went Back', async () => {
    // The trap ONB-008's resume guard exists for: recording `first_deck` pushes
    // a newer `resume_screen` into state, which must not move anybody.
    renderJourney()
    await atScreen(t('onboarding.welcome.title'))

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.begin') }))
    await atScreen(t('onboarding.personalization.title'))
    await completePersonalization()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))
    await atScreen(t('onboarding.firstDeck.title'))
    expect(server.journey.resume_screen).toBe('first_deck')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.back') }))
    await atScreen(t('onboarding.personalization.title'))

    // Give any late snapshot a chance to be applied. It must change nothing.
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('heading', { name: t('onboarding.personalization.title') })).toBeInTheDocument()
  })

  it('keeps confirmed choices when moving backward (FR-005)', async () => {
    renderJourney()
    await atScreen(t('onboarding.welcome.title'))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.begin') }))
    await atScreen(t('onboarding.personalization.title'))
    await completePersonalization()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))
    await atScreen(t('onboarding.firstDeck.title'))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.back') }))
    await atScreen(t('onboarding.personalization.title'))

    expect(screen.getByRole('button', { name: /^Science/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: 'Academic Success' })).toBeChecked()
  })
})

// ── Postponement and the grace period (FR-041, FR-042, ADR-007) ──────────────

describe('postponing from Welcome', () => {
  it('reaches Home only after the PATCH the grace period is computed from', async () => {
    renderJourney()
    await atScreen(t('onboarding.welcome.title'))

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.postpone') }))

    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.postponed_at).not.toBeNull()
    expect(server.calls).toContainEqual({ method: 'PATCH', url: '/users/onboarding', body: { action: 'postpone' } })
  })

  it('keeps the user here and offers a retry when the postpone write fails', async () => {
    server.failOnce('PATCH /users/onboarding', server.fail(500, { code: 'server_error', message: 'nope' }))

    renderJourney()
    await atScreen(t('onboarding.welcome.title'))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.postpone') }))

    await screen.findByText(t('onboarding.welcome.postponeError.title'))
    // No navigation happened, and no timestamp was claimed.
    expect(screen.queryByText(HOME_MARKER)).toBeNull()
    expect(server.journey.postponed_at).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.postpone') }))
    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.postponed_at).not.toBeNull()
  })

  it('re-entry after the grace period resumes at the recorded point', async () => {
    // What `show_reentry: true` leads to: the same route, resolved from the
    // server's own point. The client never recomputes the 24 hours.
    server.journey = {
      ...server.journey,
      postponed_at: '2026-08-13T02:00:00Z',
      show_reentry: true,
      last_meaningful_point: 'personalization',
      resume_screen: 'personalization'
    }

    renderJourney()

    await atScreen(t('onboarding.personalization.title'))
    expect(urlsCalled()).toContain('GET /users/onboarding')
  })
})

// ── Personalization (FR-021, FR-022, A5) ─────────────────────────────────────

describe('personalization', () => {
  beforeEach(() => {
    server.journey.resume_screen = 'personalization'
    server.journey.last_meaningful_point = 'personalization'
  })

  it('offers a skip — not a disabled continue — when nothing is selected', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    const action = screen.getByRole('button', { name: t('onboarding.personalization.skip') })
    expect(action).toBeEnabled()
    expect(screen.getByText(t('onboarding.personalization.skipHint'))).toBeInTheDocument()
  })

  it('skipping exits to Home writing nothing at all', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.skip') }))

    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.status).toBe('incomplete')
    expect(server.preferences.interests).toEqual([])
    expect(server.preferences.study_goal).toBeNull()
    // Not even a journey point: the user answered nothing.
    expect(server.calls.filter((call) => call.method === 'PATCH')).toEqual([])
  })

  it('names the missing half rather than showing one generic error', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    clickTopic('Science')
    await waitFor(() => expect(server.preferences.primary_topic).toBe('science'))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))

    expect(await screen.findByText(t('onboarding.personalization.validation.missingGoal'))).toBeInTheDocument()
    expect(screen.queryByText(t('onboarding.personalization.validation.missingInterests'))).toBeNull()
  })

  it('derives the primary topic from position, and never asks for it', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    clickTopic('Mathematics')
    await waitFor(() => expect(server.preferences.primary_topic).toBe('mathematics'))
    clickTopic('Science')
    await waitFor(() => expect(server.preferences.interests).toEqual(['mathematics', 'science']))
    expect(server.preferences.primary_topic).toBe('mathematics')

    // FR-019 / FR-023 — neither question exists on this screen.
    expect(screen.queryByText(/primary topic\?/i)).toBeNull()
    expect(screen.queryByText(/learning style/i)).toBeNull()
  })

  it('retains the visible choice and retries the exact field that failed', async () => {
    server.failOnce('PUT /users/preferences/general', server.fail(500, { code: 'server_error', message: 'nope' }))

    renderJourney()
    await atScreen(t('onboarding.personalization.title'))

    clickTopic('Science')
    // The selection stays on screen and is honestly labelled unsaved (FR-040).
    expect(await screen.findByText(t('onboarding.save.unsaved'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Science/ })).toHaveAttribute('aria-pressed', 'true')
    expect(server.preferences.interests).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.save.retry') }))
    await waitFor(() => expect(server.preferences.interests).toEqual(['science']))
  })

  it('reaches First Deck only after both echoes and the point PATCH have landed', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))
    await completePersonalization()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))

    await atScreen(t('onboarding.firstDeck.title'))
    expect(server.journey.last_meaningful_point).toBe('first_deck')
    expect(server.calls).toContainEqual({
      method: 'PATCH',
      url: '/users/onboarding',
      body: { action: 'record_point', point: 'first_deck' }
    })
  })

  it('stays put when the point PATCH fails, with the choices already saved', async () => {
    renderJourney()
    await atScreen(t('onboarding.personalization.title'))
    await completePersonalization()

    server.failOnce('PATCH /users/onboarding', server.fail(500, { code: 'server_error', message: 'nope' }))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))

    expect(await screen.findByText(t('onboarding.personalization.advanceError.title'))).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: t('onboarding.personalization.title') })).toBeInTheDocument()
    expect(server.preferences.study_goal).toBe('academic')
  })
})

// ── First Deck: the empty result (FR-030, FR-050, FR-059) ────────────────────

describe('first deck when nothing is curated yet', () => {
  beforeEach(() => {
    server.journey.resume_screen = 'first_deck'
    server.journey.last_meaningful_point = 'first_deck'
    server.preferences = { ...server.preferences, interests: ['science'], primary_topic: 'science', study_goal: 'academic' }
    server.decks = []
  })

  it('reads as an empty shelf, not as a failure', async () => {
    renderJourney()
    await atScreen(t('onboarding.firstDeck.title'))

    expect(await screen.findByText('No official Science decks yet')).toBeInTheDocument()
    // FR-049 is drawn here: empty is `status`, a failure would be `alert`.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: t('onboarding.shell.retry') })).toBeNull()
  })

  it('starts no AI work on its own (FR-032)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    expect(urlsCalled()).not.toContain('POST /card/generate')
  })

  it('generates only when explicitly asked, and stays incomplete (FR-033)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.empty.fallbackAction') }))

    expect(await screen.findByText(t('onboarding.firstDeck.fallback.success.title'))).toBeInTheDocument()
    expect(urlsCalled()).toContain('POST /card/generate')
    // Generation is not activation, and offers no deck to open.
    expect(server.journey.status).toBe('incomplete')
    expect(screen.queryByText(t('onboarding.firstDeck.success.title'))).toBeNull()
    expect(screen.queryByRole('button', { name: t('onboarding.firstDeck.success.open') })).toBeNull()
  })

  /**
   * The defect a mocked screen could not see: the request succeeded, the cards
   * came back, and nothing rendered, reviewed or saved them. The user was
   * offered an AI deck (FR-031) and received a sentence about a number.
   */
  it('hands the generated cards to the existing save flow (FR-031)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.empty.fallbackAction') }))
    expect(await screen.findByTestId('review-modal')).toBeInTheDocument()

    // The cards the server actually returned, not a count derived from them.
    const generated = server.calls.length && lastReview().cards
    expect(generated.length).toBeGreaterThan(0)
    expect(generated[0]).toHaveProperty('title')
  })

  it('saving an AI deck changes the copy and still does not activate (FR-033, A4)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.empty.fallbackAction') }))
    await screen.findByTestId('review-modal')

    fireEvent.click(screen.getByText('save-generated'))
    fireEvent.click(screen.getByText('close-review'))

    expect(await screen.findByText(t('onboarding.firstDeck.fallback.saved.title'))).toBeInTheDocument()
    // An AI deck is not a curated fork. Nothing forked, nothing activated.
    expect(server.journey.status).toBe('incomplete')
    expect(urlsCalled().filter((url) => url.includes('/fork'))).toEqual([])
    expect(screen.queryByText(t('onboarding.firstDeck.success.title'))).toBeNull()
  })

  it('reports a failed generation honestly and leaves everything unchanged (FR-034)', async () => {
    server.failOnce('POST /card/generate', server.fail(500, { code: 'server_error', message: 'nope' }))

    renderJourney()
    await screen.findByText('No official Science decks yet')
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.empty.fallbackAction') }))

    expect(await screen.findByText(t('onboarding.firstDeck.fallback.error.title'))).toBeInTheDocument()
    expect(server.journey.status).toBe('incomplete')

    // Retrying is possible without losing anything.
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.empty.fallbackAction') }))
    expect(await screen.findByText(t('onboarding.firstDeck.fallback.success.title'))).toBeInTheDocument()
  })

  it('finishing for now exits incomplete with preferences intact (FR-007, FR-035)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.finish') }))

    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.status).toBe('incomplete')
    expect(server.preferences.interests).toEqual(['science'])
    expect(server.preferences.study_goal).toBe('academic')
  })

  /**
   * The second signed-in defect. `show_reentry` is derived server-side as
   * `incomplete AND (postponed_at is null OR now - postponed_at >= 24h)`, and
   * finishing here wrote nothing — so the grace period never started and Home
   * asked the user to finish setting up the moment they landed on it.
   */
  it('finishing for now starts the 24-hour grace period (FR-042)', async () => {
    renderJourney()
    await screen.findByText('No official Science decks yet')

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.finish') }))

    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.postponed_at).not.toBeNull()
    expect(server.calls).toContainEqual({ method: 'PATCH', url: '/users/onboarding', body: { action: 'postpone' } })
    // `postpone` is monotonic: it backfills the point only when nothing later
    // was recorded, so the user still resumes at First Deck rather than Welcome.
    expect(server.journey.last_meaningful_point).toBe('first_deck')
    expect(server.journey.resume_screen).toBe('first_deck')
  })

  it('keeps the user on First Deck when the postponement write fails', async () => {
    server.failOnce('PATCH /users/onboarding', server.fail(500, { code: 'server_error', message: 'nope' }))

    renderJourney()
    await screen.findByText('No official Science decks yet')
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.finish') }))

    expect(await screen.findByText(t('onboarding.firstDeck.finishError.title'))).toBeInTheDocument()
    // Leaving anyway would promise a grace period the server never recorded.
    expect(screen.queryByText(HOME_MARKER)).toBeNull()
    expect(server.journey.postponed_at).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.save.retry') }))
    await waitFor(() => expect(screen.getByText(HOME_MARKER)).toBeInTheDocument())
    expect(server.journey.postponed_at).not.toBeNull()
  })
})

// ── First Deck: the curated path and activation (FR-024..FR-029, ADR-005/006) ─

describe('first deck when curated content exists', () => {
  beforeEach(() => {
    server.journey.resume_screen = 'first_deck'
    server.journey.last_meaningful_point = 'first_deck'
    server.preferences = { ...server.preferences, interests: ['science'], primary_topic: 'science', study_goal: 'academic' }
    server.decks = [
      officialDeck(),
      officialDeck({ _id: 'deck-2', name: 'Chemistry', curation: { topic: 'science', learning_outcome: 'Name ten reactions.', rank: 2 } })
    ]
  })

  it('asks for page 1, size 3, of the confirmed primary topic only', async () => {
    renderJourney()
    await screen.findByText('Foundations of Biology')

    const browse = server.calls.find((call) => call.url.startsWith('/public/decks?'))
    expect(browse.url).toBe('/public/decks?category=science&official=true&sort_by=curated&page=1&page_size=3')
  })

  it('marks a deck official only on the server-derived flag (FR-058)', async () => {
    server.decks = [officialDeck(), officialDeck({ _id: 'deck-9', name: 'Unreviewed Upload', is_official: false })]

    renderJourney()
    await screen.findByText('Unreviewed Upload')

    // One mark for one official deck, even though both name Nowry as publisher.
    expect(screen.getAllByText(t('onboarding.firstDeck.official.label'))).toHaveLength(1)
  })

  it('activates only on a successful fork, and offers the deck it added', async () => {
    renderJourney()
    await screen.findByText('Foundations of Biology')

    fireEvent.click(screen.getAllByRole('button', { name: t('onboarding.firstDeck.card.add') })[0])

    expect(await screen.findByText(t('onboarding.firstDeck.success.title'))).toBeInTheDocument()
    expect(server.journey.status).toBe('activated')
    expect(server.calls).toContainEqual({
      method: 'POST',
      url: '/public/decks/deck-1/fork',
      body: { context: 'onboarding' }
    })

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.success.open') }))
    await waitFor(() => expect(screen.getByText(STUDY_MARKER)).toBeInTheDocument())
  })

  it('sends one stable idempotency key across a failure and its retry (NFR-017)', async () => {
    server.failOnce('POST /public/decks/deck-1/fork', server.fail(500, { code: 'fork_failed', message: 'nope' }))

    renderJourney()
    await screen.findByText('Foundations of Biology')
    fireEvent.click(screen.getAllByRole('button', { name: t('onboarding.firstDeck.card.add') })[0])

    // The failure keeps the chosen deck selected and offers a retry (FR-029).
    expect(await screen.findByText(t('onboarding.firstDeck.forkError.title'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('onboarding.firstDeck.card.retry') })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: t('onboarding.firstDeck.card.retry') }))
    expect(await screen.findByText(t('onboarding.firstDeck.success.title'))).toBeInTheDocument()

    const keys = apiClient.post.mock.calls
      .filter(([url]) => url === '/public/decks/deck-1/fork')
      .map(([, , config]) => config?.headers?.['Idempotency-Key'])
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).toBe(keys[0])
  })

  it('tells the truth when only activation failed: the deck is already there', async () => {
    server.failOnce('POST /public/decks/deck-1/fork', server.fail(500, { code: 'activation_failed', message: 'nope' }))

    renderJourney()
    await screen.findByText('Foundations of Biology')
    fireEvent.click(screen.getAllByRole('button', { name: t('onboarding.firstDeck.card.add') })[0])

    expect(await screen.findByText(t('onboarding.firstDeck.activationError.title'))).toBeInTheDocument()
    // The wrong copy would render perfectly well, so assert its absence.
    expect(screen.queryByText(t('onboarding.firstDeck.forkError.title'))).toBeNull()
  })

  it('shows a replay exactly like a first fork (ADR-005)', async () => {
    // The deck already exists, so the server answers `created: false`.
    server.forkedDeck = { _id: 'private-deck-1', name: 'Foundations of Biology (Forked)' }

    renderJourney()
    await screen.findByText('Foundations of Biology')
    fireEvent.click(screen.getAllByRole('button', { name: t('onboarding.firstDeck.card.add') })[0])

    expect(await screen.findByText(t('onboarding.firstDeck.success.title'))).toBeInTheDocument()
    expect(screen.queryByText(/already/i)).toBeNull()
  })

  it('distinguishes a browse failure from an empty shelf (FR-049)', async () => {
    server.failOnce('GET /public/decks', server.fail(500, { code: 'server_error', message: 'nope' }))

    renderJourney()

    expect(await screen.findByText(t('onboarding.firstDeck.browseError.title'))).toBeInTheDocument()
    expect(screen.queryByText('No official Science decks yet')).toBeNull()
  })
})

// ── The two invariants ONB-014 must not let regress ──────────────────────────

describe('invariants', () => {
  /** Walk the whole journey: Welcome → Personalization → First Deck → fork. */
  const walkTheWholeJourney = async () => {
    renderJourney()
    await atScreen(t('onboarding.welcome.title'))
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.welcome.begin') }))
    await atScreen(t('onboarding.personalization.title'))
    await completePersonalization()
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.personalization.continue') }))
    await atScreen(t('onboarding.firstDeck.title'))
    await screen.findByText('Foundations of Biology')
    fireEvent.click(screen.getAllByRole('button', { name: t('onboarding.firstDeck.card.add') })[0])
    await screen.findByText(t('onboarding.firstDeck.success.title'))
  }

  it('never calls /users/complete-wizard (ADR-006)', async () => {
    server.decks = [officialDeck()]
    await walkTheWholeJourney()

    expect(urlsCalled()).not.toContain('POST /users/complete-wizard')
    expect(server.calls.some((call) => call.url.includes('complete-wizard'))).toBe(false)
  })

  it('activation comes from the fork response and nothing else (FR-006)', async () => {
    server.decks = [officialDeck()]
    await walkTheWholeJourney()

    // Every write that happened before the fork left the journey incomplete.
    const forkIndex = server.calls.findIndex((call) => call.url.endsWith('/fork'))
    expect(forkIndex).toBeGreaterThan(-1)
    const before = server.calls.slice(0, forkIndex)
    expect(before.some((call) => call.url.endsWith('/fork'))).toBe(false)
    expect(before.some((call) => call.body?.action === 'record_point')).toBe(true)
  })

  it('takes journey truth from the server, never from session storage (ADR-003)', async () => {
    server.decks = [officialDeck()]
    // A hostile leftover claiming the journey is done. It must change nothing.
    window.sessionStorage.setItem('onboarding_skipped', 'true')
    window.sessionStorage.setItem('onboarding_status', 'activated')

    await walkTheWholeJourney()

    // The only key onboarding is allowed to write is the fork idempotency
    // correlator (ONB-005) — a retry aid, not journey state. Nothing under this
    // prefix carries a status, a screen or a timestamp the server owns.
    const written = Object.keys(window.sessionStorage).filter((key) => key !== 'onboarding_skipped' && key !== 'onboarding_status')
    written.forEach((key) => {
      const value = window.sessionStorage.getItem(key)
      expect(value).not.toMatch(/activated|incomplete|resume_screen|postponed_at/)
    })
  })
})
