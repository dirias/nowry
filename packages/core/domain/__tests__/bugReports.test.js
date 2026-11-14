/**
 * BUG-001, ADMIN-008a, ADMIN-007b — the rules of a bug report (FR-007, FR-008,
 * FR-011 Bug reports; boards C, G, H): the limits said before they bite, the
 * refusals read, what a phone attaches, and what the admin's card shows and saves.
 */
import {
  BUG_STATUSES,
  REPORT_AREAS,
  REPORT_LIMITS,
  SEVERITIES,
  appVersionLabel,
  areaForPath,
  bodyFits,
  bugChanges,
  canReport,
  bugDevice,
  bugFacts,
  dataUrlType,
  decodedBytes,
  emptyReport,
  fieldLimit,
  isAppReport,
  isOwnNote,
  isTextField,
  nextBugSelection,
  notesOldestFirst,
  osLabel,
  phoneContext,
  phoneDeviceLabel,
  reportBody,
  reportProblems,
  reportRefusal,
  screenSize,
  screenshotProblem,
  severityTone,
  statusCounts
} from '../bugReports'

const dataUrl = (type, bytes) => `data:${type};base64,${'A'.repeat(Math.ceil((bytes * 4) / 3))}`

describe('the lists', () => {
  it('holds the limits of FR-008', () => {
    expect(REPORT_LIMITS).toEqual({
      title: 140,
      text: 4000,
      screenshots: 3,
      screenshotBytes: 2 * 1024 * 1024,
      bodyBytes: 7 * 1024 * 1024,
      perDay: 10
    })
    expect(fieldLimit('title')).toBe(140)
    expect(fieldLimit('description')).toBe(4000)
    expect(fieldLimit('steps_to_reproduce')).toBe(4000)
  })

  it('orders severities, areas and states as the boards draw them', () => {
    expect(SEVERITIES).toEqual(['low', 'medium', 'high', 'critical'])
    expect(REPORT_AREAS).toEqual(['study', 'books', 'planning', 'focus', 'other'])
    expect(BUG_STATUSES).toEqual(['new', 'in_progress', 'fixed', 'wont_fix'])
  })
})

describe('canReport', () => {
  it('is every signed-in account while the beta is on, stamp or not', () => {
    expect(canReport({ id: 'u1' }, { active: true })).toBe(true)
    expect(canReport({ id: 'u0', beta: null }, { active: true })).toBe(true)
    expect(canReport({ id: 'u1' }, { active: false })).toBe(false)
    expect(canReport(null, { active: true })).toBe(false)
    expect(canReport({ id: 'u1' }, undefined)).toBe(false)
  })
})

describe('a new report', () => {
  it('starts at medium with the area of the page the tester is on', () => {
    expect(emptyReport('/study/abc')).toEqual({
      title: '',
      description: '',
      steps_to_reproduce: '',
      severity: 'medium',
      category: 'study',
      screenshots: []
    })
    expect(areaForPath('/book/1')).toBe('books')
    expect(areaForPath('/annual-planning')).toBe('planning')
    expect(areaForPath('/calendar')).toBe('planning')
    expect(areaForPath('/pomodoro')).toBe('focus')
    expect(areaForPath('/')).toBe('other')
    expect(areaForPath()).toBe('other')
  })
})

describe('reportProblems', () => {
  it('needs a title and what happened; the steps are optional', () => {
    expect(reportProblems({ title: ' ', description: '', steps_to_reproduce: '' })).toEqual({
      title: 'required',
      description: 'required'
    })
    expect(reportProblems({ title: 'Flip', description: 'Twice' })).toEqual({})
  })

  it('says which field is over its limit', () => {
    expect(reportProblems({ title: 'x'.repeat(141), description: 'y'.repeat(4001), steps_to_reproduce: 'z'.repeat(4001) })).toEqual({
      title: 'tooLong',
      description: 'tooLong',
      steps_to_reproduce: 'tooLong'
    })
    expect(reportProblems({ title: 'x'.repeat(140), description: 'y'.repeat(4000), steps_to_reproduce: 'z'.repeat(4000) })).toEqual({})
  })
})

