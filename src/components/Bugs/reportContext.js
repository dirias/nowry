import imageCompression from 'browser-image-compression'
import { SCREENSHOT_TYPES, screenshotProblem } from '@nowry/core/domain/bugReports'

/**
 * The browser's side of a bug report (BUG-001, ADMIN-008a; FR-007, FR-008):
 * screenshots made smaller before they leave, and what the report says about
 * where it was written.
 */

/** As the editor shrinks its images (FR-008), small enough that three fit the 7 MB body. */
export const SHRINK = { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true }

/** An error a screenshot is refused with: `code` is 'type', 'tooLarge' or 'unreadable'. */
const refusal = (code) => Object.assign(new Error(`screenshot ${code}`), { code })

/**
 * A picked file as the report sends it, `{filename, data, uploaded_at}`, made
 * smaller first; PNG, JPEG or WebP only, and at most 2 MB once decoded. When the
 * first pass leaves it too large, a second one turns it into a JPEG.
 */
export async function shrinkScreenshot(file) {
  if (!file || !SCREENSHOT_TYPES.includes(file.type)) throw refusal('type')
  let data
  try {
    data = await imageCompression.getDataUrlFromFile(await imageCompression(file, SHRINK))
    if (screenshotProblem(data) === 'tooLarge') {
      data = await imageCompression.getDataUrlFromFile(await imageCompression(file, { ...SHRINK, fileType: 'image/jpeg' }))
    }
  } catch {
    throw refusal('unreadable')
  }
  const problem = screenshotProblem(data)
  if (problem) throw refusal(problem)
  return { filename: file.name, data, uploaded_at: new Date().toISOString() }
}

const BROWSERS = [
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /OPR\/([\d.]+)/],
  ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari/]
]

/** The browser and its version from a user agent: `{name, version}`, 'Unknown' when it cannot say. */
export const browserFrom = (ua = '') => {
  const found = BROWSERS.find(([, pattern]) => pattern.test(ua))
  return found ? { name: found[0], version: found[1].exec(ua)[1] } : { name: 'Unknown', version: 'Unknown' }
}

/** The system and its version from a user agent: "Android 15", "iOS 17.2", "macOS 10.15", "Windows 10". */
export const osFrom = (ua = '') => {
  const android = /Android\s([\d.]+)/.exec(ua)
  if (android) return `Android ${android[1]}`
  const ios = /(?:iPhone|iPad|iPod).*?OS\s([\d_]+)/.exec(ua)
  if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`
  const mac = /Mac OS X\s([\d_.]+)/.exec(ua)
  if (mac) return `macOS ${mac[1].replace(/_/g, '.')}`
  const windows = /Windows NT\s([\d.]+)/.exec(ua)
  if (windows) return `Windows ${windows[1] === '10.0' ? '10' : windows[1]}`
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

/** What a web report says about where it was written: the page, the browser, the system and the screen. */
export const browserContext = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const browser = browserFrom(ua)
  const os = osFrom(ua)
  const screen = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : 'Unknown'
  return {
    platform: 'web',
    app_version: '',
    device: os,
    url: typeof window !== 'undefined' ? window.location.pathname : '/',
    browser_info: { name: browser.name, version: browser.version, os, screen_resolution: screen }
  }
}
