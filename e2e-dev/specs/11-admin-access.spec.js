/**
 * Admin access (prd-admin.md, dev test steps · batch 1, step 1; ADR-086).
 * One flag decides: `is_admin`, read from the account. An ordinary account
 * never reaches /admin, never sees the menu item, and gets 403 from admin calls;
 * the grant script sets and clears the flag, dry run first.
 */
const { execFile } = require('child_process')
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { db } = require('../lib/db')
const { API_ROOT } = require('../lib/secrets')

/** `scripts.set_admin` on development, for a suite address only; prints one line. */
const setAdmin = (email, ...flags) =>
  new Promise((resolve, reject) => {
    if (!/^rikydier\+e2e-/.test(email)) return reject(new Error('set_admin: suite addresses only'))
    execFile(
      'railway',
      [
        'run',
        '--environment',
        'development',
        '--service',
        'Nowry',
        '--',
        '.venv/bin/python',
        '-m',
        'scripts.set_admin',
        '--email',
        email,
        ...flags
      ],
      { cwd: API_ROOT, timeout: 120000 },
      (error, stdout) =>
        resolve({
          code: error ? error.code : 0,
          line: String(stdout || '')
            .trim()
            .split('\n')
            .pop()
        })
    )
  })

const existing = (error) => {
  if (!String(error.message).includes('EMAIL_EXISTS')) throw error
}

let adminEmail
let userEmail

test.beforeAll(async () => {
  adminEmail = alias('adm-admin')
  userEmail = alias('adm-user')
  // A failed test restarts its worker and this runs again: the accounts may already exist.
  await makeAccount(adminEmail).catch(existing)
  await makeAccount(userEmail).catch(existing)
  await db('make-admin', adminEmail)
})

const me = async (email) => {
  const client = await api()
  const response = await client.get('/users/me', { headers: bearer((await firebaseSignIn(email)).idToken) })
  expect(response.status()).toBe(200)
  return response.json()
}

test('[happy] /users/me says is_admin for the admin only, and role for nobody', async () => {
  const admin = await me(adminEmail)
  const user = await me(userEmail)
  expect(admin.is_admin).toBe(true)
  expect('is_admin' in user).toBe(false)
  expect('role' in admin || 'role' in user).toBe(false)
})

test('[edge] an ordinary account gets 403 from admin calls, never 500', async () => {
  const client = await api()
  const headers = bearer((await firebaseSignIn(userEmail)).idToken)
  for (const path of ['/beta/admin/invites', '/beta/admin/cohorts', '/bugs/all', '/bugs/stats']) {
    expect((await client.get(path, { headers })).status(), path).toBe(403)
  }
})

test('[happy] the admin opens /admin from the account menu and lands on Invitations', async ({ page }) => {
  await signIn(page, adminEmail)
  await page.getByRole('button', { name: 'Open profile menu' }).click()
  await page.getByRole('menuitem', { name: 'Admin' }).click()
  await page.waitForURL((url) => url.pathname === '/admin/invitations', { timeout: 30000 })
  await expect(page.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible()
  await expect(page.getByText('Only you can see this')).toBeVisible()
  await expect(page.getByText('Invite people')).toBeVisible()
  await page.goto('/admin/bugs')
  await expect(page).toHaveURL(/\/admin\/bugs$/)
})

test('[edge] an ordinary account is sent Home from /admin and has no Admin in its menu', async ({ page }) => {
  await signIn(page, userEmail)
  for (const path of ['/admin', '/admin/invitations', '/admin/bugs']) {
    await page.goto(path)
    await page.waitForURL((url) => url.pathname === '/', { timeout: 30000 })
  }
  await page.getByRole('button', { name: 'Open profile menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0)
})

test('[happy] the grant script: dry run writes nothing, --apply grants and logs, --revoke --apply clears', async () => {
  const email = alias('adm-grant')
  await makeAccount(email).catch(existing)
  const dry = await setAdmin(email)
  expect(dry.line).toContain('is_admin: false → true')
  expect(dry.line).toContain('dry run, nothing written')
  expect((await db('account', email)).live.is_admin).toBe(false)

  expect((await setAdmin(email, '--apply')).line).toContain('written')
  expect((await db('account', email)).live.is_admin).toBe(true)
  expect((await me(email)).is_admin).toBe(true)

  expect((await setAdmin(email, '--revoke', '--apply')).line).toContain('is_admin: true → false')
  expect((await db('account', email)).live.is_admin).toBe(false)
  expect((await db('admin-log', email)).actions).toEqual(['admin.grant', 'admin.revoke'])
})

test('[edge] the grant script refuses an address with no account and writes nothing', async () => {
  const result = await setAdmin(alias('adm-nobody'), '--apply')
  expect(result.code).toBe(1)
  expect(result.line).toContain('refused')
})
