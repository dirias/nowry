import { describeApiError, emptyToNull, extractDeckId, parseTagInput, scrollBehavior, scrollIntoViewSafely } from '../formUtils'

describe('emptyToNull', () => {
  it.each([
    ['', null],
    [undefined, null],
    [0, 0],
    [false, false],
    ['2026-01-01', '2026-01-01']
  ])('maps %p to %p', (input, expected) => {
    expect(emptyToNull(input)).toEqual(expected)
  })

  it('keeps null as null so a cleared field still travels explicitly', () => {
    expect(emptyToNull(null)).toBeNull()
  })
})

describe('describeApiError', () => {
  it("flattens FastAPI's array-shaped 422 and strips the `body` prefix", () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'title'], msg: 'Field required' },
            { loc: ['body', 'quarter'], msg: 'Input should be a valid integer' }
          ]
        }
      }
    }
    expect(describeApiError(error)).toBe('title: Field required · quarter: Input should be a valid integer')
  })

  it('renders a message with no field when loc carries only `body`', () => {
    const error = { response: { data: { detail: [{ loc: ['body'], msg: 'Malformed' }] } } }
    expect(describeApiError(error)).toBe('Malformed')
  })

  it('passes a string-shaped HTTPException detail straight through', () => {
    expect(describeApiError({ response: { data: { detail: 'Card limit reached' } } })).toBe('Card limit reached')
  })

  it('falls back to the transport message rather than showing nothing', () => {
    expect(describeApiError({ message: 'Network Error' })).toBe('Network Error')
  })

  it('returns an empty string for an error it cannot describe, never "undefined"', () => {
    expect(describeApiError(null)).toBe('')
    expect(describeApiError({})).toBe('')
  })
})

describe('extractDeckId', () => {
  it('unwraps a populated deck object by _id', () => {
    expect(extractDeckId({ _id: 'abc', name: 'Spanish' })).toBe('abc')
  })

  it('falls back to `id` when the object was serialised without an underscore', () => {
    expect(extractDeckId({ id: 'xyz' })).toBe('xyz')
  })

  it('passes a bare id string through', () => {
    expect(extractDeckId('deck-1')).toBe('deck-1')
  })

  it.each([[null], [undefined], [''], [{}]])('returns an empty string for %p', (input) => {
    expect(extractDeckId(input)).toBe('')
  })
})

describe('parseTagInput', () => {
  it('splits, trims and drops empties', () => {
    expect(parseTagInput(' verbs , tenses ,, ')).toEqual(['verbs', 'tenses'])
  })

  it('drops duplicates so two chips cannot share one label', () => {
    expect(parseTagInput('verbs, verbs , VERBS')).toEqual(['verbs', 'VERBS'])
  })

  it('accepts an array and normalises it the same way', () => {
    expect(parseTagInput([' a ', 'b', 'a', ''])).toEqual(['a', 'b'])
  })

  it.each([[''], [null], [undefined]])('returns [] for %p', (input) => {
    expect(parseTagInput(input)).toEqual([])
  })
})

describe('scroll helpers', () => {
  const setReducedMotion = (matches) => {
    window.matchMedia = jest.fn().mockReturnValue({ matches })
  }

  afterEach(() => {
    delete window.matchMedia
  })

  it('uses `auto` under prefers-reduced-motion and `smooth` otherwise', () => {
    setReducedMotion(true)
    expect(scrollBehavior()).toBe('auto')
    setReducedMotion(false)
    expect(scrollBehavior()).toBe('smooth')
  })

  it('defaults to block:"nearest" so a visible field is not re-scrolled under the keyboard', () => {
    setReducedMotion(false)
    const scrollIntoView = jest.fn()
    scrollIntoViewSafely({ scrollIntoView })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
  })

  it('honours an explicit block for a freshly revealed section', () => {
    setReducedMotion(true)
    const scrollIntoView = jest.fn()
    scrollIntoViewSafely({ scrollIntoView }, 'start')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('is a no-op when the ref never attached', () => {
    setReducedMotion(false)
    expect(() => scrollIntoViewSafely(null)).not.toThrow()
    expect(() => scrollIntoViewSafely({})).not.toThrow()
  })
})
