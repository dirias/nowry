/** The public pages in five languages, and the footer's links (shared with the production check). */
const { test, expect } = require('../lib/fixtures')
const { publicChecks } = require('../lib/publicChecks')

publicChecks(test, expect)
