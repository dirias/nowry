/**
 * Metro, taught about the workspace.
 *
 * `@nowry/core` is consumed as SOURCE (ADR-031), and it lives outside this
 * directory. Metro watches only the project root by default, so without
 * `watchFolders` it resolves the symlink, walks out of its watched tree and
 * fails on the first shared import.
 *
 * `disableHierarchicalLookup` is deliberately NOT set. Expo's monorepo guide
 * recommends it, and it is wrong for this layout: npm hoists, so several
 * packages live in a nested `node_modules` — `@expo/metro-runtime` under
 * `expo-router` is one — and disabling the upward walk makes Metro unable to
 * find them. It is the right setting for a pnpm tree, not this one. npm's own
 * hoisting is what keeps React single here, and `node_modules/react` resolving
 * to one copy is asserted by the bundle check in MOB-005.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]

/*
 * ONE React per bundle.
 *
 * The two clients are on different React versions and that is fine: Expo SDK 57
 * requires React 19, and the web app is on 18.3.1 under CRA and Joy. What is NOT
 * fine is both ending up in one bundle. `@nowry/core` sits outside this
 * directory, so Metro would resolve its `react` by walking up to the repository
 * root — the web app's 18.3.1 — while everything under `mobile/` resolves 19.
 * Two React instances of two versions in one bundle is a guaranteed
 * "invalid hook call" the first time a shared hook runs.
 *
 * So `react` is pinned to this client's copy for the whole bundle. `@nowry/core`
 * declares react as a PEER dependency and never its own, which is what makes
 * that safe: it uses stable hook APIs and takes whichever React its host supplies.
 */
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native')
}
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')]

module.exports = config
