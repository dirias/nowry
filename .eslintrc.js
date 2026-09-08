module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    jest: true,
    browser: true,
    amd: true,
    node: true,
    es6: true
  },
  plugins: ['react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended' // Make this the last element so prettier config overrides other formatting rules
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off',
    'no-unused-vars': 'off',
    //'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],

    /*
     * The design-token ratchet.
     *
     * `npm run dev` is `format && lint && start`, and it already blocks on
     * errors while passing on warnings — so `warn` gives a free two-stage
     * ratchet: every new raw value is visible immediately, the ~849 existing
     * ones are migrated in a separate pass, and the level is raised to `error`
     * once that pass lands. Nothing is blocked today.
     *
     * See DESIGN_GUIDELINES §4.1.
     */
    'no-restricted-syntax': [
      'warn',
      {
        selector: "Property[key.name='fontSize'][value.type='Literal']:not([value.value=/^(xs|sm|md|lg|xl|xl2|xl3|xl4|xl5|xl6|inherit)$/])",
        message: 'Raw fontSize is forbidden. Use <Typography level="…"> or a theme fontSize token. See DESIGN_GUIDELINES §4.1.'
      },
      {
        selector: "Property[key.name='fontWeight'][value.type='Literal']:not([value.value=/^(sm|md|lg|xl)$/])",
        message: 'Raw fontWeight is forbidden. Use sm|md|lg|xl. See DESIGN_GUIDELINES §4.1.'
      },
      {
        selector: "Property[key.name='borderRadius'][value.type='Literal']:not([value.value=/^(xs|sm|md|lg|xl|full|inherit)$/])",
        message: 'Raw borderRadius is forbidden. Use xs|sm|md|lg|xl|full.'
      },
      {
        // DS-001: a layer is a name on the scale, never a number.
        selector: "Property[key.name='zIndex'][value.type='Literal'][value.raw=/^-?[0-9]+$/]",
        message:
          'Raw zIndex is forbidden. Use a layer name: badge|table|floating|popup|modal|snackbar|tooltip. See docs/design/ELEVATION.md.'
      },
      {
        // DS-001: a duration is a token, never a literal in a component.
        selector: "Property[key.name='transition'][value.type='Literal'][value.value=/[0-9](ms|s)\\b/]",
        message:
          'Raw transition duration is forbidden. Use var(--nowry-motion-quick|base|slow) with var(--nowry-motion-standard|exit). See docs/design/MOTION.md.'
      }
    ]
  },
  overrides: [
    {
      /*
       * The @nowry/core boundary (ADR-026, ADR-031).
       *
       * `packages/core` is consumed as SOURCE by two clients with different
       * toolchains, and two constraints follow from that. Neither is a style
       * preference; each one breaks a build when violated, in a place far from
       * the file that caused it. So they are enforced here rather than
       * remembered.
       *
       *   No JSX — `react-scripts` runs its JSX-capable babel-loader only over
       *   `src/`, and webpack resolves the workspace symlink to a real path
       *   outside it. JSX in this package fails the WEB build with a confusing
       *   "experimental syntax" error pointing at a file the web app does not
       *   own. Providers use React.createElement instead.
       *
       *   No browser globals and no view layer — the mobile client has no
       *   `window`, and importing Joy or react-dom would drag the web view
       *   layer into a package React Native has to load. Everything the
       *   environment provides arrives through the platform port.
       *
       * A module here also never returns a React component: data that needs an
       * icon returns an icon KEY, and each client maps it (MOB-003B, MOB-014).
       * That one is a convention; an AST rule cannot see it.
       */
      files: ['packages/core/**/*.js'],
      // `browser` stays off here on purpose: the restricted-globals rule below
      // is the explicit guard, and leaving the browser env on would also make
      // `fetch`, `URL` and friends look legitimate in a package that must load
      // under React Native. `es2020` is for `globalThis`, which both runtimes
      // have and which the boundary tests use to assert the DOM is absent.
      env: { browser: false, es2020: true },
      rules: {
        'no-restricted-globals': [
          'error',
          { name: 'window', message: 'No browser globals in @nowry/core. Use the platform port.' },
          { name: 'document', message: 'No browser globals in @nowry/core. Use the platform port.' },
          { name: 'localStorage', message: 'No browser globals in @nowry/core. Use `storage` from the platform port (ADR-027).' },
          { name: 'sessionStorage', message: 'No browser globals in @nowry/core. Use `storage` from the platform port (ADR-027).' },
          { name: 'navigator', message: 'No browser globals in @nowry/core. Use the platform port.' },
          { name: 'alert', message: 'No browser globals in @nowry/core. Use `notify` from the platform port.' }
        ],
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@mui/*'], message: '@nowry/core carries no view layer. Joy UI belongs to the web client.' },
              { group: ['react-dom', 'react-dom/*'], message: '@nowry/core must load under React Native, which has no react-dom.' },
              // Any depth of escape into a client's source tree, not just two
              // levels: `../../../src/config/firebase.config` is exactly the
              // import MOB-003 had to remove, and the narrower pattern missed it.
              { group: ['**/src/**', '../../src/**', '../../../src/**'], message: '@nowry/core must not reach into a client. Move the shared part here instead (MOB-003B).' },
              { group: ['i18next-browser-languagedetector'], message: 'Language detection is per client. Core holds the locales only.' }
            ]
          }
        ],
        'no-restricted-syntax': [
          'error',
          { selector: 'JSXElement', message: 'No JSX in @nowry/core — react-scripts cannot transpile it here. Use React.createElement (ADR-031).' },
          { selector: 'JSXFragment', message: 'No JSX in @nowry/core — react-scripts cannot transpile it here. Use React.createElement (ADR-031).' }
        ]
      }
    },
    {
      /*
       * The mobile client.
       *
       * React Native, not a browser: no `window`, and a `__DEV__` global the
       * bundler defines. The design-token rules above are for Joy `sx` objects
       * and mean nothing against a StyleSheet, so they are off here; MOB-009
       * brings the mobile theme and its own rules with it.
       */
      files: ['mobile/**/*.js'],
      env: { browser: false, es2021: true, node: true, jest: true },
      globals: { __DEV__: 'readonly', fetch: 'readonly', console: 'readonly' },
      rules: {
        'no-restricted-syntax': 'off',
        // Expo compiles JSX with the automatic runtime, so React does not need
        // to be in scope. The web app imports it everywhere out of habit, which
        // is why this rule has never fired over there.
        'react/react-in-jsx-scope': 'off'
      }
    },
    {
      /*
       * Core's TEST files may use JSX.
       *
       * The JSX ban exists because `react-scripts` cannot transpile JSX in this
       * package for the WEB BUNDLE. A test file is never bundled — it runs under
       * babel-jest with the React preset — so the ban buys nothing there and
       * costs the ability to render a provider in its own test.
       *
       * The browser-global and view-layer bans still apply. A test that wants
       * storage configures the port, which is how `generationBudget.test.js` and
       * the hook suites are written.
       */
      files: ['packages/core/**/*.test.js', 'packages/core/**/__tests__/**/*.js', 'packages/core/platform/testing.js'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    {
      /*
       * The three rules above match ANY property named fontSize / fontWeight /
       * borderRadius, not only the ones inside an `sx` prop — an AST selector
       * cannot tell the two apart. That is fine almost everywhere, because
       * almost every match in this codebase really is an `sx` value.
       *
       * It is not fine in the files below, where the same property names are
       * part of a third-party config object that has nothing to do with the
       * Joy theme and cannot accept a token:
       *
       *   - theme/**             the token definitions themselves — this is the
       *                          one place a raw value is the correct thing to
       *                          write, since it is what every other file's
       *                          token resolves to
       *   - Editor/**            Lexical theme and node-style objects
       *   - Blackboard/nodes/**  @xyflow/react node `style` objects, which are
       *                          raw DOM styles on canvas nodes
       *   - WeeklyProgress.js    recharts axis `tick`, `contentStyle`,
       *                          `labelStyle` and `wrapperStyle` props
       *
       * Scoped off rather than silenced with inline disables, so the exclusion
       * is reviewable in one place. A custom ESLint plugin that understands
       * `sx` is the real answer and is deliberately out of scope here.
       */
      files: [
        'src/theme/**/*.js',
        'src/components/Editor/**/*.js',
        'src/components/Blackboard/nodes/**/*.js',
        'src/components/User/Home/WeeklyProgress.js'
      ],
      rules: {
        'no-restricted-syntax': 'off'
      }
    }
  ]
}
