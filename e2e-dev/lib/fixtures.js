/**
 * The suite's `test`: every browser request to dev.nowry.app carries Vercel's
 * automation bypass as headers (never a query parameter), and nothing else does.
 * The secret never appears in a URL, a log, a trace or the report.
 */
const base = require('@playwright/test')
const { secrets } = require('./secrets')
const { SITE_HOSTS } = require('./env')

const test = base.test.extend({
  context: async ({ context }, use) => {
    const { bypass } = secrets()
    await context.route('**/*', async (route) => {
      const request = route.request()
      let host = ''
      try {
        host = new URL(request.url()).host
      } catch {
        // a data: or blob: URL
      }
      if (!SITE_HOSTS.has(host)) return route.continue()
      return route.continue({
        headers: { ...request.headers(), 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
      })
    })
    await use(context)
  }
})

module.exports = { test, expect: base.expect }
