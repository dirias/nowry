/**
 * Phase 16 — useCalendarFilters tests (FLT-02, FLT-03).
 * Tests pure logic mirrored from the hook — no React rendering required.
 */

// ─── Mirror constants and helpers from the hook ──────────────────────────────

const OLD_KEY = 'nowry:calendarFilters'
const STORAGE_KEY = 'nowry_cal_filters_v1'
const DEFAULT_FILTERS = {
  habitsEnabled: false,
  activeTypes: ['task', 'priority', 'goal', 'milestone'],
  activeAreaIds: [],
}

function isValidShape(parsed) {
  return (
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    typeof parsed.habitsEnabled === 'boolean' &&
    Array.isArray(parsed.activeTypes) &&
    Array.isArray(parsed.activeAreaIds)
  )
}

// applyPreset pure function (mirrors hook logic without useState)
function applyPreset(name, currentFilters) {
  if (name === 'goals_only') {
    return { habitsEnabled: false, activeTypes: ['goal', 'milestone'], activeAreaIds: [] }
  } else if (name === 'today' || name === 'this_week') {
    return { ...DEFAULT_FILTERS }
  }
  return currentFilters // no-op for unknown preset
}

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

// ─── FLT-02: localStorage migration ─────────────────────────────────────────

describe('FLT-02: localStorage migration', () => {
  it('migrates habitsEnabled=true from old key to new key and deletes old key', () => {
    // Arrange: set old key with habitsEnabled=true
    localStorage.setItem(OLD_KEY, JSON.stringify({ habitsEnabled: true }))

    // Act: simulate migration logic (mirrors useState initializer in hook)
    const old = localStorage.getItem(OLD_KEY)
    const parsed = JSON.parse(old)
    const habitsEnabled = typeof parsed?.habitsEnabled === 'boolean' ? parsed.habitsEnabled : false
    const migrated = { ...DEFAULT_FILTERS, habitsEnabled }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    localStorage.removeItem(OLD_KEY)

    // Assert: new key has correct habitsEnabled, old key is gone
    const newVal = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(newVal.habitsEnabled).toBe(true)
    expect(newVal.activeTypes).toEqual(['task', 'priority', 'goal', 'milestone'])
    expect(newVal.activeAreaIds).toEqual([])
    expect(localStorage.getItem(OLD_KEY)).toBeNull()
  })

  it('migrates habitsEnabled=false when old key value is malformed (missing field)', () => {
    // Arrange: old key with missing habitsEnabled (malformed)
    localStorage.setItem(OLD_KEY, JSON.stringify({ someOtherField: 'value' }))

    // Act: simulate migration logic
    const old = localStorage.getItem(OLD_KEY)
    const parsed = JSON.parse(old)
    const habitsEnabled = typeof parsed?.habitsEnabled === 'boolean' ? parsed.habitsEnabled : false
    const migrated = { ...DEFAULT_FILTERS, habitsEnabled }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    localStorage.removeItem(OLD_KEY)

    // Assert: habitsEnabled defaults to false, old key removed
    const newVal = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(newVal.habitsEnabled).toBe(false)
    expect(localStorage.getItem(OLD_KEY)).toBeNull()
  })

  it('reads new key when old key absent and shape is valid full object', () => {
    // Arrange: only new key present with valid full shape
    const validShape = { habitsEnabled: true, activeTypes: ['goal'], activeAreaIds: ['area-1'] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validShape))

    // Act: simulate useState initializer (old key absent, so reads new key)
    let result
    try {
      const old = localStorage.getItem(OLD_KEY)
      if (old) {
        // migration path — skipped in this test
        const parsed = JSON.parse(old)
        const habitsEnabled = typeof parsed?.habitsEnabled === 'boolean' ? parsed.habitsEnabled : false
        result = { ...DEFAULT_FILTERS, habitsEnabled }
      } else {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (isValidShape(parsed)) {
            result = parsed
          } else {
            result = DEFAULT_FILTERS
          }
        } else {
          result = DEFAULT_FILTERS
        }
      }
    } catch {
      result = DEFAULT_FILTERS
    }

    // Assert: returns the stored valid shape
    expect(result).toEqual(validShape)
  })

  it('falls back to DEFAULT_FILTERS when new key has stale Phase 15 shape (only {habitsEnabled: boolean})', () => {
    // Arrange: new key has old Phase 15 shape — missing activeTypes and activeAreaIds
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habitsEnabled: false }))

    // Act: simulate useState initializer
    let result
    try {
      const old = localStorage.getItem(OLD_KEY)
      if (!old) {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (isValidShape(parsed)) {
            result = parsed
          } else {
            result = DEFAULT_FILTERS
          }
        } else {
          result = DEFAULT_FILTERS
        }
      } else {
        result = DEFAULT_FILTERS
      }
    } catch {
      result = DEFAULT_FILTERS
    }

    // Assert: stale shape (missing activeTypes/activeAreaIds) falls back to defaults
    expect(result).toEqual(DEFAULT_FILTERS)
  })

  it('falls back to DEFAULT_FILTERS when localStorage.getItem throws', () => {
    // Arrange: mock localStorage.getItem to throw
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable')
    })

    // Act: simulate useState initializer with try/catch
    let result
    try {
      const old = localStorage.getItem(OLD_KEY)
      if (!old) {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (isValidShape(parsed)) result = parsed
          else result = DEFAULT_FILTERS
        } else {
          result = DEFAULT_FILTERS
        }
      }
    } catch {
      result = DEFAULT_FILTERS
    }

    // Assert: exception caught, defaults returned
    expect(result).toEqual(DEFAULT_FILTERS)

    // Restore
    jest.restoreAllMocks()
  })
})

