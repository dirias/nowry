/**
 * FE-S4 — useFormCore (UX-CONTRACT §5.3, §8.2, §8.6, §9.4).
 *
 * The state core all seven surfaces sit on. The cases that matter most are the
 * ones where the shipped code loses user input: a reset effect that re-fires
 * while the form is open, and a save failure that closes the sheet.
 *
 * jsdom limitation: this hook deliberately moves no focus itself — it publishes
 * `firstErrorField`, `errorAt` and `savedCount` and the surface acts on them.
 * That the cursor actually lands where §8.6 says needs a surface test and, for
 * the keyboard cases, a real browser.
 */
import { act, renderHook, waitFor } from '@testing-library/react'

import useFormCore from './useFormCore'

const flashcard = (overrides = {}) => ({
  initialValues: () => ({ title: '', content: '', deck_id: '', tags: [] }),
  toFormState: (entity) => ({ title: entity.title, content: entity.content, deck_id: entity.deck_id, tags: entity.tags || [] }),
  requiredFields: [
    { field: 'title', errorKey: 'cards.frontRequired' },
    { field: 'content', errorKey: 'cards.backRequired' }
  ],
  persist: jest.fn().mockResolvedValue({ _id: 'new-card' }),
  ...overrides
})

const setup = (props = {}) => renderHook((extra) => useFormCore({ open: true, ...flashcard(), ...props, ...extra }))

describe('useFormCore — initialisation', () => {
  it('starts from initialValues in add mode', () => {
    const { result } = setup()
    expect(result.current.values).toEqual({ title: '', content: '', deck_id: '', tags: [] })
    expect(result.current.isEdit).toBe(false)
  })

  it('starts from toFormState in edit mode, and knows it is editing', () => {
    const entity = { _id: 'card-1', title: 'hola', content: 'hello', deck_id: 'deck-1' }
    const { result } = setup({ entity })
    expect(result.current.values.title).toBe('hola')
    expect(result.current.isEdit).toBe(true)
  })

  it('treats an entity carrying `id` rather than `_id` as an edit too', () => {
    const { result } = setup({ entity: { id: 'card-1', title: 'x', content: 'y' } })
    expect(result.current.isEdit).toBe(true)
  })

  it('does not initialise while closed', () => {
    const { result } = renderHook(() => useFormCore({ open: false, ...flashcard() }))
    expect(result.current.values).toEqual({ title: '', content: '', deck_id: '', tags: [] })
    expect(result.current.revealed.size).toBe(0)
  })

  it('re-initialises on the rising edge of open, not on every render', () => {
    const { result, rerender } = renderHook(({ open }) => useFormCore({ open, ...flashcard() }), { initialProps: { open: false } })
    rerender({ open: true })
    act(() => result.current.setField('title', 'typed'))
    rerender({ open: true })
    expect(result.current.values.title).toBe('typed')
    rerender({ open: false })
    rerender({ open: true })
    expect(result.current.values.title).toBe('')
  })

  // The shipped defect: QuizCardModal lists `decks` in its reset dependencies,
  // so refetching the deck list wipes every field the user has typed.
  it('does NOT reset when a dependency changes identity while the form is open', () => {
    const { result, rerender } = renderHook(({ decks }) => useFormCore({ open: true, ...flashcard(), groups: decks }), {
      initialProps: { decks: ['tags'] }
    })
    act(() => result.current.setField('title', 'half a card'))
    rerender({ decks: ['tags'] })
    rerender({ decks: ['tags', 'deck'] })
    expect(result.current.values.title).toBe('half a card')
  })
})

