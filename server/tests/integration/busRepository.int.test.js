/**
 * Tests d'intégration — CRUD de l'entité Bus (busRepository) sur la base de test.
 * Même protocole que bookingRepository.int.test.js : reset + seed, puis une transaction annulée par test.
 */
const mysql = require('mysql2/promise');
const { testDbConfig } = require('../db/testDbConfig');
const { resetTestDb } = require('../db/resetTestDb');
const { createBusRepository } = require('../../src/repositories/busRepository');

let conn;
let repo;

beforeAll(async () => {
  await resetTestDb();
  conn = await mysql.createConnection(testDbConfig);
  const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
  if (!db.endsWith('_test')) throw new Error(`Base inattendue : ${db}`);
  repo = createBusRepository(conn);
});

afterAll(async () => { await conn.end(); });
beforeEach(async () => { await conn.beginTransaction(); });
afterEach(async () => { await conn.rollback(); });

describe('CRUD bus', () => {
  test('IT-13 Create + Read : un bus créé est relu à l\'identique', async () => {
    // Arrange
    const data = { registration_number: 'TUN-2001', capacity: 50, type: 'VIP', operator_id: 2 };

    // Act
    const id = await repo.create(data);

    // Assert
    expect(await repo.findById(id)).toEqual({ id, ...data });
  });

  test('IT-14 Read all : liste les 3 bus du seed avec le nom de leur opérateur', async () => {
    // Arrange (seed)

    // Act
    const buses = await repo.findAll();

    // Assert
    expect(buses.map((b) => b.registration_number)).toEqual(['TUN-1001', 'TUN-1002', 'TUN-1003']);
    expect(buses[0]).toMatchObject({ first_name: 'Operateur', email: 'operator.test@bus.tn' });
  });

  test('IT-15 Update : modifie la capacité du bus 3', async () => {
    // Arrange
    const changes = { registration_number: 'TUN-1003', capacity: 35, type: 'Comfort', operator_id: 2 };

    // Act
    const affected = await repo.update(3, changes);

    // Assert
    expect(affected).toBe(1);
    expect((await repo.findById(3)).capacity).toBe(35);
  });

  test('IT-16 Delete : supprime le bus 3 qui n\'a aucun trajet', async () => {
    // Arrange
    expect(await repo.hasTrips(3)).toBe(false);

    // Act
    const affected = await repo.delete(3);

    // Assert
    expect(affected).toBe(1);
    expect(await repo.findById(3)).toBeNull();
  });
});

describe('Contraintes d\'intégrité bus', () => {
  test('IT-17 UNIQUE : refuse deux bus avec la même immatriculation', async () => {
    // Arrange
    const data = { registration_number: 'TUN-1001', capacity: 40, type: 'Standard', operator_id: 2 };

    // Act
    const act = repo.create(data);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  test('IT-18 NOT NULL : refuse un bus sans opérateur (origine de ANO-16)', async () => {
    // Arrange
    const data = { registration_number: 'TUN-2002', capacity: 40, type: 'Standard', operator_id: null };

    // Act
    const act = repo.create(data);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_BAD_NULL_ERROR' });
  });

  test('IT-19 FK RESTRICT : refuse de supprimer le bus 1 qui porte des trajets', async () => {
    // Arrange
    expect(await repo.hasTrips(1)).toBe(true);

    // Act
    const act = repo.delete(1);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  });
});