describe('screenshots', () => {
  it('reads the decoded size and the type of a data URL', () => {
    expect(decodedBytes('data:image/png;base64,QUJD')).toBe(3)
    expect(decodedBytes('data:image/png;base64,QUI=')).toBe(2)
    expect(decodedBytes('QQ==')).toBe(1)
    expect(decodedBytes(null)).toBe(0)
    expect(dataUrlType('data:image/WEBP;base64,AA')).toBe('image/webp')
    expect(dataUrlType('nonsense')).toBeNull()
  })

  it('takes PNG, JPEG and WebP up to 2 MB decoded', () => {
    expect(screenshotProblem(dataUrl('image/png', 1000))).toBeNull()
    expect(screenshotProblem(dataUrl('image/jpeg', 2 * 1024 * 1024))).toBeNull()
    expect(screenshotProblem(dataUrl('image/webp', 2 * 1024 * 1024 + 3))).toBe('tooLarge')
    expect(screenshotProblem(dataUrl('image/gif', 10))).toBe('type')
  })

  it('keeps the body under 7 MB', () => {
    expect(bodyFits({ title: 'x' })).toBe(true)
    expect(bodyFits({ data: 'x'.repeat(7 * 1024 * 1024) })).toBe(false)
    const loop = {}
    loop.self = loop
    expect(bodyFits(loop)).toBe(false)
  })
})

describe('reportRefusal', () => {
  const refusal = (status, detail) => ({ response: { status, data: { detail } } })

  it('reads the daily limit, too large, closed, and anything else as a failure', () => {
    expect(reportRefusal(refusal(429, { code: 'daily_limit', retry_at: '2026-11-15T00:00:00Z' }))).toEqual({
      kind: 'dailyLimit',
      retryAt: '2026-11-15T00:00:00Z'
    })
    expect(reportRefusal(refusal(429, null))).toEqual({ kind: 'dailyLimit', retryAt: null })
    expect(reportRefusal(refusal(413, { code: 'too_large', field: 'title' }))).toEqual({ kind: 'tooLarge', field: 'title' })
    expect(reportRefusal(refusal(413, 'Request Entity Too Large'))).toEqual({ kind: 'tooLarge', field: null })
    expect(reportRefusal(refusal(403, { code: 'reports_closed' }))).toEqual({ kind: 'closed' })
    expect(reportRefusal(refusal(500, null))).toEqual({ kind: 'failed' })
    expect(reportRefusal(new Error('offline'))).toEqual({ kind: 'failed' })
  })

  it('knows which fields are text', () => {
    expect(isTextField('title')).toBe(true)
    expect(isTextField('steps_to_reproduce')).toBe(true)
    expect(isTextField('screenshots')).toBe(false)
    expect(isTextField('body')).toBe(false)
  })
})

describe('reportBody', () => {
  it('trims the text, keeps a known severity and area, and adds the context', () => {
    expect(
      reportBody(
        { title: ' Flip ', description: ' Twice ', steps_to_reproduce: '', severity: 'high', category: 'books', screenshots: [1] },
        { platform: 'web' }
      )
    ).toEqual({
      title: 'Flip',
      description: 'Twice',
      steps_to_reproduce: '',
      severity: 'high',
      category: 'books',
      screenshots: [1],
      platform: 'web'
    })
    expect(reportBody({ severity: 'meh', category: 'ui' })).toMatchObject({ severity: 'medium', category: 'other', screenshots: [] })
  })
})

describe('what a phone attaches', () => {
  it('names the platform, the app and its build, and the device with its system; no page, no browser', () => {
    expect(phoneContext({ os: 'android', osVersion: '15', appVersion: '1.0', build: 31, model: 'Pixel 7' })).toEqual({
      platform: 'android',
      app_version: '1.0 (31)',
      device: 'Pixel 7 · Android 15'
    })
  })

  it('says what it knows when the phone does not say everything', () => {
    expect(phoneContext({})).toEqual({ platform: 'android', app_version: '', device: 'Android' })
    expect(phoneDeviceLabel({ os: 'ios', osVersion: '17.2' })).toBe('iOS 17.2')
    expect(osLabel('android', ' ')).toBe('Android')
    expect(appVersionLabel('1.0', null)).toBe('1.0')
    expect(appVersionLabel(null, 31)).toBe('(31)')
  })
})

