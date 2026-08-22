/**
 * ONB-006 — useProgressivePreferences.
 *
 * The interesting cases are the ones a plausible controller gets wrong: firing a
 * request per keystroke, letting a slow response for one field revert a newer
 * confirmed value for another, clearing the user's selection when the save
 * fails, or reporting a value as saved before the server said so. Each is a test
 * below.
 */
import { act, renderHook, waitFor } from '@testing-library/react'

jest.mock('../api/services/user.service', () => ({
  userService: {
    getGeneralPreferences: jest.fn(),
    updateGeneralPreferences: jest.fn()
  }
}))

// Pulled in transitively by the shared error classifier; never called here.
jest.mock('../api/services/publicContent.service', () => ({
  publicContentService: { browseOfficialDecks: jest.fn(), forkDeckForOnboarding: jest.fn() }
}))
jest.mock('../api/services/cards.service', () => ({
  cardsService: { generateOnboardingFallback: jest.fn() }
}))

const { userService } = require('../api/services/user.service')

const useProgressivePreferences = require('./useProgressivePreferences').default
const { ACTION_PHASE, PREFERENCE_FIELD, PREFERENCES_PHASE, VALIDATION_ERROR_CODE } = require('./useProgressivePreferences')

const preferences = (overrides = {}) => ({
  language: 'en',
  theme_color: '#2a6971',
  primary_topic: null,
  interests: [],
  study_goal: null,
  updated_at: '2026-08-13T02:00:00Z',
  ...overrides
})

const httpError = (status, detail) => {
  const error = new Error(`Request failed with status code ${status}`)
  error.response = { status, data: { detail } }
  return error
}

const networkError = () => new Error('Network Error')

/** A promise whose settlement the test controls, for interleaving responses. */
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })
  return { promise, resolve, reject }
}

