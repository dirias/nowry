/** The commits a run tests, read when it starts (not when the report is built). */
const { execFileSync } = require('child_process')
const { API_ROOT, WEB_ROOT } = require('./secrets')

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: WEB_ROOT }).toString().trim()
  } catch {
    return '?'
  }
}

function deployed(environment) {
  try {
    const list = JSON.parse(
      execFileSync('railway', ['deployment', 'list', '--environment', environment, '--service', 'Nowry', '--json'], {
        cwd: API_ROOT
      }).toString()
    )
    return (list.find((d) => d.status === 'SUCCESS')?.meta?.commitHash || '?').slice(0, 7)
  } catch {
    return '?'
  }
}

function commits(target) {
  try {
    execFileSync('git', ['fetch', '-q', 'origin'], {
      cwd: WEB_ROOT,
      env: { ...process.env, GIT_SSH_COMMAND: 'ssh -i ~/.ssh/id_rsa_personal -o IdentitiesOnly=yes' }
    })
  } catch {
    // the last fetched state is used
  }
  return target === 'prod'
    ? { web: git('rev-parse', '--short', 'origin/main'), webRef: 'origin/main', api: deployed('Production'), apiEnv: 'Production' }
    : { web: git('rev-parse', '--short', 'origin/dev'), webRef: 'origin/dev', api: deployed('development'), apiEnv: 'development' }
}

module.exports = { commits }
