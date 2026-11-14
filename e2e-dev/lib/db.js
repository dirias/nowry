/**
 * The database, read through `scripts/e2e_dev.py` with `railway run` on
 * development (ADR-090). The helper itself refuses any other database and any
 * address that is not a suite alias.
 *
 * `railway run` itself sometimes exits before the helper prints anything (a
 * network or CLI hiccup, seen in the full run of 2026-11-14 11:10 UTC). Such a
 * call — no answer at all — is tried once more; a refusal from the helper is not.
 */
const { execFile } = require('child_process')
const { API_ROOT } = require('./secrets')

const NO_ANSWER = 'no answer'

const once = (args) =>
  new Promise((resolve, reject) => {
    execFile(
      'railway',
      ['run', '--environment', 'development', '--service', 'Nowry', '--', '.venv/bin/python', '-m', 'scripts.e2e_dev', ...args.map(String)],
      { cwd: API_ROOT, timeout: 120000, maxBuffer: 1 << 20 },
      (error, stdout) => {
        const line =
          String(stdout || '')
            .trim()
            .split('\n')
            .pop() || ''
        let parsed = null
        try {
          parsed = JSON.parse(line)
        } catch {
          // fall through
        }
        if (!parsed) return reject(new Error(`db ${args[0]}: ${NO_ANSWER}${error ? ` (${error.code})` : ''}`))
        if (!parsed.ok) return reject(new Error(`db ${args[0]}: ${parsed.error}`))
        resolve(parsed)
      }
    )
  })

const db = async (...args) => {
  try {
    return await once(args)
  } catch (error) {
    if (!String(error.message).includes(NO_ANSWER)) throw error
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return once(args)
  }
}

module.exports = { db }
