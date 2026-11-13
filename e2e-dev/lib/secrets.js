/**
 * The suite's secrets (ADR-090). Read from `.env.e2e.local` at the web repo's
 * root, or at Nowry-API's root, never printed. The Firebase web key and the
 * development API come from the web repo's own `.env` (public values).
 */
const fs = require('fs')
const path = require('path')

const WEB_ROOT = path.resolve(__dirname, '../..')
const API_ROOT = path.resolve(WEB_ROOT, '../Nowry-API')
const CANDIDATES = [path.join(WEB_ROOT, '.env.e2e.local'), path.join(API_ROOT, '.env.e2e.local')]

const parse = (file) => {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match) out[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

let cached = null
function secrets() {
  if (cached) return cached
  const local = Object.assign({}, ...CANDIDATES.map(parse))
  const web = parse(path.join(WEB_ROOT, '.env'))
  const missing = ['VERCEL_AUTOMATION_BYPASS_SECRET', 'DEV_OUTBOX_KEY'].filter((name) => !local[name])
  if (missing.length) {
    throw new Error(
      `The dev suite needs ${missing.join(' and ')} in .env.e2e.local (web repo root or Nowry-API root). ` +
        'See .env.e2e.example. Nothing was run.'
    )
  }
  if (!web.REACT_APP_FB_API_KEY) throw new Error('The web repo .env has no REACT_APP_FB_API_KEY (the dev Firebase web key).')
  cached = Object.freeze({
    bypass: local.VERCEL_AUTOMATION_BYPASS_SECRET,
    outboxKey: local.DEV_OUTBOX_KEY,
    firebaseKey: web.REACT_APP_FB_API_KEY
  })
  return cached
}

module.exports = { secrets, WEB_ROOT, API_ROOT }
