import { apiTime } from './apiInstant'
/**
 * Bug reports, for the tester who sends one and the admin who triages it
 * (BUG-001, ADMIN-008a, ADMIN-007b; FR-007, FR-008, FR-011 Bug reports; boards C, G, H).
 *
 * The limits are the API's (FR-008), enforced here first so a tester reads a
 * field message rather than a refusal. Platform-free: labels are translation
 * keys, colours are Joy colour names, and nothing here reads a browser or a phone.
 */

/** The limits a report is held to (FR-008). */
export const REPORT_LIMITS = Object.freeze({
  title: 140,
  text: 4000,
  screenshots: 3,
  screenshotBytes: 2 * 1024 * 1024,
  bodyBytes: 7 * 1024 * 1024,
  perDay: 10
})

/** The picture types a screenshot may be (FR-008). */
export const SCREENSHOT_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp'])

/** How bad it is, in the segmented control's order (board G). */
export const SEVERITIES = Object.freeze(['low', 'medium', 'high', 'critical'])

/** The areas a report is about, on the web's select and the phone's chips (boards G, H). */
export const REPORT_AREAS = Object.freeze(['study', 'books', 'planning', 'focus', 'other'])

/** The states a report moves through, in the filter and segmented-control order (board C). */
export const BUG_STATUSES = Object.freeze(['new', 'in_progress', 'fixed', 'wont_fix'])

/**
 * Whether an account can report a problem (FR-007): any signed-in account while
 * the beta is on. Accounts from before the gate carry no beta stamp, so the
 * stamp is not the test; the beta config is.
 */
export const canReport = (user, betaConfig) => Boolean(user) && Boolean(betaConfig?.active)

/** The text fields and the limit each is held to. */
const TEXT_FIELDS = Object.freeze({
  title: REPORT_LIMITS.title,
  description: REPORT_LIMITS.text,
  steps_to_reproduce: REPORT_LIMITS.text
})

/** The longest a field may be, for its counter. */
export const fieldLimit = (field) => TEXT_FIELDS[field] ?? REPORT_LIMITS.text

/** A fresh report, the area guessed from where the tester is. */
export const emptyReport = (path = '') => ({
  title: '',
  description: '',
  steps_to_reproduce: '',
  severity: 'medium',
  category: areaForPath(path),
  screenshots: []
})

/** The area a page belongs to: `/study/…` is Study, `/annual-planning` is Planning; anything else is Other. */
export const areaForPath = (path = '') => {
  const first = String(path).split('/').filter(Boolean)[0] ?? ''
  if (['study', 'cards', 'browse', 'public'].includes(first)) return 'study'
  if (['books', 'book'].includes(first)) return 'books'
  if (['annual-planning', 'calendar', 'boards'].includes(first)) return 'planning'
  if (['pomodoro', 'focus'].includes(first)) return 'focus'
  return 'other'
}

/**
 * What is wrong with a report before it is sent, per field:
 * `{title?: 'required'|'tooLong', description?: …, steps_to_reproduce?: 'tooLong'}`.
 * Empty when it can go.
 */
export const reportProblems = (report) => {
  const problems = {}
  Object.entries(TEXT_FIELDS).forEach(([field, max]) => {
    const value = String(report?.[field] ?? '')
    if (field !== 'steps_to_reproduce' && !value.trim()) problems[field] = 'required'
    else if (value.length > max) problems[field] = 'tooLong'
  })
  return problems
}

