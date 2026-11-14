/**
 * The report (E2E-004, E2E-008): the production check after the last release
 * and the last dev suite run, each with the commits it tested (recorded when
 * it started), pass or fail per scenario, failure screenshots, and what still
 * needs a person. Any secret that reaches this file is replaced before it is
 * written.
 */
const fs = require('fs')
const path = require('path')
const { secrets } = require('./lib/secrets')

const OUT = path.join(__dirname, 'out')
const read = (name) => {
  const file = path.join(OUT, name)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
}
const hidden = Object.values(secrets()).filter(Boolean)
const scrub = (text) => hidden.reduce((acc, value) => acc.split(value).join('[hidden]'), String(text ?? ''))
const esc = (text) => scrub(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const label = (type) => ({ skip: 'Skipped', finding: 'Finding', observation: 'Observation' })[type] || type

function rowsOf(results) {
  const rows = []
  const walk = (suite, file) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const last = t.results[t.results.length - 1] || {}
        const shot = (last.attachments || []).find((a) => a.contentType === 'image/png' && a.path && fs.existsSync(a.path))
        rows.push({
          title: spec.title,
          file: file || suite.file,
          status: last.status || 'skipped',
          ms: last.duration || 0,
          error: last.error ? (last.error.message || '').split('\n').slice(0, 4).join('\n') : '',
          notes: (t.annotations || []).filter((a) => a.description).map((a) => `${label(a.type)}: ${a.description}`),
          shot: shot ? fs.readFileSync(shot.path).toString('base64') : null
        })
      }
    }
    for (const child of suite.suites || []) walk(child, child.file || file)
  }
  for (const suite of (results && results.suites) || []) walk(suite, suite.file)
  return rows
}

const tally = (rows) => {
  const passed = rows.filter((r) => r.status === 'passed').length
  const failed = rows.filter((r) => r.status !== 'passed' && r.status !== 'skipped').length
  return { passed, failed, skipped: rows.length - passed - failed }
}
const pill = (s) =>
  `<span class="pill ${s === 'passed' ? 'ok' : s === 'skipped' ? 'soft' : 'bad'}">${s === 'passed' ? 'Pass' : s === 'skipped' ? 'Skipped' : 'Fail'}</span>`
const table = (title, list) =>
  list.length
    ? `<h3>${title}</h3><div class="tablewrap"><table><tr><th>Scenario</th><th>Result</th><th>Time</th></tr>${list
        .map(
          (r) =>
            `<tr><td>${esc(r.title.replace(/^\[\w+\]\s*/, ''))}<div class="muted small">${esc(path.basename(r.file || ''))}</div>${
              r.error ? `<pre>${esc(r.error)}</pre>` : ''
            }${r.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}${
              r.shot ? `<img alt="Screenshot at the failure" src="data:image/png;base64,${r.shot}">` : ''
            }</td><td>${pill(r.status)}</td><td class="num">${(r.ms / 1000).toFixed(1)} s</td></tr>`
        )
        .join('')}</table></div>`
    : ''
const facts = (c, site) =>
  `<div class="facts"><span><b>Web</b> <code>${esc(c?.web || '?')}</code> (${esc(c?.webRef || '?')})</span><span><b>API</b> <code>${esc(
    c?.api || '?'
  )}</code> (running on ${esc(c?.apiEnv || '?')})</span><span><b>Site</b> ${esc(site)}</span></div>`
const headline = (t, n) =>
  t.failed ? `${t.failed} of ${n} failed` : t.skipped ? `${t.passed} of ${n} passed, ${t.skipped} skipped` : `All ${n} passed`

const devResults = read('results.json')
const devRun = read('run.json')
const prodResults = read('prod-results.json')
const prodRun = read('prod-run.json')
const devRows = rowsOf(devResults)
const prodRows = rowsOf(prodResults)
const devT = tally(devRows)
const prodT = tally(prodRows)

const prodSection = prodResults
  ? `<section><span class="muted small">Production check after the release · ${esc(new Date(prodRun?.started || Date.now()).toUTCString())}</span>
<h2>nowry.app: ${headline(prodT, prodRows.length)}</h2>
<p class="muted">As a visitor sees it: no account made and nothing written. The waitlist step uses demo@nowry.app, the Play reviewer account, which the API writes at most once a day; that letter lands in the support mailbox.</p>
${facts(prodRun?.commits, 'https://www.nowry.app')}
${table('Checks', prodRows)}</section>`
  : ''

