/**
 * Which Firebase project a build's native config belongs to (PLAY-001).
 *
 * Every build named `mobile/google-services.json`, which on this Mac is the
 * DEVELOPMENT project's (nowry-88f05) and git-ignored, so EAS never packed it:
 * store builds 27–29 carried no native Firebase file at all. Production builds
 * now take theirs from `GOOGLE_SERVICES_JSON` (the EAS variable for cloud
 * builds; the shell for a local one, see EAS-SECRETS.md); without it (a dev
 * build, the emulator) the local file is used as before.
 */
const path = require('path')

const CONFIG = path.join(__dirname, '..', '..', 'app.config.js')
const load = (env = {}) => {
  const saved = { ...process.env }
  Object.assign(process.env, env)
  for (const key of Object.keys(saved)) if (!(key in env) && key === 'GOOGLE_SERVICES_JSON') delete process.env[key]
  jest.resetModules()
  try {
    return require(CONFIG)().expo
  } finally {
    process.env = saved
  }
}

describe('the native Firebase config a build carries', () => {
  it('takes the production file from the EAS file variable when it is set', () => {
    const config = load({ GOOGLE_SERVICES_JSON: '/tmp/eas/google-services.prod.json' })
    expect(config.android.googleServicesFile).toBe('/tmp/eas/google-services.prod.json')
  })

  it('keeps the local file for every build without it', () => {
    delete process.env.GOOGLE_SERVICES_JSON
    const config = load({})
    // CI has no local file (it is git-ignored), and then a build names none.
    const local = require('fs').existsSync(path.join(__dirname, '..', '..', 'google-services.json'))
    expect(config.android.googleServicesFile).toBe(local ? './google-services.json' : undefined)
  })
})

describe('the Google client IDs a build carries', () => {
  it("reads them from the build's environment, per platform", () => {
    const config = load({
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: '920627471560-android.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: '920627471560-web.apps.googleusercontent.com'
    })
    expect(config.extra.googleClientIdAndroid).toBe('920627471560-android.apps.googleusercontent.com')
    expect(config.extra.googleClientIdWeb).toBe('920627471560-web.apps.googleusercontent.com')
  })
})
