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
const { spawnSync } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const smoke = args[0] === 'smoke'
const prod = args[0] === 'prod'
const config = path.join(__dirname, prod ? 'prod-check.config.js' : 'playwright.config.js')
const pw = ['playwright', 'test', '--config', config, ...(smoke ? ['00-smoke'] : prod ? [] : args)]
const result = spawnSync('npx', pw, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
spawnSync('node', [path.join(__dirname, 'report.js')], { stdio: 'inherit' })
process.exit(result.status ?? 1)
