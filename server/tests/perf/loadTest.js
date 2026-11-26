/**
 * Test de performance élémentaire (charge) — BusInTunisia.
 *
 * Protocole :
 *  - base bus_in_tunisia_test réinitialisée (seed), serveur lancé seul sur le port 5057 ;
 *  - préchauffage de 3 s, puis chaque scénario pendant DURATION secondes avec CONNECTIONS clients simultanés ;
 *  - mesures : débit (req/s), latences p50 / p90 / p97,5 / p99 / max, erreurs et réponses non-2xx.
 *
 * Critères d'acceptation (définis dans le plan de test, §7) :
 *  - aucune erreur réseau ni réponse non-2xx ;
 *  - latence p97,5 < 500 ms et p99 < 1 000 ms pour chaque scénario.
 *
 * Usage : node tests/perf/loadTest.js [--connections=20] [--duration=20]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const autocannon = require('autocannon');
const { resetTestDb } = require('../db/resetTestDb');
const { testDbConfig } = require('../db/testDbConfig');

const arg = (name, def) => Number((process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1]) || def;
const CONNECTIONS = arg('connections', 20);
const DURATION = arg('duration', 20);
const PORT = 5057;
const BASE = `http://localhost:${PORT}`;
const THRESHOLDS = { p97_5: 500, p99: 1000 };

const waitForServer = (timeoutMs = 15000) => new Promise((resolve, reject) => {
  const start = Date.now();
  const tryOnce = () => http.get(`${BASE}/api/trips/0`, (r) => { r.resume(); resolve(); })
    .on('error', () => (Date.now() - start > timeoutMs ? reject(new Error('Serveur injoignable')) : setTimeout(tryOnce, 300)));
  tryOnce();
});

const run = (opts) => new Promise((resolve, reject) => {
  autocannon({ connections: CONNECTIONS, duration: DURATION, ...opts }, (err, res) => (err ? reject(err) : resolve(res)));
});

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client.test@bus.tn', password: 'Client123!' }),
  });
  return (await res.json()).token;
}

(async () => {
  await resetTestDb();
  const server = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, PORT: String(PORT), DB_NAME: testDbConfig.database },
    stdio: 'ignore',
  });
  try {
    await waitForServer();
    const token = await login();
    const scenarios = [
      { id: 'PERF-01', name: 'Recherche de trajets (public)', url: `${BASE}/api/trips/search?departure=Tunis&destination=Sousse&date=2030-01-15` },
      { id: 'PERF-02', name: 'Détail trajet + sièges occupés (public)', url: `${BASE}/api/trips/1` },
      { id: 'PERF-03', name: 'Mes réservations (authentifié)', url: `${BASE}/api/bookings/my`, headers: { Authorization: `Bearer ${token}` } },
    ];

    await run({ url: scenarios[0].url, duration: 3 }); // préchauffage (pool MySQL, JIT)

    const results = [];
    for (const s of scenarios) {
      process.stdout.write(`${s.id} ${s.name} … `);
      const r = await run({ url: s.url, headers: s.headers });
      const row = {
        id: s.id,
        scenario: s.name,
        requests: r.requests.total,
        rps_avg: Math.round(r.requests.average),
        p50_ms: r.latency.p50,
        p90_ms: r.latency.p90,
        p97_5_ms: r.latency.p97_5,
        p99_ms: r.latency.p99,
        max_ms: r.latency.max,
        errors: r.errors + r.timeouts,
        non2xx: r.non2xx,
      };
      row.verdict = row.errors === 0 && row.non2xx === 0 && row.p97_5_ms < THRESHOLDS.p97_5 && row.p99_ms < THRESHOLDS.p99
        ? 'CONFORME' : 'NON CONFORME';
      results.push(row);
      console.log(`${row.rps_avg} req/s, p97,5 = ${row.p97_5_ms} ms, p99 = ${row.p99_ms} ms, erreurs = ${row.errors}, non-2xx = ${row.non2xx} => ${row.verdict}`);
    }

    const report = {
      date: new Date().toISOString(),
      environment: { node: process.version, platform: `${process.platform} ${process.arch}`, cpus: require('os').cpus().length, database: testDbConfig.database },
      parameters: { connections: CONNECTIONS, duration_s: DURATION, thresholds_ms: THRESHOLDS },
      results,
    };
    const file = path.join(__dirname, 'reports', `perf-${report.date.slice(0, 10)}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    console.table(results);
    console.log(`Rapport : ${path.relative(process.cwd(), file)}`);
    process.exitCode = results.every((r) => r.verdict === 'CONFORME') ? 0 : 1;
  } finally {
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
