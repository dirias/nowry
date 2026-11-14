/**
 * BUG-001 (FR-007, FR-008, board H) — the phone's "Report a problem".
 *
 * Nothing here renders (see jest.config.js): the answers are a plain module,
 * the device is read through a mocked platform, and the screens' wiring is
 * read from their source, as the rest of this client's tests do.
 */
const fs = require('fs')
const path = require('path')

jest.mock(
  'react-native',
  () => ({ Platform: { OS: 'android', Version: 35, constants: { Release: '15', Manufacturer: 'Google', Model: 'Pixel 7' } } }),
  {
    virtual: true
  }
)
jest.mock(
  'expo-constants',
  () => ({ __esModule: true, default: { expoConfig: { version: '1.0' }, platform: { android: { versionCode: 31 } } } }),
  {
    virtual: true
  }
)

const { reportAnswerKey } = require('../reportAnswer')
const { deviceInfo } = require('../../platform/deviceInfo')
const { phoneContext, phoneDeviceLabel, appVersionLabel } = require('@nowry/core/domain/bugReports')

const ROOT = path.resolve(__dirname, '../../..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('the answers', () => {
  it('says the refusals and nothing for a report that went', () => {
    expect(reportAnswerKey(null)).toBeNull()
    expect(reportAnswerKey({ kind: 'sent' })).toBeNull()
    expect(reportAnswerKey({ kind: 'dailyLimit', retryAt: 'x' })).toBe('report.answers.dailyLimit')
    expect(reportAnswerKey({ kind: 'tooLarge', field: 'body' })).toBe('report.answers.tooLarge')
    expect(reportAnswerKey({ kind: 'closed' })).toBe('report.answers.closed')
    expect(reportAnswerKey({ kind: 'failed' })).toBe('report.answers.failed')
    expect(reportAnswerKey({ kind: 'odd' })).toBe('report.answers.failed')
  })
})

describe('what the phone attaches', () => {
  it('reads the system, the model and the app version with its build from the platform', () => {
    const device = deviceInfo()
    expect(device).toEqual({ os: 'android', osVersion: '15', model: 'Google Pixel 7', appVersion: '1.0', build: 31 })
    expect(phoneContext(device)).toEqual({ platform: 'android', app_version: '1.0 (31)', device: 'Google Pixel 7 · Android 15' })
    expect(phoneDeviceLabel(device)).toBe('Google Pixel 7 · Android 15')
    expect(appVersionLabel(device.appVersion, device.build)).toBe('1.0 (31)')
  })
})

describe('the wiring', () => {
  const profile = read('src/screens/Profile.js')
  const screen = read('src/screens/ReportProblem.js')

  it('shows the Help row only while the beta is on, to a signed-in account, and opens the form', () => {
    expect(profile).toMatch(/if \(!canReport\(user, beta\)\) return null/)
    expect(profile).toMatch(/<HelpGroup \/>/)
    expect(profile).toMatch(/router\.push\('\/report-problem'\)/)
    expect(profile).toMatch(/t\('report\.help'\)/)
    expect(profile).toMatch(/t\('report\.menu'\)/)
  })

  it('is a pushed route in the tab group with the app bar’s way back', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/(tabs)/report-problem.js'))).toBe(true)
    expect(read('app/(tabs)/_layout.js')).toMatch(/<Tabs\.Screen name='report-problem' options=\{\{ href: null \}\} \/>/)
    expect(read('src/ui/patterns/AppBar.js')).toMatch(/PUSHED_IN_TABS = \[[^\]]*'report-problem'/)
  })

  it('sends the text with the device, thanks the tester and goes back; no screenshots', () => {
    expect(screen).toMatch(/report\.send\(reportBody\(form, phoneContext\(device\)\)\)/)
    expect(screen).toMatch(/notify\(t\('report\.answers\.sent'\), 'success'\)/)
    expect(screen).toMatch(/router\.back\(\)/)
    expect(screen).toMatch(/maxLength=\{fieldLimit\(field\)\}/)
    expect(screen).toMatch(/accessibilityLiveRegion='polite'/)
    expect(screen).not.toMatch(/ImagePicker|screenshots:/)
  })

  it('draws the area as chips, Cancel then Send report', () => {
    expect(screen).toMatch(/REPORT_AREAS\.map/)
    expect(screen.indexOf("t('common.cancel')")).toBeLessThan(screen.indexOf("t('report.send')"))
  })
})