const group = (title) => (title.startsWith('[smoke]') ? 'Smoke' : title.startsWith('[edge]') ? 'Edge cases' : 'Happy paths')
const devSection = devResults
  ? `<section><span class="muted small">Dev end-to-end suite · run ${esc(devRun?.run || '?')} · ${esc(new Date(devRun?.started || Date.now()).toUTCString())}</span>
<h2>dev.nowry.app: ${headline(devT, devRows.length)}</h2>
<p class="muted">Against dev.nowry.app and the development API through Vercel's automation bypass. Accounts made by the run were removed at the end.</p>
${facts(devRun?.commits, 'https://www.dev.nowry.app')}
${['Smoke', 'Happy paths', 'Edge cases']
  .map((g) =>
    table(
      g,
      devRows.filter((r) => group(r.title) === g)
    )
  )
  .join('')}</section>`
  : ''

const limits = [
  "The suite's own addresses (rikydier+e2e-) are kept in the dev outbox and never sent, so a run spends none of the development email allowance (E2E-005).",
  "On development, the suite's requests skip the per-network verification limit; every other address keeps it, and one scenario shows it (E2E-007)."
]
const manual = [
  'Google sign-in, and Google re-authentication before deleting (the popup on the web, the native sheet on the phone).',
  'The Google-only reset message, with a real Google account.',
  'How the emails look in a real inbox: Gmail on the web and in the app, light and dark.',
  'The phone app on a device.',
  "Instagram's and TikTok's in-app browsers on nowry.app."
]

const total = prodT.failed + devT.failed
const html = `<title>Nowry Dev Suite</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<style>
:root{--bg:#fcfbf8;--surface:#f8f5f1;--line:#e8e5dd;--fg:#142023;--muted:#5b6568;--ok:#005a2b;--okbg:#e0f5e5;--bad:#8d0c0d;--badbg:#ffe9e5;--soft:#3e4a4d;--softbg:#f2efe8;--gold:#f5b63b}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#021114;--surface:#091c1e;--line:#1f3234;--fg:#edebe7;--muted:#a09e9a;--ok:#c1eacb;--okbg:#193521;--bad:#ffd2cb;--badbg:#47211c;--soft:#bfbdb9;--softbg:#1b2e30;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#021114;--surface:#091c1e;--line:#1f3234;--fg:#edebe7;--muted:#a09e9a;--ok:#c1eacb;--okbg:#193521;--bad:#ffd2cb;--badbg:#47211c;--soft:#bfbdb9;--softbg:#1b2e30;color-scheme:dark}
*{box-sizing:border-box}body{background:var(--bg);color:var(--fg);font:15px/1.55 Inter,-apple-system,sans-serif}
.page{max-width:960px;margin:0 auto;padding-block:36px 72px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:28px}
section{display:flex;flex-direction:column;gap:12px;min-width:0}
h1{margin:0;font-size:32px;line-height:1.15}h2{margin:0;font-size:22px}h3{margin:10px 0 0;font-size:16px}
.verdict{border-left:4px solid var(--gold);padding:2px 0 2px 16px;font-size:17px;max-width:68ch;margin:0}
.facts{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px 16px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;min-width:560px}
th,td{text-align:left;vertical-align:top;padding:10px 14px;border-bottom:1px solid var(--line)}th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:var(--surface)}tr:last-child td{border-bottom:0}
.pill{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px}.ok{background:var(--okbg);color:var(--ok)}.bad{background:var(--badbg);color:var(--bad)}.soft{background:var(--softbg);color:var(--soft)}
.muted{color:var(--muted)}.small{font-size:13px}.num{font-variant-numeric:tabular-nums;white-space:nowrap}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12.5px/1.5 ui-monospace,Menlo,monospace;background:var(--surface);border-radius:8px;padding:8px 10px;margin:8px 0 0}
p.note{margin:8px 0 0;font-size:13.5px;background:var(--softbg);border-radius:8px;padding:8px 10px}img{max-width:100%;border:1px solid var(--line);border-radius:8px;margin-top:8px;display:block}ul{margin:0;padding-left:20px}code{font-family:ui-monospace,Menlo,monospace;font-size:.9em}
</style>
<div class="page">
<h1>${total ? `${total} failed` : 'Everything checked passed'}</h1>
<p class="verdict">Production: ${prodResults ? `${prodT.passed} passed, ${prodT.failed} failed, ${prodT.skipped} skipped` : 'not checked yet'}. Dev suite: ${
  devResults ? `${devT.passed} passed, ${devT.failed} failed, ${devT.skipped} skipped` : 'not run yet'
}.</p>
${prodSection}${devSection}
<section><h2>Limits</h2><ul>${limits.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>
<section><h2>Needs you, by hand</h2><ul>${manual.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>
</div>`

fs.writeFileSync(path.join(OUT, 'report.html'), scrub(html))
process.stdout.write(`report: ${path.join(OUT, 'report.html')}\n`)
