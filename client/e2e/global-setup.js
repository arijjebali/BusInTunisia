// Réinitialise la base bus_in_tunisia_test (schéma + seed) avant la campagne E2E => exécution reproductible.
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { resetTestDb } = require('../../server/tests/db/resetTestDb')

export default async function globalSetup() {
  await resetTestDb()
}
