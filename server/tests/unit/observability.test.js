const { EventEmitter } = require('events');
const { createLogger, createMetrics, requestObserver, percentile } = require('../../src/observability');

describe('Journal structuré', () => {
  test('OBS-01 : une ligne JSON par événement, avec horodatage, niveau et champs', () => {
    const lines = [];
    const log = createLogger({ level: 'info', write: (l) => lines.push(l) });
    log.info('request', { status: 200 });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: 'info', msg: 'request', status: 200 });
    expect(new Date(entry.time).toString()).not.toBe('Invalid Date');
  });

  test('OBS-02 : les messages sous le niveau configuré sont ignorés', () => {
    const lines = [];
    const log = createLogger({ level: 'warn', write: (l) => lines.push(l) });
    log.debug('a'); log.info('b'); log.warn('c'); log.error('d');
    expect(lines.map((l) => JSON.parse(l).msg)).toEqual(['c', 'd']);
  });
});

describe('Indicateurs techniques', () => {
  test('OBS-03 : compteurs par famille de statut, taux d\'erreur et dernière erreur serveur', () => {
    let t = 0;
    const m = createMetrics({ now: () => t });
    m.record({ status: 200, durationMs: 10, method: 'GET', path: '/a' });
    m.record({ status: 404, durationMs: 5, method: 'GET', path: '/b' });
    m.record({ status: 500, durationMs: 30, method: 'POST', path: '/c' });
    t = 61_000;
    m.record({ status: 201, durationMs: 15, method: 'POST', path: '/d' });
    const s = m.snapshot();
    expect(s.uptimeSeconds).toBe(61);
    expect(s.requests).toEqual({ total: 4, byStatus: { '2xx': 2, '3xx': 0, '4xx': 1, '5xx': 1 } });
    expect(s.errorRate).toBe(0.25);
    expect(s.responseTimeMs).toEqual({ avg: 15, p95: 30, max: 30, sample: 4 });
    expect(s.lastServerError).toMatchObject({ method: 'POST', path: '/c', status: 500 });
  });

  test('OBS-04 : aucun trafic -> indicateurs à zéro', () => {
    expect(createMetrics().snapshot()).toMatchObject({
      requests: { total: 0 }, errorRate: 0, responseTimeMs: { avg: 0, p95: 0, max: 0 }, lastServerError: null,
    });
  });

  test('OBS-05 : percentile sur un échantillon trié', () => {
    const data = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(data, 95)).toBe(95);
    expect(percentile(data, 50)).toBe(50);
    expect(percentile([], 95)).toBe(0);
  });
});

describe('Middleware d\'observation', () => {
  const run = (status, { path = '/api/trips/1', requestId } = {}) => {
    const lines = [];
    const logger = createLogger({ level: 'debug', write: (l) => lines.push(JSON.parse(l)) });
    const metrics = createMetrics();
    const headers = {};
    const req = { method: 'GET', originalUrl: `${path}?x=1`, get: () => requestId };
    const res = Object.assign(new EventEmitter(), { statusCode: status, set: (k, v) => { headers[k] = v; } });
    const next = jest.fn();
    requestObserver({ logger, metrics })(req, res, next);
    res.emit('finish');
    return { lines, metrics, headers, next, req };
  };

  test('OBS-06 : journalise la requête (sans paramètres d\'URL) et transmet à la suite', () => {
    const { lines, next, headers, metrics } = run(200);
    expect(next).toHaveBeenCalled();
    expect(lines[0]).toMatchObject({ level: 'info', msg: 'request', method: 'GET', path: '/api/trips/1', status: 200 });
    expect(headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(metrics.snapshot().requests.total).toBe(1);
  });

  test('OBS-07 : une erreur 5xx est journalisée au niveau error', () => {
    expect(run(503).lines[0].level).toBe('error');
  });

  test('OBS-08 : la sonde de santé est journalisée au niveau debug (pas de bruit)', () => {
    expect(run(200, { path: '/api/health' }).lines[0].level).toBe('debug');
  });

  test('OBS-09 : X-Request-Id fourni et valide réutilisé ; valeur suspecte remplacée', () => {
    expect(run(200, { requestId: 'client-abc-123' }).req.id).toBe('client-abc-123');
    expect(run(200, { requestId: 'x\n{"forge":1}' }).req.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
