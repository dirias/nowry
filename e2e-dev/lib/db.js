/**
 * The database, read through `scripts/e2e_dev.py` with `railway run` on
 * development (ADR-090). The helper itself refuses any other database and any
 * address that is not a suite alias.
 */
const { execFile } = require('child_process')
const { API_ROOT } = require('./secrets')

const db = (...args) =>
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
        if (!parsed) return reject(new Error(`db ${args[0]}: no answer${error ? ` (${error.code})` : ''}`))
        if (!parsed.ok) return reject(new Error(`db ${args[0]}: ${parsed.error}`))
        resolve(parsed)
      }
    )
  })

module.exports = { db }
