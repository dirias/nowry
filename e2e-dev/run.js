/**
 * One command (E2E-002, FR-042):
 *
 *   npm run e2e:dev             every scenario, then the report
 *   npm run e2e:dev -- smoke    the smoke run only
 *   npm run e2e:prod            the production check after a release (no account, no email)
 *
 * The report is written to e2e-dev/out/report.html.
 *
 * One full run per clock hour from one network: a run asks for about seven
 * verification emails, and the API allows ten per caller address per hour
 * (account_email.verification_wait). A second run in the same hour finds the
 * outbox empty for its sign-ups. The smoke run asks for one.
 */
const fs = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const smoke = args[0] === 'smoke'
const prod = args[0] === 'prod'
const config = path.join(__dirname, prod ? 'prod-check.config.js' : 'playwright.config.js')
const pw = ['playwright', 'test', '--config', config, ...(smoke ? ['00-smoke'] : prod ? [] : args)]
const result = spawnSync('npx', pw, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
spawnSync('node', [path.join(__dirname, 'report.js')], { stdio: 'inherit' })

/*
 * A full run (every scenario, no filter) is what a release may rest on
 * (ADR-093): record whether it passed and which commits it tested, apart from
 * run.json and results.json, which every partial run overwrites.
 */
if (!smoke && !prod && args.length === 0) {
  const out = (name) => path.join(__dirname, 'out', name)
  let stats = {}
  let run = {}
  try {
    stats = JSON.parse(fs.readFileSync(out('results.json'), 'utf8')).stats ?? {}
    run = JSON.parse(fs.readFileSync(out('run.json'), 'utf8'))
  } catch {
    // An unreadable record is recorded as a run that did not pass.
  }
  const failed = (stats.unexpected ?? 0) + (stats.flaky ?? 0)
  const total = (stats.expected ?? 0) + failed + (stats.skipped ?? 0)
  fs.writeFileSync(
    out('full-run.json'),
    JSON.stringify(
      {
        run: run.run ?? null,
        full: true,
        passed: result.status === 0 && failed === 0,
        total,
        failed,
        commits: run.commits ?? null,
        finishedAt: new Date().toISOString()
      },
      null,
      2
    )
  )
}
process.exit(result.status ?? 1)
