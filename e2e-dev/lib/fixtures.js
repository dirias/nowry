/**
 * The suite's `test`: every browser request to dev.nowry.app carries Vercel's
 * automation bypass as headers (never a query parameter), and nothing else does.
 * The secret never appears in a URL, a log, a trace or the report.
 */
const base = require('@playwright/test')
const { secrets } = require('./secrets')
const { SITE_HOSTS, API_HOST } = require('./env')

async function withBypass(context) {
  const { bypass, outboxKey } = secrets()
  await context.route('**/*', async (route) => {
    const request = route.request()
    let host = ''
    try {
      host = new URL(request.url()).host
    } catch {
      // a data: or blob: URL
    }
    if (SITE_HOSTS.has(host)) {
      return route.continue({
        headers: { ...request.headers(), 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
      })
    }
    // The development API alone hears the outbox key: the suite's requests skip the per-network limit (E2E-007).
    if (host === API_HOST && request.method() !== 'OPTIONS') {
      return route.continue({ headers: { ...request.headers(), 'x-dev-outbox-key': outboxKey } })
    }
    return route.continue()
  })
  return context
}

const test = base.test.extend({
  context: async ({ context }, use) => {
    await use(await withBypass(context))
  }
})

/** A page that lives across the steps of a serial scenario, with the same bypass. */
async function sharedPage(browser) {
  const context = await withBypass(
    await browser.newContext({ baseURL: require('./env').SITE, locale: 'en-US', viewport: { width: 1280, height: 860 } })
  )
  return context.newPage()
}

module.exports = { test, expect: base.expect, withBypass, sharedPage }
