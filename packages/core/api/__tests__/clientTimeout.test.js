/**
 * A call that asks for its own timeout keeps it.
 *
 * The request interceptor assigned `config.timeout = env.apiTimeout`
 * unconditionally, which discarded every per-request timeout in the package —
 * and eight services pass one, because they wait on a model: 60 seconds for a
 * chat reply, 120 for generating cards from a document, 360 for a video. All of
 * them ran on the 10-second default and failed with `ECONNABORTED` and no
 * response, which is a failure carrying nothing that explains it.
 *
 * This reads the interceptor's rule rather than the network: what matters is
 * which value survives, and that is decided in one branch.
 */
const fs = require('fs')
const path = require('path')

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.js'), 'utf8')

/** The rule as the interceptor writes it, comments stripped. */
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the request timeout', () => {
  it('is never assigned over a value the caller set', () => {
    expect(code).not.toMatch(/^\s*config\.timeout\s*=\s*env\.apiTimeout/m)
  })

  it('falls back to the environment when nothing asked', () => {
    expect(code).toMatch(/if\s*\(!config\.timeout\)\s*config\.timeout\s*=\s*env\.apiTimeout/)
  })

  it('is still asked for by the services that wait on a model', () => {
    const services = path.join(__dirname, '..', 'services')
    const asking = fs
      .readdirSync(services)
      .filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
      .filter((file) => /timeout:\s*\d+/.test(fs.readFileSync(path.join(services, file), 'utf8')))

    // If this ever drops to zero the rule above has nothing to protect, and the
    // test is measuring itself rather than the code.
    expect(asking.length).toBeGreaterThan(2)
  })
})
