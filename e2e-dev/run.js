/**
 * One command (E2E-002, FR-042):
 *
 *   npm run e2e:dev             every scenario, then the report
 *   npm run e2e:dev -- smoke    the smoke run only
 *
 * The report is written to e2e-dev/out/report.html.
 */
const { spawnSync } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const smoke = args[0] === 'smoke'
const pw = ['playwright', 'test', '--config', path.join(__dirname, 'playwright.config.js'), ...(smoke ? ['00-smoke'] : args)]
const result = spawnSync('npx', pw, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
spawnSync('node', [path.join(__dirname, 'report.js')], { stdio: 'inherit' })
process.exit(result.status ?? 1)