describe('useFormCore — disclosure', () => {
  const groups = ['tags', 'deck']

  it('opens collapsed in add mode because every predicate is false, not by special-casing add', () => {
    const { result } = setup({ groups, hasContent: { tags: (e) => e.tags?.length > 0 } })
    expect(result.current.revealed.size).toBe(0)
    expect(result.current.availableChips).toEqual(['tags', 'deck'])
  })

  it('never hides content the user already wrote', () => {
    const { result } = setup({
      entity: { _id: 'c', title: 'a', content: 'b', tags: ['verbs'] },
      groups,
      hasContent: { tags: (e) => (e.tags || []).length > 0, deck: (e) => Boolean(e.deck_id) }
    })
    expect(result.current.revealed.has('tags')).toBe(true)
    expect(result.current.revealed.has('deck')).toBe(false)
    expect(result.current.availableChips).toEqual(['deck'])
  })

  it('reveals a group and removes its chip from the rail', () => {
    const { result } = setup({ groups })
    act(() => result.current.reveal('deck'))
    expect(result.current.revealed.has('deck')).toBe(true)
    expect(result.current.availableChips).toEqual(['tags'])
  })

  it('reports the last revealed group, so the surface can move focus into it', () => {
    const { result } = setup({ groups })
    expect(result.current.lastRevealed).toBeNull()
    act(() => result.current.reveal('tags'))
    expect(result.current.lastRevealed).toBe('tags')
  })

  it('is idempotent — revealing twice does not double anything', () => {
    const { result } = setup({ groups })
    act(() => result.current.reveal('tags'))
    act(() => result.current.reveal('tags'))
    expect(result.current.availableChips).toEqual(['deck'])
  })

  it('seeds a group on reveal, so a chip never resolves to an empty state plus a second Add', () => {
    const { result } = setup({
      groups: ['options'],
      onReveal: { options: (values) => (values.options?.length ? null : { options: ['', ''] }) }
    })
    act(() => result.current.reveal('options'))
    expect(result.current.values.options).toEqual(['', ''])
  })

  it('orders override chips last — they change a value rather than add one', () => {
    const { result } = setup({ groups, overrideGroups: ['timeframe'] })
    expect(result.current.availableChips).toEqual(['tags', 'deck', 'timeframe'])
  })

  it('drops an override chip once it is revealed', () => {
    const { result } = setup({ groups: [], overrideGroups: ['timeframe'] })
    act(() => result.current.reveal('timeframe'))
    expect(result.current.availableChips).toEqual([])
  })

  describe('initialSection', () => {
    it('reveals, seeds and targets the named section on open', () => {
      const { result } = setup({
        groups: ['options'],
        initialSection: 'options',
        onReveal: { options: () => ({ options: [''] }) }
      })
      expect(result.current.revealed.has('options')).toBe(true)
      expect(result.current.values.options).toEqual([''])
      expect(result.current.autoFocusTarget).toBe('section')
    })

    it('targets the first required field when no section was asked for', () => {
      const { result } = setup()
      expect(result.current.autoFocusTarget).toBe('firstRequired')
    })
  })
})