/** Let queued microtasks (the drain loop's continuations) run. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const setup = async (options = {}) => {
  let view
  await act(async () => {
    view = renderHook(() => useProgressivePreferences(options))
  })
  await waitFor(() => expect(view.result.current.phase).not.toBe(PREFERENCES_PHASE.LOADING))
  return view
}

beforeEach(() => {
  jest.clearAllMocks()
  userService.getGeneralPreferences.mockResolvedValue(preferences())
})

describe('confirmed read', () => {
  it('restores only server-confirmed values', async () => {
    userService.getGeneralPreferences.mockResolvedValue(
      preferences({ language: 'es', interests: ['science', 'history'], primary_topic: 'science', study_goal: 'academic' })
    )

    const { result } = await setup()

    expect(result.current.phase).toBe(PREFERENCES_PHASE.READY)
    expect(result.current.confirmed.language).toBe('es')
    expect(result.current.confirmed.interests).toEqual(['science', 'history'])
    expect(result.current.values.study_goal).toBe('academic')
    expect(result.current.unsavedFields).toEqual([])
    expect(result.current.hasUnsavedChanges).toBe(false)
  })

  it('exposes a failed read as a retryable error without inventing values', async () => {
    userService.getGeneralPreferences.mockRejectedValueOnce(networkError())

    const { result } = await setup()

    expect(result.current.phase).toBe(PREFERENCES_PHASE.ERROR)
    expect(result.current.loadError.recoverable).toBe(true)
    expect(result.current.confirmed.language).toBeNull()

    userService.getGeneralPreferences.mockResolvedValue(preferences({ language: 'fr' }))
    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.phase).toBe(PREFERENCES_PHASE.READY)
    expect(result.current.confirmed.language).toBe('fr')
  })
})

describe('independent partial updates', () => {
  it('sends exactly one field per request', async () => {
    userService.updateGeneralPreferences.mockImplementation(async (body) => preferences(body))

    const { result } = await setup()

    await act(async () => {
      result.current.setLanguage('ja')
    })
    await act(async () => {
      result.current.setAccentColor('#8b5cf6')
    })
    await act(async () => {
      result.current.setStudyGoal('career')
    })

    expect(userService.updateGeneralPreferences).toHaveBeenNthCalledWith(1, { language: 'ja' })
    expect(userService.updateGeneralPreferences).toHaveBeenNthCalledWith(2, { theme_color: '#8b5cf6' })
    expect(userService.updateGeneralPreferences).toHaveBeenNthCalledWith(3, { study_goal: 'career' })
  })

  it('adopts the derived primary topic from the interests echo instead of computing it', async () => {
    userService.updateGeneralPreferences.mockResolvedValue(
      preferences({ interests: ['mathematics', 'science'], primary_topic: 'mathematics' })
    )

    const { result } = await setup()

    await act(async () => {
      result.current.setInterests(['mathematics', 'science'])
    })
    await waitFor(() => expect(result.current.fields.interests.isConfirmed).toBe(true))

    expect(userService.updateGeneralPreferences).toHaveBeenCalledWith({ interests: ['mathematics', 'science'] })
    expect(result.current.confirmedPrimaryTopic).toBe('mathematics')
  })

  it('does not re-send a value the server already holds', async () => {
    userService.getGeneralPreferences.mockResolvedValue(preferences({ language: 'de' }))

    const { result } = await setup()

    await act(async () => {
      result.current.setLanguage('de')
    })

    expect(userService.updateGeneralPreferences).not.toHaveBeenCalled()
  })
})

describe('serialization and coalescing', () => {
  it('keeps one request per field in flight and collapses the changes behind it', async () => {
    const first = deferred()
    userService.updateGeneralPreferences
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(preferences({ interests: ['science', 'history', 'mathematics'], primary_topic: 'science' }))

    const { result } = await setup()

    await act(async () => {
      result.current.setInterests(['science'])
    })
    act(() => {
      result.current.setInterests(['science', 'history'])
      result.current.setInterests(['science', 'history', 'mathematics'])
    })

    // Two intermediate selections, still one request.
    expect(userService.updateGeneralPreferences).toHaveBeenCalledTimes(1)
    expect(result.current.values.interests).toEqual(['science', 'history', 'mathematics'])
    expect(result.current.fields.interests.isConfirmed).toBe(false)

    await act(async () => {
      first.resolve(preferences({ interests: ['science'], primary_topic: 'science' }))
      await first.promise
    })
    await waitFor(() => expect(userService.updateGeneralPreferences).toHaveBeenCalledTimes(2))

    // The middle value was never sent; the last one the user chose was.
    expect(userService.updateGeneralPreferences).toHaveBeenNthCalledWith(2, {
      interests: ['science', 'history', 'mathematics']
    })
    await waitFor(() => expect(result.current.fields.interests.isConfirmed).toBe(true))
    expect(result.current.confirmed.interests).toEqual(['science', 'history', 'mathematics'])
  })

  it('does not let a slow field block another field', async () => {
    const slowInterests = deferred()
    userService.updateGeneralPreferences.mockImplementation(async (body) => {
      if ('interests' in body) return slowInterests.promise
      return preferences(body)
    })

    const { result } = await setup()

    act(() => {
      result.current.setInterests(['science'])
    })
    await act(async () => {
      result.current.setAccentColor('#8b5cf6')
    })

    // The accent write completed while interests is still outstanding.
    await waitFor(() => expect(result.current.confirmed.theme_color).toBe('#8b5cf6'))
    expect(result.current.fields.interests.isSaving).toBe(true)
    expect(result.current.fields.theme_color.isConfirmed).toBe(true)

    await act(async () => {
      slowInterests.resolve(preferences({ interests: ['science'], primary_topic: 'science' }))
      await slowInterests.promise
    })
  })

  it('discards a stale echo that would overwrite a newer confirmed value', async () => {
    const slowInterests = deferred()
    userService.updateGeneralPreferences.mockImplementation(async (body) => {
      if ('interests' in body) return slowInterests.promise
      return preferences({ ...body, interests: [] })
    })

    const { result } = await setup()

    act(() => {
      result.current.setInterests(['science'])
    })
    await act(async () => {
      result.current.setLanguage('ja')
    })

    await waitFor(() => expect(result.current.confirmed.language).toBe('ja'))

    // The interests response was issued *before* the language write and echoes
    // the whole document, so it still carries the pre-change language.
    await act(async () => {
      slowInterests.resolve(preferences({ language: 'en', interests: ['science'], primary_topic: 'science' }))
      await slowInterests.promise
    })
    await flush()

    // Owned key applied, stale companion key rejected.
    expect(result.current.confirmed.interests).toEqual(['science'])
    expect(result.current.confirmed.language).toBe('ja')
    expect(result.current.values.language).toBe('ja')
  })

  it('leaves the confirmed value alone when a later change is still queued', async () => {
    const first = deferred()
    const second = deferred()
    userService.updateGeneralPreferences.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = await setup()

    await act(async () => {
      result.current.setStudyGoal('academic')
    })
    act(() => {
      result.current.setStudyGoal('career')
    })

    await act(async () => {
      first.resolve(preferences({ study_goal: 'academic' }))
      await first.promise
    })
    await flush()

    // 'academic' is genuinely confirmed, but the visible value is the newer
    // choice and must still read as unsaved until its own response lands.
    expect(result.current.confirmed.study_goal).toBe('academic')
    expect(result.current.values.study_goal).toBe('career')
    expect(result.current.fields.study_goal.isConfirmed).toBe(false)

    await act(async () => {
      second.resolve(preferences({ study_goal: 'career' }))
      await second.promise
    })
    await waitFor(() => expect(result.current.confirmed.study_goal).toBe('career'))
    expect(result.current.fields.study_goal.isConfirmed).toBe(true)
  })
})

describe('failure', () => {
  it('retains the draft, names the field, and never claims persistence', async () => {
    userService.updateGeneralPreferences.mockRejectedValueOnce(httpError(503, 'service_unavailable'))

    const { result } = await setup()

    await act(async () => {
      result.current.setInterests(['science', 'history'])
    })
    await waitFor(() => expect(result.current.fields.interests.phase).toBe(ACTION_PHASE.ERROR))

    const field = result.current.fields[PREFERENCE_FIELD.INTERESTS]
    expect(result.current.values.interests).toEqual(['science', 'history'])
    expect(field.unsavedValue).toEqual(['science', 'history'])
    expect(field.confirmedValue).toEqual([])
    expect(field.isConfirmed).toBe(false)
    expect(field.canRetry).toBe(true)
    expect(field.error.recoverable).toBe(true)
    expect(result.current.unsavedFields).toEqual(['interests'])
    expect(result.current.failedFields).toEqual(['interests'])

    // Other fields are unaffected.
    expect(result.current.fields.language.phase).toBe(ACTION_PHASE.IDLE)
  })

  it('retries the visible draft and confirms it', async () => {
    userService.updateGeneralPreferences
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(preferences({ interests: ['science'], primary_topic: 'science' }))

    const { result } = await setup()

    await act(async () => {
      result.current.setInterests(['science'])
    })
    await waitFor(() => expect(result.current.fields.interests.canRetry).toBe(true))

    await act(async () => {
      result.current.retryField(PREFERENCE_FIELD.INTERESTS)
    })
    await waitFor(() => expect(result.current.fields.interests.isConfirmed).toBe(true))

    expect(userService.updateGeneralPreferences).toHaveBeenCalledTimes(2)
    expect(result.current.confirmed.interests).toEqual(['science'])
    expect(result.current.unsavedFields).toEqual([])
    expect(result.current.fields.interests.justSaved).toBe(true)
  })

  it('reports a rejected value as a terminal validation error', async () => {
    userService.updateGeneralPreferences.mockRejectedValue(
      httpError(422, [{ loc: ['body', 'interests'], msg: 'too long', type: 'too_long' }])
    )

    const { result } = await setup()

    await act(async () => {
      result.current.setInterests(['science', 'history', 'mathematics', 'art', 'music', 'psychology'])
    })
    await waitFor(() => expect(result.current.fields.interests.phase).toBe(ACTION_PHASE.ERROR))

    expect(result.current.fields.interests.error.code).toBe(VALIDATION_ERROR_CODE)
    expect(result.current.fields.interests.error.recoverable).toBe(false)
  })

  it('keeps the unsaved draft across a reload while confirmed state refreshes', async () => {
    userService.updateGeneralPreferences.mockRejectedValue(networkError())

    const { result } = await setup()

    await act(async () => {
      result.current.setStudyGoal('hobby')
    })
    await waitFor(() => expect(result.current.fields.study_goal.canRetry).toBe(true))

    userService.getGeneralPreferences.mockResolvedValue(preferences({ language: 'fr', study_goal: null }))
    await act(async () => {
      await result.current.reload()
    })

    // Confirmed state is the server's; the visible draft is still the user's.
    expect(result.current.confirmed.language).toBe('fr')
    expect(result.current.confirmed.study_goal).toBeNull()
    expect(result.current.values.study_goal).toBe('hobby')
    expect(result.current.fields.study_goal.isConfirmed).toBe(false)
  })
})
