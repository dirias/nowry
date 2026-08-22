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
      }
    ]
  },
  overrides: [
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
