import { useBeta } from '../context/BetaContext'
import { SHOW_PRICING, upgradesAvailable } from '../domain/plans'

/**
 * Whether this client may show a key that leads toward a checkout (ADR-073):
 * prices are shown, and the server has upgrades open (ADR-038).
 */
const useUpgradesOpen = () => {
  const { config } = useBeta()
  return upgradesAvailable(config, SHOW_PRICING)
}

export default useUpgradesOpen
