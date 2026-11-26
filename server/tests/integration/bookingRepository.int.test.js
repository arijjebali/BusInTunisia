/**
 * Tests d'intégration — réservation (booking) sur la base MariaDB de test.
 *
 * Reproductibilité :
 *  1. beforeAll  : resetTestDb() recrée la base bus_in_tunisia_test (DROP + schéma + seed.sql à ids fixes).
 *  2. beforeEach : BEGIN — chaque test s'exécute dans sa propre transaction.
 *  3. afterEach  : ROLLBACK — toutes les écritures du test sont annulées.
 * => chaque test démarre exactement sur le jeu de données du seed, quel que soit l'ordre d'exécution.
 */
const mysql = require('mysql2/promise');
const { testDbConfig } = require('../db/testDbConfig');
const { resetTestDb } = require('../db/resetTestDb');
const { createBookingRepository } = require('../../src/repositories/bookingRepository');

let conn;
let repo;

beforeAll(async () => {
  await resetTestDb();
  conn = await mysql.createConnection(testDbConfig);
  const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
  if (!db.endsWith('_test')) throw new Error(`Base inattendue : ${db}`); // garde-fou anti-production
  repo = createBookingRepository(conn);
});

afterAll(async () => {
  await conn.end();
});

beforeEach(async () => {
  await conn.beginTransaction();
});

afterEach(async () => {
  await conn.rollback();
});

async function countBookings() {
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM booking');
  return n;
}

describe('CRUD booking', () => {
  test('IT-01 Create : insère une réservation et ses sièges, retrouvables en base', async () => {
    // Arrange
    const data = { status: 'confirmed', totalAmount: 50, passengerId: 4, tripId: 3, seats: [50, 51] };

    // Act
    const id = await repo.create(data);

    // Assert
    const [rows] = await conn.query('SELECT status, total_amount, passenger_id, trip_id FROM booking WHERE id = ?', [id]);
    expect(rows[0]).toEqual({ status: 'confirmed', total_amount: 50, passenger_id: 4, trip_id: 3 });
    expect(await repo.findSeatIds(id)).toEqual([50, 51]);
  });

  test('IT-02 Read : lit la réservation 1 du seed avec son contenu attendu', async () => {
    // Arrange
    const id = 1;

    // Act
    const booking = await repo.findById(id);

    // Assert
    expect(booking).toMatchObject({ id: 1, status: 'confirmed', passenger_id: 3, trip_id: 1, total_amount: 30 });
  });

  test('IT-03 Read : renvoie null pour une réservation inexistante', async () => {
    // Arrange
    const id = 9999;

    // Act
    const booking = await repo.findById(id);

    // Assert
    expect(booking).toBeNull();
  });

  test('IT-04 Update : passe la réservation 2 de pending à confirmed', async () => {
    // Arrange
    const id = 2;

    // Act
    const affected = await repo.update(id, { status: 'confirmed' });

    // Assert
    expect(affected).toBe(1);
    expect((await repo.findById(id)).status).toBe('confirmed');
  });

  test('IT-05 Delete : supprime la réservation 3 et ses sièges (cascade)', async () => {
    // Arrange
    const id = 3;

    // Act
    const affected = await repo.delete(id);

    // Assert
    expect(affected).toBe(1);
    expect(await repo.findById(id)).toBeNull();
    expect(await repo.findSeatIds(id)).toEqual([]);
  });
});

describe('Contraintes d\'intégrité', () => {
  test('IT-06 FK : refuse une réservation sur un trajet inexistant', async () => {
    // Arrange
    const data = { status: 'confirmed', totalAmount: 15, passengerId: 3, tripId: 9999, seats: [] };

    // Act
    const act = repo.create(data);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  test('IT-07 FK : refuse une réservation pour un passager inexistant', async () => {
    // Arrange
    const data = { status: 'confirmed', totalAmount: 15, passengerId: 9999, tripId: 1, seats: [] };

    // Act
    const act = repo.create(data);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  test('IT-08 NOT NULL : refuse une réservation sans statut', async () => {
    // Arrange
    const sql = 'INSERT INTO booking (booking_date, status, total_amount, passenger_id, trip_id) VALUES (NOW(), NULL, 15, 3, 1)';

    // Act
    const act = conn.query(sql);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_BAD_NULL_ERROR' });
  });

  test('IT-09 PK composite : refuse le même siège deux fois dans une même réservation', async () => {
    // Arrange
    const sql = 'INSERT INTO booking_seat (booking_id, seat_id) VALUES (1, 1)'; // (1,1) existe déjà dans le seed

    // Act
    const act = conn.query(sql);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  test('IT-10 UNIQUE : refuse un second ticket pour la même réservation', async () => {
    // Arrange
    await conn.query("INSERT INTO ticket (ticket_code, issue_date, booking_id) VALUES ('TK-A', NOW(), 1)");

    // Act
    const act = conn.query("INSERT INTO ticket (ticket_code, issue_date, booking_id) VALUES ('TK-B', NOW(), 1)");

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  test('IT-11 FK RESTRICT : refuse de supprimer une réservation qui possède un ticket', async () => {
    // Arrange
    await conn.query("INSERT INTO ticket (ticket_code, issue_date, booking_id) VALUES ('TK-C', NOW(), 5)");

    // Act
    const act = repo.delete(5);

    // Assert
    await expect(act).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  });
});

describe('Isolation', () => {
  test('IT-12 retrouve exactement les 5 réservations du seed, malgré les écritures des autres tests', async () => {
    // Arrange (rien : état fourni par seed + rollback)

    // Act
    const n = await countBookings();

    // Assert
    expect(n).toBe(5);
  });
});
