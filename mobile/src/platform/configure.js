/**
 * Installs the mobile adapters, once, as a module side effect.
 *
 * Imported first by the root layout. Import order does not actually matter —
 * the port resolves every capability at call time precisely so a shared module
 * can be imported before its client is configured — but doing it here, in a
 * module whose only job is this, keeps the guarantee obvious rather than buried
 * in a component file.
 */
import { configurePlatform, isPlatformConfigured } from '@nowry/core'
import { mobilePlatform } from './mobilePlatform'
import { initTelemetry } from './telemetry'

if (!isPlatformConfigured()) {
  configurePlatform(mobilePlatform)
  initTelemetry()
}
