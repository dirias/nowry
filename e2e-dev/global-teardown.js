/** Everything this run made goes: accounts, their rows, waitlist rows, invitations, outbox rows, Firebase users. */
const { runId } = require('./lib/run')
const { db } = require('./lib/db')

module.exports = async () => {
  if (process.env.E2E_KEEP === '1') return
  const result = await db('cleanup', runId()).catch((error) => ({ error: error.message }))
  process.stdout.write(`cleanup: ${JSON.stringify(result.removed || result)}\n`)
}
