/**
 * The development API and Firebase's REST endpoints, called from the test
 * process only (Playwright's request context and Node's fetch), never from a
 * page, so the API's allowed origins never matter (ADR-090).
 */
const { request } = require('@playwright/test')
const { secrets } = require('./secrets')
const { API, CODE, PASSWORD } = require('./env')

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1/accounts'

async function firebase(op, body) {
  const response = await fetch(`${IDENTITY}:${op}?key=${secrets().firebaseKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`firebase ${op}: ${data?.error?.message || response.status}`)
  return data
}

const firebaseSignUp = (email, password = PASSWORD) => firebase('signUp', { email, password, returnSecureToken: true })
const firebaseSignIn = (email, password = PASSWORD) => firebase('signInWithPassword', { email, password, returnSecureToken: true })
const applyOobCode = (oobCode) => firebase('update', { oobCode })

let context = null
async function api() {
  if (!context) context = await request.newContext({ baseURL: API })
  return context
}

const bearer = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra })

/** A complete password account made without the browser: Firebase, then the API with the dev code. */
async function makeAccount(email, { code = CODE } = {}) {
  const auth = await firebaseSignUp(email)
  const client = await api()
  const response = await client.post('/auth/register', {
    headers: bearer(auth.idToken, { 'X-Invite-Code': code }),
    data: { firebase_uid: auth.localId, email, username: `e2e_${email.split('-').slice(2).join('_').split('@')[0]}`.slice(0, 30) }
  })
  if (!response.ok()) throw new Error(`register ${email}: ${response.status()}`)
  return auth
}

module.exports = { api, bearer, firebaseSignUp, firebaseSignIn, applyOobCode, makeAccount }