describe('useFormCore — validation', () => {
  it('blocks an empty required field, names it, and fires no request', async () => {
    const persist = jest.fn()
    const { result } = setup({ persist })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).not.toHaveBeenCalled()
    expect(result.current.errors.title).toBe('cards.frontRequired')
    expect(result.current.firstErrorField).toBe('title')
  })

  it('names the SECOND field when only it is missing — never a generic "fill in all fields"', async () => {
    const { result } = setup()
    act(() => result.current.setField('title', 'hola'))
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.errors.title).toBeUndefined()
    expect(result.current.errors.content).toBe('cards.backRequired')
    expect(result.current.firstErrorField).toBe('content')
  })

  it('treats whitespace as empty', async () => {
    const { result } = setup()
    act(() => result.current.setField('title', '   '))
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.errors.title).toBe('cards.frontRequired')
  })

  it('bumps errorAt on every rejected save, so a second Save is not a silent no-op', async () => {
    const { result } = setup()
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    const first = result.current.errorAt
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.errorAt).toBe(first + 1)
  })

  it('clears an error when its own field changes, and leaves the others alone', async () => {
    const { result } = setup({
      requiredFields: [
        { field: 'title', errorKey: 'a' },
        { field: 'content', errorKey: 'b' }
      ]
    })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    act(() => result.current.setValues((prev) => ({ ...prev, title: 'x' })))
    act(() => result.current.setField('content', 'y'))
    expect(result.current.errors.content).toBeUndefined()
  })

  it('accepts a per-field rule, for a value that is not a string', async () => {
    const persist = jest.fn().mockResolvedValue({})
    const { result } = setup({
      initialValues: () => ({ options: [] }),
      requiredFields: [{ field: 'options', errorKey: 'cards.needTwoOptions', valid: (value) => (value || []).length >= 2 }],
      persist
    })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.errors.options).toBe('cards.needTwoOptions')
    act(() => result.current.setField('options', ['a', 'b']))
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).toHaveBeenCalled()
  })

  // §8.3 — the quiz card's rule is a relation over a collection, and has no
  // single field to blame. It names a target the surface can focus anyway.
  it('runs a relational rule after the per-field ones', async () => {
    const persist = jest.fn()
    const { result } = setup({
      requiredFields: [],
      initialValues: () => ({ options: ['a', 'b'], correct: 'c' }),
      validate: (values) => (values.options.includes(values.correct) ? null : { field: 'options', errorKey: 'cards.correctMissing' }),
      persist
    })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).not.toHaveBeenCalled()
    expect(result.current.firstErrorField).toBe('options')
    expect(result.current.errors.options).toBe('cards.correctMissing')
  })

  it('lets a per-field failure win over the relational rule, so the nearer fix is offered first', async () => {
    const validate = jest.fn()
    const { result } = setup({ validate })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(validate).not.toHaveBeenCalled()
    expect(result.current.firstErrorField).toBe('title')
  })

  it('saves when a surface declares no required fields at all (Variant A′)', async () => {
    const persist = jest.fn().mockResolvedValue({ _id: 'book-1' })
    const { result } = setup({ requiredFields: [], persist })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).toHaveBeenCalled()
  })
})

describe('useFormCore — submit', () => {
  const filled = (result) => {
    act(() => result.current.setField('title', 'hola'))
    act(() => result.current.setField('content', 'hello'))
  }

  it('builds the payload, persists it, and reports the saved object', async () => {
    const persist = jest.fn().mockResolvedValue({ _id: 'new-card' })
    const buildPayload = jest.fn((values) => ({ ...values, card_type: 'flashcard' }))
    const onSuccess = jest.fn()
    const onClose = jest.fn()
    const { result } = setup({ persist, buildPayload })
    filled(result)
    await act(async () => result.current.submit(onSuccess, onClose))
    expect(buildPayload).toHaveBeenCalledWith(expect.objectContaining({ title: 'hola' }))
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ card_type: 'flashcard' }), false)
    expect(onSuccess).toHaveBeenCalledWith({ _id: 'new-card' })
    expect(onClose).toHaveBeenCalled()
  })

  it('tells persist whether this is an edit, so one call site covers create and update', async () => {
    const persist = jest.fn().mockResolvedValue({})
    const { result } = setup({ entity: { _id: 'c', title: 'a', content: 'b' }, persist })
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).toHaveBeenCalledWith(expect.anything(), true)
  })

  it('keeps the sheet open with every field intact when the API rejects the save', async () => {
    const persist = jest.fn().mockRejectedValue({ response: { data: { detail: 'Card limit reached' } } })
    const onClose = jest.fn()
    const { result } = setup({ persist })
    filled(result)
    await act(async () => result.current.submit(jest.fn(), onClose))
    expect(onClose).not.toHaveBeenCalled()
    expect(result.current.values.title).toBe('hola')
    expect(result.current.saveError).toBe('Card limit reached')
  })

  it("flattens FastAPI's array-shaped 422 rather than surfacing a bare AxiosError", async () => {
    const persist = jest.fn().mockRejectedValue({
      response: { data: { detail: [{ loc: ['body', 'title'], msg: 'Field required' }] } }
    })
    const { result } = setup({ persist })
    filled(result)
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.saveError).toBe('title: Field required')
  })

  it('clears a previous save error on the next attempt', async () => {
    const persist = jest.fn().mockRejectedValueOnce({ message: 'Network Error' }).mockResolvedValueOnce({ _id: 'x' })
    const { result } = setup({ persist })
    filled(result)
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.saveError).toBe('Network Error')
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(result.current.saveError).toBeNull()
  })

  it('reports `saving` while in flight and clears it either way', async () => {
    let release
    const persist = jest.fn(() => new Promise((resolve) => (release = resolve)))
    const { result } = setup({ persist })
    filled(result)
    act(() => {
      result.current.submit(jest.fn(), jest.fn())
    })
    await waitFor(() => expect(result.current.saving).toBe(true))
    await act(async () => {
      release({ _id: 'x' })
    })
    expect(result.current.saving).toBe(false)
  })

  it('ignores a second submit while one is already in flight — no double create', async () => {
    let release
    const persist = jest.fn(() => new Promise((resolve) => (release = resolve)))
    const { result } = setup({ persist })
    filled(result)
    act(() => {
      result.current.submit(jest.fn(), jest.fn())
    })
    await waitFor(() => expect(result.current.saving).toBe(true))
    await act(async () => result.current.submit(jest.fn(), jest.fn()))
    expect(persist).toHaveBeenCalledTimes(1)
    await act(async () => {
      release({ _id: 'x' })
    })
  })
})

