/**
 * E2E-007: the suite's requests skip the per-network verification limit on
 * development, and nothing else does. With no key, this network's hourly
 * allowance is filled using suite aliases (kept in the outbox, never sent);
 * then a non-suite address is still refused even with the key, while a suite
 * alias with the key goes through.
 */
const { test, expect } = require('../lib/fixtures')
const { alias, runId } = require('../lib/run')
const { api, asSuite, bearer, firebaseSignUp } = require('../lib/api')

const ask = async (token, headers = {}) => {
  const client = await api()
  const response = await client.post('/auth/email/verification', { headers: { ...bearer(token), ...headers }, data: { language: 'en' } })
  expect(response.status()).toBe(200)
  return (await response.json()).status
}

test('[edge] a non-suite address from the same network is still limited; the suite is not', async () => {
  test.info().annotations.push({
    type: 'observation',
    description:
      "This fills the network's hourly verification allowance on purpose: manual sign-ups from this network wait until the next hour."
  })
  let reached = false
  for (let i = 0; i < 12 && !reached; i++) {
    const auth = await firebaseSignUp(alias(`limit-${i}`))
    reached = (await ask(auth.idToken)) === 'wait'
  }
  expect(reached, 'the network allowance is reached without the key').toBe(true)

  const outsider = await firebaseSignUp(`rikydier+nosuite-${runId()}@gmail.com`)
  expect(await ask(outsider.idToken, asSuite()), 'a non-suite address is limited even with the key').toBe('wait')

  const suite = await firebaseSignUp(alias('limit-key'))
  expect(await ask(suite.idToken, asSuite()), 'a suite alias with the key is not').toBe('sent')
})
