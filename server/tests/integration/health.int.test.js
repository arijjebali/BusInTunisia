/**
 * Sonde de santé /api/health : utilisée par le HEALTHCHECK Docker, les smoke tests post-déploiement
 * et la supervision. Elle doit répondre 200 avec la version déployée quand la base est joignable,
 * et 503 (« degraded ») quand elle ne l'est pas.
 */
const request = require('supertest');
const { testDbConfig } = require('../db/testDbConfig');
const { resetTestDb } = require('../db/resetTestDb');

process.env.DB_NAME = testDbConfig.database; // avant le require de l'application
process.env.APP_VERSION = '9.9.9-test';
process.env.GIT_SHA = 'abc1234';
const { app, pool } = require('../../index');

beforeAll(async () => { await resetTestDb(); }); // la base de test doit exister, quel que soit l'ordre des fichiers
afterAll(async () => { await pool.end(); });

describe('GET /api/health', () => {
  test('INT-HEALTH-01 : 200, statut ok, base « up » et version exposée', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      status: 'ok',
      version: '9.9.9-test',
      commit: 'abc1234',
      checks: { database: 'up' },
    });
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  test('INT-HEALTH-02 : 503 « degraded » quand la base ne répond plus', async () => {
    const spy = jest.spyOn(pool, 'query').mockRejectedValueOnce(Object.assign(new Error('down'), { code: 'ECONNREFUSED' }));
    const res = await request(app).get('/api/health');
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { database: 'down' }, error: 'ECONNREFUSED' });
  });

  test('INT-HEALTH-03 : une route /api inconnue renvoie un 404 JSON', async () => {
    const res = await request(app).get('/api/route-inexistante');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not found' });
  });
});

describe('GET /api/metrics et identifiant de requête', () => {
  test('INT-OBS-01 : chaque réponse porte un X-Request-Id ; un identifiant fourni est conservé', async () => {
    const generated = await request(app).get('/api/health');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const provided = await request(app).get('/api/health').set('X-Request-Id', 'diag-42');
    expect(provided.headers['x-request-id']).toBe('diag-42');
  });

  test('INT-OBS-02 : indicateurs techniques (trafic, erreurs, temps de réponse, version)', async () => {
    await request(app).get('/api/route-inexistante'); // au moins un 4xx
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ version: '9.9.9-test', commit: 'abc1234' });
    expect(res.body.requests.total).toBeGreaterThanOrEqual(3);
    expect(res.body.requests.byStatus['4xx']).toBeGreaterThanOrEqual(1);
    expect(res.body.errorRate).toBeGreaterThan(0); // le 503 simulé par INT-HEALTH-02
    expect(res.body.lastServerError).toMatchObject({ path: '/api/health', status: 503 });
    expect(res.body.responseTimeMs.sample).toBeGreaterThan(0);
  });
});
