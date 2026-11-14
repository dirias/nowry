/**
 * The release rule (ADR-093), decided without git: given what the last full
 * suite run tested and where each repository's `main` and `dev` stand, may
 * `main` fast-forward to the tested commit?
 *
 *   node --test scripts/release-guard/__tests__
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { taskIds, verdict } = require('../rules')

const passed = { passed: true, full: true, failed: 0, total: 47, commits: { web: 'aaa1111', api: 'bbb2222' } }
const repo = (over = {}) => ({
  name: 'web',
  target: 'aaa1111',
  mainIsAncestor: true,
  onDev: true,
  mainAfter: 'aaa1111',
  ...over
})

test('names every task in the range once, in order', () => {
  const subjects = [
    'fix(EVO-017): the gold',
    'feat(EVO-018, EVO-019): forms',
    'Merge feat/x (EVO-018): forms',
    'test(DARK-009): the suite',
    'chore: nothing named'
  ]
  assert.deepEqual(taskIds(subjects), ['DARK-009', 'EVO-017', 'EVO-018', 'EVO-019'])
})

test('lets a fast-forward to the tested commits through', () => {
  const result = verdict({
    run: passed,
    repos: [repo(), repo({ name: 'api', target: 'bbb2222', mainAfter: 'bbb2222' })],
    held: [],
    ids: ['EVO-017']
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.reasons, [])
})

test('refuses when there is no full run, or it did not pass', () => {
  assert.equal(verdict({ run: null, repos: [repo()], held: [], ids: [] }).ok, false)
  assert.equal(verdict({ run: { ...passed, passed: false, failed: 2 }, repos: [repo()], held: [], ids: [] }).ok, false)
  assert.equal(verdict({ run: { ...passed, full: false }, repos: [repo()], held: [], ids: [] }).ok, false)
  assert.equal(verdict({ run: { ...passed, total: 0 }, repos: [repo()], held: [], ids: [] }).ok, false)
})

test('refuses a release that is not a fast-forward', () => {
  const result = verdict({ run: passed, repos: [repo({ mainIsAncestor: false })], held: [], ids: [] })
  assert.equal(result.ok, false)
  assert.match(result.reasons.join(' '), /fast-forward/)
})

test('refuses a tested commit that is not on dev', () => {
  assert.equal(verdict({ run: passed, repos: [repo({ onDev: false })], held: [], ids: [] }).ok, false)
})

test('refuses when main would differ from the commit the suite tested', () => {
  const result = verdict({ run: passed, repos: [repo({ mainAfter: 'ccc3333' })], held: [], ids: [] })
  assert.equal(result.ok, false)
  assert.match(result.reasons.join(' '), /tested/)
})

test('refuses a range that holds a held task', () => {
  const result = verdict({ run: passed, repos: [repo()], held: ['IMPORT'], ids: ['EVO-017', 'IMPORT-038'] })
  assert.equal(result.ok, false)
  assert.match(result.reasons.join(' '), /IMPORT-038/)
})
