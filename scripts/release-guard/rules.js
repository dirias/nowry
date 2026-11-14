/**
 * The release rule's decisions (ADR-093), with no git and no network in them.
 * `scripts/release-guard.js` gathers the facts and asks here.
 */

const TASK_ID = /\b[A-Z][A-Z0-9]*-\d{3}\b/g

/** Every task id named in these commit subjects, once each, sorted. */
const taskIds = (subjects) => [...new Set(subjects.flatMap((subject) => subject.match(TASK_ID) ?? []))].sort()

/**
 * May `main` fast-forward to what the suite tested?
 *
 * @param {object} facts
 * @param {object|null} facts.run  the last full run: `{ passed, full, failed, total, commits }`
 * @param {Array<{name, target, mainIsAncestor, onDev, mainAfter}>} facts.repos
 * @param {string[]} facts.held  task ids, or prefixes (`IMPORT`), that may not be released
 * @param {string[]} facts.ids   the task ids in the range being released
 * @returns {{ ok: boolean, reasons: string[] }}
 */
function verdict({ run, repos, held, ids }) {
  const reasons = []
  if (!run) reasons.push('no full suite run is recorded (npm run e2e:dev, every scenario)')
  else {
    if (!run.full) reasons.push('the last run recorded was not a full run')
    if (!run.passed || run.failed > 0) reasons.push(`the last full run did not pass (${run.failed ?? '?'} failed)`)
    if (!(run.total > 0)) reasons.push('the last full run ran no tests')
  }
  for (const repo of repos) {
    if (!repo.target || repo.target === '?') {
      reasons.push(`${repo.name}: the run does not say which commit it tested`)
      continue
    }
    if (!repo.onDev) reasons.push(`${repo.name}: ${repo.target} is not on origin/dev`)
    if (!repo.mainIsAncestor) reasons.push(`${repo.name}: main is not an ancestor of ${repo.target}, so this is not a fast-forward`)
    if (repo.mainAfter !== repo.target) reasons.push(`${repo.name}: main would end on ${repo.mainAfter}, not on the tested ${repo.target}`)
  }
  const blocked = ids.filter((id) => held.some((hold) => id === hold || id.startsWith(`${hold}-`)))
  if (blocked.length) reasons.push(`held tasks in the range: ${blocked.join(', ')}`)
  return { ok: reasons.length === 0, reasons }
}

module.exports = { taskIds, verdict }
