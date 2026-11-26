/**
 * Observabilité minimale, sans dépendance externe :
 *  - journal structuré JSON (une ligne par événement, lisible par `docker logs` et par un outil d'agrégation) ;
 *  - identifiant de requête (X-Request-Id) pour relier une erreur côté client à la ligne de journal ;
 *  - indicateurs techniques en mémoire exposés par GET /api/metrics.
 * Voir docs/devops/08-supervision-incident-rollback.md.
 */
const crypto = require('crypto');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const DURATION_SAMPLE = 1000; // nombre de durées conservées pour les percentiles

function createLogger({ level = 'info', write = (line) => process.stdout.write(line + '\n') } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const log = (lvl) => (msg, fields = {}) => {
    if (LEVELS[lvl] < threshold) return;
    write(JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...fields }));
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function createMetrics({ now = () => Date.now() } = {}) {
  const startedAt = now();
  const state = { total: 0, byStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 }, durations: [], lastError: null };

  return {
    record({ status, durationMs, method, path }) {
      state.total += 1;
      const family = `${Math.floor(status / 100)}xx`;
      if (family in state.byStatus) state.byStatus[family] += 1;
      state.durations.push(durationMs);
      if (state.durations.length > DURATION_SAMPLE) state.durations.shift();
      if (status >= 500) state.lastError = { at: new Date(now()).toISOString(), method, path, status };
    },
    snapshot() {
      const sorted = [...state.durations].sort((a, b) => a - b);
      const avg = sorted.length ? sorted.reduce((s, d) => s + d, 0) / sorted.length : 0;
      return {
        uptimeSeconds: Math.round((now() - startedAt) / 1000),
        requests: { total: state.total, byStatus: { ...state.byStatus } },
        errorRate: state.total ? Number((state.byStatus['5xx'] / state.total).toFixed(4)) : 0,
        responseTimeMs: {
          avg: Number(avg.toFixed(1)),
          p95: percentile(sorted, 95),
          max: sorted.length ? sorted[sorted.length - 1] : 0,
          sample: sorted.length,
        },
        lastServerError: state.lastError,
      };
    },
  };
}

/** Middleware Express : identifiant de requête, journal d'accès et mesures. */
function requestObserver({ logger, metrics, quietPaths = ['/api/health'] }) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const incoming = req.get('x-request-id');
    req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    res.on('finish', () => {
      const durationMs = Number(((Number(process.hrtime.bigint() - start)) / 1e6).toFixed(1));
      const path = req.originalUrl.split('?')[0];
      metrics.record({ status: res.statusCode, durationMs, method: req.method, path });
      const fields = { requestId: req.id, method: req.method, path, status: res.statusCode, durationMs };
      if (res.statusCode >= 500) logger.error('request', fields);
      else if (quietPaths.includes(path)) logger.debug('request', fields); // sondes : bruit
      else logger.info('request', fields);
    });
    next();
  };
}

module.exports = { createLogger, createMetrics, requestObserver, percentile, LEVELS };
