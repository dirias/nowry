/**
 * The goal feature's `sx` fragments now live in the shared form system, because
 * seven surfaces need the same focus ring and a second definition would recreate
 * exactly the drift this file was created to remove (UX-CONTRACT §7.4).
 *
 * Kept as a re-export so all thirteen importers keep working unchanged.
 */
export { focusRing, oneLine } from '../../Common/Form/formStyles'
