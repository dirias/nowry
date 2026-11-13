/** One run id per suite run, so every alias, row and cleanup belongs to this run. */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '../out/run.json')

const runId = () => JSON.parse(fs.readFileSync(FILE, 'utf8')).run

/** `rikydier+e2e-<run>-<case>@gmail.com`: an allow-listed alias of one mailbox. */
const alias = (name) => `rikydier+e2e-${runId()}-${name}@gmail.com`

module.exports = { FILE, runId, alias }