describe('useFormCore — submitAndContinue (§9.4)', () => {
  const filled = (result) => {
    act(() => result.current.setField('title', 'hola'))
    act(() => result.current.setField('content', 'hello'))
    act(() => result.current.setField('deck_id', 'deck-1'))
    act(() => result.current.setField('tags', ['verbs']))
  }

  it('clears only the listed fields and leaves the sticky context alone', async () => {
    const { result } = setup({ continueResets: ['title', 'content'] })
    filled(result)
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(result.current.values.title).toBe('')
    expect(result.current.values.content).toBe('')
    expect(result.current.values.deck_id).toBe('deck-1')
    expect(result.current.values.tags).toEqual(['verbs'])
  })

  it('counts what has been added, which is the signal the footer and the re-focus read', async () => {
    const { result } = setup({ continueResets: ['title', 'content'] })
    filled(result)
    expect(result.current.savedCount).toBe(0)
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(result.current.savedCount).toBe(1)
    act(() => result.current.setField('title', 'dos'))
    act(() => result.current.setField('content', 'two'))
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(result.current.savedCount).toBe(2)
  })

  it('hands the saved object to the caller', async () => {
    const onSaved = jest.fn()
    const { result } = setup({ continueResets: ['title'] })
    filled(result)
    await act(async () => result.current.submitAndContinue(onSaved))
    expect(onSaved).toHaveBeenCalledWith({ _id: 'new-card' })
  })

  it('does not count or clear anything when the save fails', async () => {
    const persist = jest.fn().mockRejectedValue({ message: 'Network Error' })
    const { result } = setup({ persist, continueResets: ['title', 'content'] })
    filled(result)
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(result.current.savedCount).toBe(0)
    expect(result.current.values.title).toBe('hola')
    expect(result.current.saveError).toBe('Network Error')
  })

  it('does not count or clear anything when validation rejects', async () => {
    const persist = jest.fn()
    const { result } = setup({ persist, continueResets: ['title'] })
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(persist).not.toHaveBeenCalled()
    expect(result.current.savedCount).toBe(0)
    expect(result.current.firstErrorField).toBe('title')
  })

  it('resets the count when the sheet is closed and reopened', async () => {
    const { result, rerender } = renderHook(({ open }) => useFormCore({ open, ...flashcard(), continueResets: ['title', 'content'] }), {
      initialProps: { open: true }
    })
    act(() => result.current.setField('title', 'hola'))
    act(() => result.current.setField('content', 'hello'))
    await act(async () => result.current.submitAndContinue(jest.fn()))
    expect(result.current.savedCount).toBe(1)
    rerender({ open: false })
    rerender({ open: true })
    expect(result.current.savedCount).toBe(0)
  })
})