/** How many bytes a base64 data URL holds once decoded. */
export const decodedBytes = (dataUrl) => {
  const data = String(dataUrl ?? '')
  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

/** The picture type a data URL says it is, or null. */
export const dataUrlType = (dataUrl) => {
  const match = /^data:([^;,]+)[;,]/.exec(String(dataUrl ?? ''))
  return match ? match[1].toLowerCase() : null
}

/**
 * Whether a screenshot, made smaller, can be sent: `null` when it can,
 * `'type'` when it is not PNG, JPEG or WebP, `'tooLarge'` when it is still
 * over 2 MB decoded.
 */
export const screenshotProblem = (dataUrl) => {
  if (!SCREENSHOT_TYPES.includes(dataUrlType(dataUrl))) return 'type'
  if (decodedBytes(dataUrl) > REPORT_LIMITS.screenshotBytes) return 'tooLarge'
  return null
}

/** Whether a body would pass the 7 MB request limit once sent as JSON. */
export const bodyFits = (body) => {
  try {
    return JSON.stringify(body).length <= REPORT_LIMITS.bodyBytes
  } catch {
    return false
  }
}

/**
 * What the API answered a refused report, as the client says it:
 * `{kind: 'dailyLimit', retryAt}`, `{kind: 'tooLarge', field}`, `{kind: 'closed'}`,
 * or `{kind: 'failed'}` for anything else.
 */
export const reportRefusal = (error) => {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail
  const code = detail?.code
  if (status === 429 || code === 'daily_limit') return { kind: 'dailyLimit', retryAt: detail?.retry_at ?? null }
  if (status === 413 || code === 'too_large') return { kind: 'tooLarge', field: detail?.field ?? null }
  if (code === 'reports_closed') return { kind: 'closed' }
  return { kind: 'failed' }
}

/** The text fields a too-large refusal can name, which the form says under the field. */
export const isTextField = (field) => Object.prototype.hasOwnProperty.call(TEXT_FIELDS, field)

/** The body a report is sent as: the text trimmed of its ends, the rest as given. */
export const reportBody = (report, context = {}) => ({
  title: String(report.title ?? '').trim(),
  description: String(report.description ?? '').trim(),
  steps_to_reproduce: String(report.steps_to_reproduce ?? '').trim(),
  severity: SEVERITIES.includes(report.severity) ? report.severity : 'medium',
  category: REPORT_AREAS.includes(report.category) ? report.category : 'other',
  screenshots: report.screenshots ?? [],
  ...context
})

/**
 * What a phone sends with its report (board H): the platform, the app's
 * version with its build, and the device with its system ("Pixel 7 · Android 15").
 * No page and no browser: the API takes both as optional and the phone has neither.
 * @param {{os?: string, osVersion?: string|number, appVersion?: string, build?: string|number, model?: string}} device
 */
export const phoneContext = ({ os = 'android', osVersion, appVersion, build, model } = {}) => ({
  // The API knows `web` and `android` (FR-007); the phone ships on Android only.
  platform: 'android',
  app_version: appVersionLabel(appVersion, build),
  device: phoneDeviceLabel({ os, osVersion, model })
})

/** "Pixel 7 · Android 15": the model when the phone says it, then the system. */
export const phoneDeviceLabel = ({ os = 'android', osVersion, model } = {}) =>
  [model ? String(model).trim() : '', osLabel(os, osVersion)].filter(Boolean).join(' · ')

/** "Android 15", "iOS 17.2", or the system's name alone. */
export const osLabel = (os, version) => {
  const name = os === 'ios' ? 'iOS' : 'Android'
  return version != null && String(version).trim() ? `${name} ${version}` : name
}

/** "1.0 (31)": the app's version and its build, either alone when the other is unknown. */
export const appVersionLabel = (version, build) => {
  const parts = [version ? String(version) : null, build != null && String(build) ? `(${build})` : null].filter(Boolean)
  return parts.join(' ')
}

/* ── The admin's side (board C) ─────────────────────────────────────────── */

/** The colour of a severity's dot: critical danger, high warning, the rest neutral. */
export const severityTone = (severity) => {
  if (severity === 'critical') return 'danger'
  if (severity === 'high') return 'warning'
  return 'neutral'
}

/** Whether a report came from the phone app rather than a browser. */
export const isAppReport = (bug) => bug?.platform === 'android' || bug?.platform === 'ios'

const majorVersion = (version) => {
  const text = String(version ?? '').trim()
  if (!text || text.toLowerCase() === 'unknown') return ''
  return text.split('.')[0]
}

const known = (value) => {
  const text = String(value ?? '').trim()
  return text && text.toLowerCase() !== 'unknown' ? text : ''
}

/** A row's device, short: `{os: 'Android', browser: 'Chrome'}` for the web, `{app: true, os}` for the phone. */
export const bugDevice = (bug) => {
  const info = bug?.browser_info ?? {}
  if (isAppReport(bug)) return { app: true, os: bug.platform === 'ios' ? 'iOS' : 'Android' }
  const os = known(info.os).split(' ')[0]
  return { app: false, os, browser: known(info.name) }
}

/** "412 × 915" from the "412x915" the browser sent, or ''. */
export const screenSize = (bug) => {
  const raw = known(bug?.screen_size || bug?.browser_info?.screen_resolution)
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(raw)
  return match ? `${match[1]} × ${match[2]}` : raw
}

/**
 * The detail card's facts after "Reported 2 h ago", in order: for the web the
 * system, the browser with its major version and the screen ("Android 15 ·
 * Chrome 131 · 412 × 915"); for the phone the app's version and the device.
 * `{app: false, parts}` or `{app: true, version, device}`.
 */
export const bugFacts = (bug) => {
  const info = bug?.browser_info ?? {}
  if (isAppReport(bug)) return { app: true, version: known(bug.app_version), device: known(bug.device) }
  const browser = [known(info.name), majorVersion(info.version)].filter(Boolean).join(' ')
  return { app: false, parts: [known(info.os), browser, screenSize(bug)].filter(Boolean) }
}

const time = (value) => {
  const ms = apiTime(value)
  return Number.isNaN(ms) ? 0 : ms
}

/** A report's notes, oldest first, the way a history reads. */
export const notesOldestFirst = (bug) => [...(bug?.notes ?? [])].sort((a, b) => time(a.at) - time(b.at))

/** Whether a note was written by the account reading it. */
export const isOwnNote = (note, user) => {
  if (!note?.by || !user) return false
  const mine = [user.id, user._id, user.uid, user.firebase_uid, user.username, user.email].filter(Boolean).map(String)
  return mine.includes(String(note.by))
}

/**
 * What Save sends (board C): the status when it changed, the note when it
 * says something; null when there is nothing to save.
 */
export const bugChanges = (bug, draft) => {
  const changes = {}
  if (draft?.status && BUG_STATUSES.includes(draft.status) && draft.status !== bug?.status) changes.status = draft.status
  const note = String(draft?.note ?? '').trim()
  if (note) changes.note = note.slice(0, REPORT_LIMITS.text)
  return Object.keys(changes).length ? changes : null
}

/** The counts per state, zero for a state the answer left out. */
export const statusCounts = (stats) =>
  Object.fromEntries(BUG_STATUSES.map((status) => [status, Math.max(0, Number(stats?.by_status?.[status]) || 0)]))

/** The report to select: the selected one while it is listed, otherwise the first; null on an empty list. */
export const nextBugSelection = (bugs, selectedId) => {
  if (!bugs?.length) return null
  if (selectedId && bugs.some((bug) => bug.id === selectedId)) return selectedId
  return bugs[0].id
}
