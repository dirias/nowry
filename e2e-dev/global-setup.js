const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { FILE } = require('./lib/run')
const { commits } = require('./lib/commits')

module.exports = async () => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  const run = crypto.randomBytes(4).toString('hex')
  fs.writeFileSync(FILE, JSON.stringify({ run, started: new Date().toISOString(), commits: commits('dev') }))
  process.stdout.write(`dev suite run ${run}\n`)
}
