const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { FILE } = require('./lib/run')

module.exports = async () => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  const run = crypto.randomBytes(4).toString('hex')
  fs.writeFileSync(FILE, JSON.stringify({ run, started: new Date().toISOString() }))
  process.stdout.write(`dev suite run ${run}\n`)
}
