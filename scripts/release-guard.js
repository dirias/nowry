#!/usr/bin/env node
/**
 * The release guard (ADR-093). Run before every release, from `nowry/`:
 *
 *   node scripts/release-guard.js          check, and print what would be released
 *   node scripts/release-guard.js --push   check, then fast-forward both mains
 *
 * `main` may only fast-forward, in both repositories, to the commits the last
 * FULL dev suite run tested and passed (`e2e-dev/out/full-run.json`). It
 * refuses otherwise, and prints why. Held task ids or prefixes go in
 * `e2e-dev/release-hold.json` (an array); none should be needed while
 * unfinished work stays on feature branches.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { taskIds, verdict } = require('./release-guard/rules')

const WEB_ROOT = path.resolve(__dirname, '..')
const API_ROOT = path.resolve(WEB_ROOT, '../Nowry-API')
const SSH = { ...process.env, GIT_SSH_COMMAND: 'ssh -i ~/.ssh/id_rsa_personal -o IdentitiesOnly=yes' }
const push = process.argv.includes('--push')

const git = (cwd, ...args) => execFileSync('git', args, { cwd, env: SSH }).toString().trim()
const tryGit = (cwd, ...args) => {
  try {
    return git(cwd, ...args)
  } catch {
    return null
  }
}
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const run = readJson(path.join(WEB_ROOT, 'e2e-dev/out/full-run.json'), null)
const held = readJson(path.join(WEB_ROOT, 'e2e-dev/release-hold.json'), [])

function inspect(name, cwd, short) {
  git(cwd, 'fetch', '-q', 'origin')
  const target = short ? tryGit(cwd, 'rev-parse', '--verify', `${short}^{commit}`) : null
  const main = git(cwd, 'rev-parse', 'origin/main')
  const ancestor = target ? tryGit(cwd, 'merge-base', '--is-ancestor', main, target) !== null : false
  const onDev = target ? tryGit(cwd, 'merge-base', '--is-ancestor', target, 'origin/dev') !== null : false
  const subjects = target && ancestor ? git(cwd, 'log', '--format=%s', `${main}..${target}`).split('\n').filter(Boolean) : []
  // A fast-forward leaves main exactly on the target; anything else would not be what the suite tested.
  return { name, cwd, target, short, main, mainIsAncestor: ancestor, onDev, mainAfter: ancestor ? target : main, subjects }
}

const repos = [inspect('web', WEB_ROOT, run?.commits?.web), inspect('api', API_ROOT, run?.commits?.api)]
const ids = taskIds(repos.flatMap((repo) => repo.subjects))
const { ok, reasons } = verdict({ run, repos, held, ids })

console.log(`Last full run: ${run ? `${run.run} · ${run.passed ? 'passed' : 'FAILED'} · ${run.total} tests · ${run.finishedAt}` : 'none'}`)
for (const repo of repos) {
  const count = repo.subjects.length
  console.log(
    `${repo.name}: main ${repo.main.slice(0, 8)} → tested ${repo.target ? repo.target.slice(0, 8) : '?'} (${count} commit${count === 1 ? '' : 's'})`
  )
}
console.log(`Tasks in this release: ${ids.length ? ids.join(', ') : 'none named'}`)

if (!ok) {
  console.error('\nREFUSED:')
  for (const reason of reasons) console.error(`  - ${reason}`)
  process.exit(1)
}
console.log('\nThe guard passes.')

if (!push) {
  for (const repo of repos) console.log(`  (${repo.name}) git push origin ${repo.target}:refs/heads/main`)
  console.log('Run again with --push to fast-forward both mains.')
  process.exit(0)
}
for (const repo of repos) {
  if (repo.main === repo.target) {
    console.log(`${repo.name}: main is already at the tested commit`)
    continue
  }
  // Never forced: git itself refuses anything that is not a fast-forward.
  git(repo.cwd, 'push', 'origin', `${repo.target}:refs/heads/main`)
  const now = git(repo.cwd, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0]
  if (now !== repo.target) {
    console.error(`${repo.name}: main is ${now}, not the tested ${repo.target}`)
    process.exit(1)
  }
  console.log(`${repo.name}: main fast-forwarded to ${repo.target.slice(0, 8)}`)
}
