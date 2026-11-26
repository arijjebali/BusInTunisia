/**
 * Réinitialise la base de test : DROP + CREATE + schéma + seed.
 * Idempotent : peut être exécuté autant de fois que nécessaire.
 * Garde-fou : refuse toute base dont le nom ne se termine pas par "_test".
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { testDbConfig } = require('./testDbConfig');

async function resetTestDb() {
  const { database, ...serverCfg } = testDbConfig;
  if (!/_test$/.test(database)) {
    throw new Error(`Refus de réinitialiser "${database}" : seule une base *_test est autorisée`);
  }
  const fixtures = path.join(__dirname, '..', 'fixtures');
  const schema = fs.readFileSync(path.join(fixtures, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(fixtures, 'seed.sql'), 'utf8');

  const conn = await mysql.createConnection({ ...serverCfg, multipleStatements: true });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    await conn.query(`USE \`${database}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query(schema);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query(seed);
  } finally {
    await conn.end();
  }
}

module.exports = { resetTestDb };

if (require.main === module) {
  resetTestDb()
    .then(() => console.log(`Base de test "${testDbConfig.database}" réinitialisée.`))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
