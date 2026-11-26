// Configuration de la base dédiée aux tests — distincte de la base de production.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true });

const testDbConfig = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
  database: process.env.TEST_DB_NAME || 'bus_in_tunisia_test',
};

module.exports = { testDbConfig };
