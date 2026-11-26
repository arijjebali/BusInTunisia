/**
 * Lance Jest avec couverture (unitaires + intégration) depuis le chemin canonique du projet.
 * Sous Windows, un répertoire courant en « c:\ » (minuscule) empêche Jest d'appliquer
 * les seuils par dossier (« Coverage data ... was not found ») : on corrige la casse ici.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = fs.realpathSync.native(path.join(__dirname, '..'));
const jestBin = require.resolve('jest/bin/jest');
const result = spawnSync(
  process.execPath,
  [jestBin, 'tests/unit', 'tests/integration', '--runInBand', '--coverage', ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' }
);
process.exit(result.status ?? 1);
