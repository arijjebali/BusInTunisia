// Linting et analyse statique du serveur (ESLint 9, configuration « flat »).
// Toute erreur fait échouer le job « Qualité » du pipeline (quality gate) ; les avertissements sont signalés
// sans bloquer et doivent être résorbés progressivement.
const js = require('@eslint/js');
const globals = require('globals');
const jest = require('eslint-plugin-jest');

module.exports = [
  { ignores: ['coverage/**', 'node_modules/**', 'tests/api/reports/**', 'tests/perf/reports/**'] },

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Bugs probables : bloquants
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'no-implicit-globals': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Sécurité : exécution de code dynamique interdite
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // Style et maintenabilité : signalés sans bloquer
      'prefer-const': 'warn',
      complexity: ['warn', 15],
    },
  },

  {
    files: ['tests/**/*.js'],
    ...jest.configs['flat/recommended'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
];
