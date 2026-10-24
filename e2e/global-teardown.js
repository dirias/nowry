/**
 * Stopping `docker run` does not always stop its container, so the throwaway
 * MongoDB is removed by name once the run ends. CI's Mongo is a service
 * (E2E_EXTERNAL_MONGO) and is left alone.
 */
const { execSync } = require('child_process')

module.exports = async () => {
  if (process.env.E2E_EXTERNAL_MONGO) return
  try {
    execSync('docker rm -f nowry-e2e-mongo', { stdio: 'ignore' })
  } catch {
    // Already gone.
  }
}
