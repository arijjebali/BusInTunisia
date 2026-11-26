// Linting et analyse statique du client React (ESLint 9, configuration « flat »).
// Toute erreur fait échouer le job « Qualité » du pipeline (quality gate).
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'e2e-report/**', 'test-results/**', 'playwright-report/**'] },

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off', // projet sans PropTypes ni TypeScript
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'react/no-danger': 'error', // pas d'injection HTML brute (XSS)
    },
  },

  {
    // Configuration Vite/Playwright/Tailwind et tests E2E : exécutés par Node.
    files: ['*.config.js', 'e2e/**/*.js'],
    // Les tests E2E exécutent aussi du code dans la page (page.evaluate, waitForFunction) : globals navigateur.
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { ...js.configs.recommended.rules },
  },
]
