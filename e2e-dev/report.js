/**
 * The run's report (E2E-004): pass or fail per scenario, grouped, with failure
 * screenshots, the commits tested and what still needs a person. Any secret
 * that reaches this file is replaced before it is written.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { secrets, API_ROOT, WEB_ROOT } = require('./lib/secrets')

const OUT = path.join(__dirname, 'out')
const results = JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'))
const run = JSON.parse(fs.readFileSync(path.join(OUT, 'run.json'), 'utf8'))
const hidden = Object.values(secrets()).filter(Boolean)
const scrub = (text) => hidden.reduce((acc, value) => acc.split(value).join('[hidden]'), String(text ?? ''))
const esc = (text) => scrub(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd }).toString().trim()
  } catch {
    return '?'
  }
}
let apiDeployed = '?'
try {
  const list = JSON.parse(
    execFileSync('railway', ['deployment', 'list', '--environment', 'development', '--service', 'Nowry', '--json'], {
      cwd: API_ROOT
    }).toString()
  )
  const live = list.find((d) => d.status === 'SUCCESS')
  apiDeployed = (live?.meta?.commitHash || '?').slice(0, 7)
} catch {
  // left as ?
}

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
        notes: (t.annotations || [])
          .filter((a) => a.description)
          .map(
            (a) =>
              `${a.type === 'skip' ? 'Skipped' : a.type === 'finding' ? 'Finding' : a.type === 'observation' ? 'Observation' : a.type}: ${a.description}`
          ),
        shot: shot ? fs.readFileSync(shot.path).toString('base64') : null
      })
    }
  }
  for (const child of suite.suites || []) walk(child, child.file || file)
}
for (const suite of results.suites || []) walk(suite, suite.file)

const group = (title) => (title.startsWith('[smoke]') ? 'Smoke' : title.startsWith('[edge]') ? 'Edge cases' : 'Happy paths')
const passed = rows.filter((r) => r.status === 'passed').length
const failed = rows.filter((r) => r.status !== 'passed' && r.status !== 'skipped').length
const pill = (s) =>
  `<span class="pill ${s === 'passed' ? 'ok' : s === 'skipped' ? 'soft' : 'bad'}">${s === 'passed' ? 'Pass' : s === 'skipped' ? 'Skipped' : 'Fail'}</span>`

const section = (name) => {
  const list = rows.filter((r) => group(r.title) === name)
  if (!list.length) return ''
  return `<h2>${name}</h2><div class="tablewrap"><table><tr><th>Scenario</th><th>Result</th><th>Time</th></tr>${list
    .map(
      (r) =>
        `<tr><td>${esc(r.title.replace(/^\[\w+\]\s*/, ''))}<div class="muted small">${esc(path.basename(r.file || ''))}</div>${
          r.error ? `<pre>${esc(r.error)}</pre>` : ''
        }${r.notes && r.notes.length ? r.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('') : ''}${r.shot ? `<img alt="Screenshot at the failure" src="data:image/png;base64,${r.shot}">` : ''}</td><td>${pill(r.status)}</td><td class="num">${(r.ms / 1000).toFixed(1)} s</td></tr>`
    )
    .join('')}</table></div>`
}

const limits = [
  'One full run per clock hour from one network: the API sends at most 10 verification emails per caller address per hour, and a run asks for about 7.',
  'The development email allowance is 10 a day (one Resend account with production). Past it, emails are kept in the outbox but not sent; Firebase then sends its own reset email, whose new code cancels the one the suite read, so the reset scenario is skipped.'
]

const manual = [
  'Google re-authentication before deleting (the popup on the web, the native sheet on the phone).',
  'The Google-only reset message, with a real Google account.',
  'How the emails look in a real inbox: Gmail on the web and in the app, light and dark.',
  'The phone app: the re-authentication step in Settings and the notice on Home (Metro dev client).',
  "Instagram's and TikTok's in-app browsers on nowry.app."
]

const html = `<title>Nowry Dev Suite</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<style>
:root{--bg:#fcfbf8;--surface:#f8f5f1;--line:#e8e5dd;--fg:#142023;--muted:#5b6568;--ok:#005a2b;--okbg:#e0f5e5;--bad:#8d0c0d;--badbg:#ffe9e5;--soft:#3e4a4d;--softbg:#f2efe8;--gold:#f5b63b}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#021114;--surface:#091c1e;--line:#1f3234;--fg:#edebe7;--muted:#a09e9a;--ok:#c1eacb;--okbg:#193521;--bad:#ffd2cb;--badbg:#47211c;--soft:#bfbdb9;--softbg:#1b2e30;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#021114;--surface:#091c1e;--line:#1f3234;--fg:#edebe7;--muted:#a09e9a;--ok:#c1eacb;--okbg:#193521;--bad:#ffd2cb;--badbg:#47211c;--soft:#bfbdb9;--softbg:#1b2e30;color-scheme:dark}
*{box-sizing:border-box}body{background:var(--bg);color:var(--fg);font:15px/1.55 Inter,-apple-system,sans-serif}
.page{max-width:960px;margin:0 auto;padding-block:36px 72px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:22px}
h1{margin:0;font-size:32px;line-height:1.15}h2{margin:12px 0 0;font-size:20px}
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
<span class="muted small">Dev end-to-end suite · run ${esc(run.run)} · ${esc(new Date(run.started).toUTCString())}</span>
<h1>${failed ? `${failed} of ${rows.length} scenarios failed` : `All ${rows.length} scenarios passed`}</h1>
<p class="verdict">${passed} passed, ${failed} failed, ${rows.length - passed - failed} skipped, against dev.nowry.app and the development API through Vercel's automation bypass. Accounts made by the run were removed at the end.</p>
<div class="facts"><span><b>Web</b> <code>${esc(git(WEB_ROOT, 'rev-parse', '--short', 'origin/dev'))}</code> (origin/dev)</span><span><b>API</b> <code>${esc(apiDeployed)}</code> (deployed on development)</span><span><b>Site</b> https://www.dev.nowry.app</span></div>
${section('Smoke')}${section('Happy paths')}${section('Edge cases')}
<h2>Limits of this run</h2><ul>${limits.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
<h2>Needs you, by hand</h2><ul>${manual.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
</div>`

fs.writeFileSync(path.join(OUT, 'report.html'), scrub(html))
process.stdout.write(`report: ${path.join(OUT, 'report.html')}\n`)
