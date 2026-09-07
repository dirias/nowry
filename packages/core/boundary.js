/**
 * The boundary smoke module.
 *
 * This is not a placeholder to delete later. It is the permanent regression
 * guard for ADR-031: it exercises, in one small file, every language feature
 * this package relies on being able to ship without a build step.
 *
 * If a toolchain change ever breaks the arrangement — a webpack upgrade, a
 * Metro config change, a jest transform — this module stops resolving before
 * any real shared code does, and its test says so in one line.
 */
import React from 'react'

export const CORE_BOUNDARY = 'core-boundary-ok'

export const BoundaryContext = React.createContext(null)

/**
 * A provider written without JSX, which is the shape AuthContext, AgentContext
 * and PomodoroContext take when they move here in MOB-004.
 */
export const BoundaryProvider = ({ children }) => React.createElement(BoundaryContext.Provider, { value: { ok: true } }, children)

/** Optional chaining, nullish coalescing, spread and async must all survive. */
export async function readBoundary(source) {
  const merged = { ...(source ?? {}), token: CORE_BOUNDARY }
  return merged?.token ?? null
}
