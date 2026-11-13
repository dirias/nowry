/** The emails the development API rendered (ADR-090), read with the outbox key. */
const { api } = require('./api')
const { secrets } = require('./secrets')

async function emails(to, kind) {
  const client = await api()
  const response = await client.get('/dev/outbox', {
    params: { to, ...(kind ? { kind } : {}), limit: 50 },
    headers: { 'X-Dev-Outbox-Key': secrets().outboxKey }
  })
  if (!response.ok()) throw new Error(`outbox: ${response.status()} (is DEV_OUTBOX on for development?)`)
  return (await response.json()).items
}

/** Wait for at least `count` emails of a kind to an address; newest first. */
async function waitForEmails(to, kind, { count = 1, timeoutMs = 60000, since } = {}) {
  const started = Date.now()
  for (;;) {
    const found = (await emails(to, kind)).filter((item) => !since || new Date(item.created_at) >= since)
    if (found.length >= count) return found
    if (Date.now() - started > timeoutMs) throw new Error(`outbox: ${count} × ${kind} to ${to} did not arrive in ${timeoutMs / 1000}s`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

/** The first link in an email's text that contains `fragment`. */
const linkIn = (email, fragment) => {
  const link = (email.text.match(/https?:\/\/\S+/g) || []).find((url) => url.includes(fragment))
  if (!link) throw new Error(`outbox: no ${fragment} link in ${email.kind}`)
  return link
}

module.exports = { emails, waitForEmails, linkIn }