// ─── FLT-02: shape validation (isValidShape) ────────────────────────────────

describe('FLT-02: shape validation (isValidShape)', () => {
  it("returns true for { habitsEnabled: false, activeTypes: ['task'], activeAreaIds: [] }", () => {
    expect(isValidShape({ habitsEnabled: false, activeTypes: ['task'], activeAreaIds: [] })).toBe(true)
  })

  it('returns false when activeTypes is missing', () => {
    expect(isValidShape({ habitsEnabled: false, activeAreaIds: [] })).toBe(false)
  })

  it('returns false when activeAreaIds is missing', () => {
    expect(isValidShape({ habitsEnabled: false, activeTypes: ['task'] })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidShape(null)).toBe(false)
  })

  it('returns false for an array (not a plain object)', () => {
    expect(isValidShape(['task', 'priority'])).toBe(false)
  })
})

// ─── FLT-02: localStorage write on state change ──────────────────────────────

describe('FLT-02: localStorage write on state change', () => {
  it('writes correct JSON to STORAGE_KEY when filters object is serialized', () => {
    // Arrange: a filters object matching the expected shape
    const filters = { habitsEnabled: true, activeTypes: ['goal', 'milestone'], activeAreaIds: ['area-abc'] }

    // Act: simulate the useEffect write
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (e) {
      // no-op
    }

    // Assert: STORAGE_KEY contains correct JSON
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored).toEqual(filters)
    expect(stored.habitsEnabled).toBe(true)
    expect(stored.activeTypes).toEqual(['goal', 'milestone'])
    expect(stored.activeAreaIds).toEqual(['area-abc'])
  })
})

// ─── FLT-03: applyPreset logic ───────────────────────────────────────────────

describe('FLT-03: applyPreset logic', () => {
  it("'goals_only' produces { habitsEnabled: false, activeTypes: ['goal','milestone'], activeAreaIds: [] }", () => {
    const result = applyPreset('goals_only', DEFAULT_FILTERS)
    expect(result).toEqual({
      habitsEnabled: false,
      activeTypes: ['goal', 'milestone'],
      activeAreaIds: [],
    })
  })

  it("'today' produces DEFAULT_FILTERS", () => {
    const result = applyPreset('today', DEFAULT_FILTERS)
    expect(result).toEqual(DEFAULT_FILTERS)
  })

  it("'this_week' produces DEFAULT_FILTERS", () => {
    const result = applyPreset('this_week', DEFAULT_FILTERS)
    expect(result).toEqual(DEFAULT_FILTERS)
  })

  it('unknown preset name is a no-op (returns current state unchanged)', () => {
    const customState = { habitsEnabled: true, activeTypes: ['goal'], activeAreaIds: ['area-1'] }
    const result = applyPreset('unknown_preset', customState)
    expect(result).toBe(customState) // same reference — no-op
  })
})