describe('the admin card', () => {
  const web = {
    id: 'b1',
    platform: 'web',
    browser_info: { name: 'Chrome', version: '131.0', os: 'Android 15', screen_resolution: '412x915' }
  }
  const phone = { id: 'b2', platform: 'android', app_version: '1.0 (31)', device: 'Pixel 7 · Android 15', browser_info: null }

  it('colours critical danger, high warning, the rest neutral', () => {
    expect(SEVERITIES.map(severityTone)).toEqual(['neutral', 'neutral', 'warning', 'danger'])
  })

  it('tells a phone report from a browser one', () => {
    expect(isAppReport(web)).toBe(false)
    expect(isAppReport(phone)).toBe(true)
    expect(isAppReport({ platform: 'ios' })).toBe(true)
    expect(isAppReport(null)).toBe(false)
  })

  it('shortens the device for a row', () => {
    expect(bugDevice(web)).toEqual({ app: false, os: 'Android', browser: 'Chrome' })
    expect(bugDevice(phone)).toEqual({ app: true, os: 'Android' })
    expect(bugDevice({ browser_info: { name: 'Unknown', os: 'Unknown' } })).toEqual({ app: false, os: '', browser: '' })
  })

  it('lists the facts after "Reported…"', () => {
    expect(bugFacts(web)).toEqual({ app: false, parts: ['Android 15', 'Chrome 131', '412 × 915'] })
    expect(bugFacts(phone)).toEqual({ app: true, version: '1.0 (31)', device: 'Pixel 7 · Android 15' })
    expect(bugFacts({})).toEqual({ app: false, parts: [] })
    expect(screenSize({ browser_info: { screen_resolution: 'big' } })).toBe('big')
    expect(screenSize({ screen_size: '390x844', browser_info: { screen_resolution: '1x1' } })).toBe('390 × 844')
  })

  it('reads the notes oldest first and knows the reader’s own', () => {
    const notes = [
      { text: 'second', by: 'u1', at: '2026-11-14T10:00:00Z' },
      { text: 'first', by: 'u2', at: '2026-11-13T10:00:00Z' }
    ]
    expect(notesOldestFirst({ notes }).map((note) => note.text)).toEqual(['first', 'second'])
    expect(notesOldestFirst({})).toEqual([])
    expect(isOwnNote(notes[0], { id: 'u1' })).toBe(true)
    expect(isOwnNote(notes[0], { username: 'u1' })).toBe(true)
    expect(isOwnNote(notes[1], { id: 'u1' })).toBe(false)
    expect(isOwnNote(notes[1], null)).toBe(false)
  })

  it('saves a changed status and a note that says something, or nothing', () => {
    const bug = { status: 'new' }
    expect(bugChanges(bug, { status: 'new', note: '  ' })).toBeNull()
    expect(bugChanges(bug, { status: 'fixed', note: '' })).toEqual({ status: 'fixed' })
    expect(bugChanges(bug, { status: 'new', note: ' Seen on a Pixel 7 ' })).toEqual({ note: 'Seen on a Pixel 7' })
    expect(bugChanges(bug, { status: 'in_progress', note: 'Mine' })).toEqual({ status: 'in_progress', note: 'Mine' })
    expect(bugChanges(bug, { status: 'closed' })).toBeNull()
  })

  it('reads zero for a state the stats left out', () => {
    expect(statusCounts({ by_status: { new: 3, fixed: 14 } })).toEqual({ new: 3, in_progress: 0, fixed: 14, wont_fix: 0 })
    expect(statusCounts(null)).toEqual({ new: 0, in_progress: 0, fixed: 0, wont_fix: 0 })
  })

  it('keeps the selection while it is listed, otherwise the first', () => {
    const bugs = [{ id: 'a' }, { id: 'b' }]
    expect(nextBugSelection(bugs, 'b')).toBe('b')
    expect(nextBugSelection(bugs, 'gone')).toBe('a')
    expect(nextBugSelection([], 'a')).toBeNull()
  })
})
