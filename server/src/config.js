/**
 * Validation de la configuration au démarrage (« fail fast ») : mieux vaut refuser de démarrer
 * que tourner avec une configuration dangereuse. Les règles se durcissent hors développement.
 * Voir docs/devops/05-configuration.md (matrice des environnements).
 */
const STRICT_ENVIRONMENTS = ['test', 'production'];
const MIN_SECRET_LENGTH = 32;

/**
 * @param {Record<string, string|undefined>} env variables d'environnement (process.env)
 * @returns {string[]} liste des problèmes ; vide si la configuration est acceptable
 */
function validateConfig(env) {
  const problems = [];
  const appEnv = env.APP_ENV || 'development';

  if (!env.JWT_SECRET) {
    problems.push('JWT_SECRET doit être défini (voir server/.env.example)');
  }

  if (STRICT_ENVIRONMENTS.includes(appEnv)) {
    if (env.JWT_SECRET && env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
      problems.push(`JWT_SECRET doit contenir au moins ${MIN_SECRET_LENGTH} caractères en environnement « ${appEnv} »`);
    }
    if (env.ENABLE_DEMO_ACCOUNTS === 'true') {
      problems.push(`ENABLE_DEMO_ACCOUNTS=true est interdit en environnement « ${appEnv} » (comptes à mot de passe public)`);
    }
    if (!env.DB_PASSWORD) {
      problems.push(`DB_PASSWORD ne peut pas être vide en environnement « ${appEnv} »`);
    }
  }
  return problems;
}

module.exports = { validateConfig, STRICT_ENVIRONMENTS, MIN_SECRET_LENGTH };
