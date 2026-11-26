/**
 * Écrit sur la sortie standard un résumé Markdown des tests Jest (rapport JUnit) et de la couverture.
 * En CI, la sortie est ajoutée à $GITHUB_STEP_SUMMARY et s'affiche sur la page du pipeline.
 * Usage : node tests/ciSummary.js   (depuis server/, après npm run test:coverage)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const junitFile = path.join(root, 'reports', 'junit', 'jest-junit.xml');
const coverageFile = path.join(root, 'coverage', 'coverage-summary.json');
const lines = [];

if (fs.existsSync(junitFile)) {
  const xml = fs.readFileSync(junitFile, 'utf8');
  const head = xml.match(/<testsuites[^>]*>/)?.[0] ?? '';
  const attr = (name) => Number(head.match(new RegExp(`\\b${name}="(\\d+)"`))?.[1] ?? 0);
  const failed = attr('failures') + attr('errors');
  lines.push(
    `### ${failed ? '❌' : '✅'} Tests Jest (unitaires + intégration)`, '',
    '| Total | Réussis | Échecs | Erreurs |', '|---|---|---|---|',
    `| ${attr('tests')} | ${attr('tests') - failed} | ${attr('failures')} | ${attr('errors')} |`, '',
  );
} else {
  lines.push('### ⚠️ Rapport JUnit absent (les tests ne se sont pas exécutés)', '');
}

if (fs.existsSync(coverageFile)) {
  const total = JSON.parse(fs.readFileSync(coverageFile, 'utf8')).total;
  const keys = ['statements', 'branches', 'functions', 'lines'];
  lines.push(
    '### Couverture de code (globale)', '',
    '| Instructions | Branches | Fonctions | Lignes |', '|---|---|---|---|',
    `| ${keys.map((k) => `${total[k].pct} %`).join(' | ')} |`, '',
    'Seuils bloquants : voir `jest.coverageThreshold` dans `server/package.json` '
      + '(90 % des instructions pour `src/services` et `src/repositories`).',
  );
}

console.log(lines.join('\n'));
