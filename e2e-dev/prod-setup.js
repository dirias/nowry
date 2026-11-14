/** The production check records what it tests before it starts. */
const fs = require('fs')
const path = require('path')
const { commits } = require('./lib/commits')

module.exports = async () => {
  const out = path.join(__dirname, 'out')
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'prod-run.json'), JSON.stringify({ started: new Date().toISOString(), commits: commits('prod') }))
}
