/**
 * Some packages must exist exactly once in the tree, or they break silently.
 *
 * `@tanstack/react-query-persist-client` requires a newer `@tanstack/react-query`
 * than the workspace root had, so npm nested a second copy under `mobile/`. The
 * app then mounted `QueryClientProvider` from one copy and called `useQuery`
 * from the other. Two copies of a package that carries a React context are two
 * contexts, and the second one is always empty: every screen died with "No
 * QueryClient set, use QueryClientProvider to set one" while the provider was
 * plainly there in the layout.
 *
 * Nothing catches this by reading the code. The import is right, the provider is
 * right, and the failure is a resolution detail two directories away. So it is
 * asserted: the client and the shared package must resolve these to the same
 * file on disk.
 *
 * `react` and `react-native` are absent on purpose — Metro pins those through
 * `extraNodeModules`, which is a different mechanism with its own reason
 * (see metro.config.js).
 */
const path = require('path')

const CORE = path.resolve(__dirname, '../../../packages/core')
const MOBILE = path.resolve(__dirname, '../..')

/** Every one of these holds state behind a React context or a module global. */
const SINGLETONS = ['@tanstack/react-query', '@tanstack/query-core', 'i18next', 'react-i18next']

describe.each(SINGLETONS)('%s', (name) => {
  it('resolves to one file from both the client and the shared package', () => {
    const fromMobile = require.resolve(name, { paths: [MOBILE] })
    const fromCore = require.resolve(name, { paths: [CORE] })

    expect(fromMobile).toBe(fromCore)
  })
})
