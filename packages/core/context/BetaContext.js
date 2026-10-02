/**
 * The beta flags, read once per session (ADR-038).
 *
 * Every surface that changes for the beta — the mark in the header, the
 * invite field, the waitlist, the closed upgrade paths — asks this provider
 * rather than the network, so the app renders one truth. Until the server
 * answers, and if it never does, the flags read as no beta: a visitor sees the
 * product as it is, and nothing is hidden by accident.
 *
 * `createElement`, no JSX (ADR-031); no browser globals (ADR-026).
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { betaService } from '../api/services/beta.service'
import { DEFAULT_BETA_CONFIG } from '../domain/beta'

const BetaContext = createContext({ config: DEFAULT_BETA_CONFIG, loading: false })

export const BetaProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_BETA_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    betaService
      .getConfig()
      .then((next) => {
        if (!cancelled) setConfig(next)
      })
      .catch(() => {
        // Unreachable config means no beta, deliberately.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ config, loading }), [config, loading])
  return React.createElement(BetaContext.Provider, { value }, children)
}

/** `{ config: { active, invite_required, upgrades_open }, loading }`; no provider reads as no beta. */
export const useBeta = () => useContext(BetaContext)
