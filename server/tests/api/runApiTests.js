/**
 * Exécute la collection Postman avec Newman, en une seule fois :
 *  1. réinitialise la base bus_in_tunisia_test (seed) ;
 *  2. démarre le serveur sur le port 5055 en le pointant vers la base de test ;
 *  3. lance la collection et produit les rapports (CLI + JSON + JUnit) ;
 *  4. arrête le serveur.
 *
 * Usage : node tests/api/runApiTests.js [--regression] [--server=chemin] [--report=suffixe]
 *   --regression : exclut le dossier « 9. Défauts connus » (anomalies ouvertes)
 */
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const newman = require('newman');
const { resetTestDb } = require('../db/resetTestDb');
const { testDbConfig } = require('../db/testDbConfig');
const { redactFile } = require('./redact');

const args = process.argv.slice(2);
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
const regression = args.includes('--regression');

const PORT = 5055;
const serverFile = path.resolve(opt('server') || path.join(__dirname, '..', '..', 'index.js'));
const suffix = opt('report') ? `-${opt('report')}` : '';
const reportsDir = path.join(__dirname, 'reports');
const collection = require('./BusInTunisia.postman_collection.json');
const folders = regression
  ? collection.item.map((f) => f.name).filter((n) => !n.startsWith('9.'))
  : undefined;

function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(`http://localhost:${PORT}/api/trips/0`, (res) => { res.resume(); resolve(); })
        .on('error', () => (Date.now() - start > timeoutMs ? reject(new Error('Serveur injoignable')) : setTimeout(tryOnce, 300)));
    };
    tryOnce();
  });
}

(async () => {
  await resetTestDb();
  const server = spawn(process.execPath, [serverFile], {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, PORT: String(PORT), DB_NAME: testDbConfig.database },
    stdio: 'ignore',
  });
  try {
    await waitForServer();
    const summary = await new Promise((resolve, reject) => {
      newman.run({
        collection,
        folder: folders,
        envVar: [{ key: 'baseUrl', value: `http://localhost:${PORT}/api` }],
        reporters: ['cli', 'json', 'junit'],
        reporter: {
          json: { export: path.join(reportsDir, `newman-report${suffix}.json`) },
          junit: { export: path.join(reportsDir, `newman-report${suffix}.xml`) },
        },
      }, (err, s) => (err ? reject(err) : resolve(s)));
    });
    process.exitCode = summary.run.failures.length ? 1 : 0;
    // Les rapports contiennent les requêtes/réponses complètes : masquer les jetons avant tout archivage.
    for (const ext of ['json', 'xml']) redactFile(path.join(reportsDir, `newman-report${suffix}.${ext}`));
  } finally {
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
