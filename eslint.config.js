import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // ESLint walks the filesystem, not the git index, so every generated
    // directory .gitignore knows about has to be named here too. Miss one and a
    // stray build artefact produces thousands of errors in vendored code.
    ignores: [
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'blob-report/**',
      'test-results/**',
      '.remix/**',
      '.wrangler/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Prices are branded numbers. A cast defeats the entire point of branding,
      // so it must be a conscious, reviewable act.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // tsconfig sets noPropertyAccessFromIndexSignature, which *requires*
      // `env['NODE_ENV']`. Without this option the two rules contradict.
      '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: true }],
      // Throwing a Response is how a Remix loader hands control to an
      // ErrorBoundary with a status code. It is the framework's contract, not a
      // mistake — but nothing else may be thrown.
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'lib', name: 'Response' }] },
      ],
    },
  },

  // React
  {
    files: ['app/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // ---------------------------------------------------------------------------
  // Architectural boundary.
  //
  // `app/lib` is the pure core: money derivation, ordering, and the Coinbase
  // client. It is unit-tested without a DOM, a network, or a renderer. That is
  // only true for as long as nothing in it imports a framework — and importing
  // `useState` into a formatting module always looks harmless in isolation.
  //
  // A convention a linter checks is an architecture. One in a README is a wish.
  // ---------------------------------------------------------------------------
  {
    files: ['app/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'app/lib must stay framework-free. Move this to a hook.' },
            { name: 'react-dom', message: 'app/lib must stay framework-free.' },
          ],
          patterns: [
            {
              group: ['@remix-run/*', '~/components/*', '~/features/*', '~/hooks/*'],
              message:
                'app/lib must stay framework-free and must not depend on the UI layer. Dependencies point inward.',
            },
          ],
        },
      ],
    },
  },

  // Test files: relax the strictest type rules; mocks legitimately lie.
  //
  // objectLiteralTypeAssertions stays banned in app code, where an `as` cast
  // defeats branded prices. In a test, constructing a full dnd-kit `Active`
  // just to assert on an announcement string is noise, not safety.
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },

  // Plain-JS files sit outside the app's TypeScript project, so the type-aware
  // rules have nothing to read. Lint them syntactically instead.
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },

  // One-shot CLI scripts exist to talk to the terminal.
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },

  prettier,
)
