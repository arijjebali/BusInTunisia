const { validateConfig, MIN_SECRET_LENGTH } = require('../../src/config');

const strongSecret = 'x'.repeat(MIN_SECRET_LENGTH);

describe('validateConfig — validation de la configuration au démarrage', () => {
  test('CFG-01 : JWT_SECRET absent refusé dans tous les environnements', () => {
    expect(validateConfig({})).toEqual([expect.stringContaining('JWT_SECRET doit être défini')]);
    expect(validateConfig({ APP_ENV: 'test', DB_PASSWORD: 'p' })).toEqual(
      expect.arrayContaining([expect.stringContaining('JWT_SECRET doit être défini')]));
  });

  test('CFG-02 : en développement, un secret court et les comptes de démo sont tolérés', () => {
    expect(validateConfig({ JWT_SECRET: 'court', ENABLE_DEMO_ACCOUNTS: 'true' })).toEqual([]);
  });

  test.each(['test', 'production'])('CFG-03 : en « %s », secret trop court refusé', (APP_ENV) => {
    const problems = validateConfig({ APP_ENV, JWT_SECRET: 'court', DB_PASSWORD: 'p' });
    expect(problems).toEqual([expect.stringContaining(`au moins ${MIN_SECRET_LENGTH} caractères`)]);
  });

  test.each(['test', 'production'])('CFG-04 : en « %s », comptes de démonstration interdits', (APP_ENV) => {
    const problems = validateConfig({ APP_ENV, JWT_SECRET: strongSecret, DB_PASSWORD: 'p', ENABLE_DEMO_ACCOUNTS: 'true' });
    expect(problems).toEqual([expect.stringContaining('ENABLE_DEMO_ACCOUNTS=true est interdit')]);
  });

  test('CFG-05 : en test, mot de passe de base vide refusé', () => {
    expect(validateConfig({ APP_ENV: 'test', JWT_SECRET: strongSecret })).toEqual(
      [expect.stringContaining('DB_PASSWORD ne peut pas être vide')]);
  });

  test('CFG-06 : configuration de test conforme acceptée', () => {
    expect(validateConfig({ APP_ENV: 'test', JWT_SECRET: strongSecret, DB_PASSWORD: 'p', ENABLE_DEMO_ACCOUNTS: 'false' })).toEqual([]);
  });
});
