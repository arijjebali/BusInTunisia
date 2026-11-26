/**
 * Tests d'intégration HTTP -> Express -> MySQL (supertest), sans ouvrir de port.
 * Vérifient ce que la collection Postman ne peut pas vérifier : l'état réel de la base
 * après la requête, et le comportement sous requêtes concurrentes.
 *
 * La base est réinitialisée une fois (beforeAll) ; les tests écrivent réellement
 * (pas de transaction englobante possible à travers le pool) => exécution --runInBand,
 * dans l'ordre du fichier, chaque test utilisant des sièges qui lui sont propres.
 */
const request = require('supertest');
const { testDbConfig } = require('../db/testDbConfig');
const { resetTestDb } = require('../db/resetTestDb');

process.env.DB_NAME = testDbConfig.database; // avant le require de l'application
const { app, pool } = require('../../index');

const login = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
};
const seatsOfTrip = async (tripId, seat) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.status FROM booking b JOIN booking_seat bs ON bs.booking_id = b.id
     WHERE b.trip_id = ? AND bs.seat_id = ?`, [tripId, seat]);
  return rows;
};

let clientToken;
let client2Token;
let adminToken;

beforeAll(async () => {
  await resetTestDb();
  clientToken = await login('client.test@bus.tn', 'Client123!');
  client2Token = await login('client2.test@bus.tn', 'Client123!');
  adminToken = await login('admin.test@bus.tn', 'Admin123!');
});

afterAll(async () => { await pool.end(); });

describe('Réservation — persistance et cohérence', () => {
  test('IT-20 la réservation de 2 sièges persiste le montant prix × sièges et le statut confirmed', async () => {
    // Arrange
    const body = { trip_id: 1, seats: [11, 12] };

    // Act
    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${clientToken}`).send(body);

    // Assert
    expect(res.status).toBe(200);
    const [[row]] = await pool.query('SELECT status, total_amount, passenger_id FROM booking WHERE id = ?', [res.body.reservation_id]);
    expect(row).toEqual({ status: 'confirmed', total_amount: 30, passenger_id: 3 });
  });

  test('IT-21 deux réservations simultanées du même siège : une seule réussit, aucun doublon en base', async () => {
    // Arrange
    const body = { trip_id: 1, seats: [15] };
    const book = (token) => request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(body);

    // Act
    const responses = await Promise.all([book(clientToken), book(client2Token)]);

    // Assert
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await seatsOfTrip(1, 15)).toHaveLength(1);
  });

  test('IT-22 une réservation refusée (409) ne laisse aucune ligne orpheline (rollback)', async () => {
    // Arrange
    const [[{ n: before }]] = await pool.query('SELECT COUNT(*) AS n FROM booking');

    // Act
    const res = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`).send({ trip_id: 1, seats: [16, 1] }); // 1 est déjà pris

    // Assert
    expect(res.status).toBe(409);
    const [[{ n: after }]] = await pool.query('SELECT COUNT(*) AS n FROM booking');
    expect(after).toBe(before);
    expect(await seatsOfTrip(1, 16)).toHaveLength(0);
  });

  test('IT-23 un siège redevient libre après annulation et peut être réservé à nouveau', async () => {
    // Arrange
    const first = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`).send({ trip_id: 1, seats: [17] });
    await request(app).put(`/api/bookings/${first.body.reservation_id}/cancel`).set('Authorization', `Bearer ${clientToken}`);

    // Act
    const trip = await request(app).get('/api/trips/1');
    const again = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${client2Token}`).send({ trip_id: 1, seats: [17] });

    // Assert
    expect(trip.body.reservedSeats).not.toContain(17);
    expect(again.status).toBe(200);
  });

  test('IT-24 le siège d\'une réservation en attente (pending) est affiché comme occupé (ANO-14)', async () => {
    // Arrange : la réservation 2 du seed est pending sur le siège 3

    // Act
    const res = await request(app).get('/api/trips/1');

    // Assert
    expect(res.body.reservedSeats).toEqual(expect.arrayContaining([1, 2, 3, 5]));
  });
});

describe('Administration — contrôle d\'accès et validations', () => {
  test('IT-25 un client ne peut pas créer de bus (403) et rien n\'est inséré', async () => {
    // Arrange
    const bus = { registration_number: 'TUN-9001', capacity: 40, type: 'Standard', operator_id: 2 };

    // Act
    const res = await request(app).post('/api/admin/buses').set('Authorization', `Bearer ${clientToken}`).send(bus);

    // Assert
    expect(res.status).toBe(403);
    const [rows] = await pool.query("SELECT id FROM bus WHERE registration_number = 'TUN-9001'");
    expect(rows).toHaveLength(0);
  });

  test('IT-26 bus sans opérateur -> 400 explicite au lieu de 500 (ANO-16)', async () => {
    // Arrange
    const bus = { registration_number: 'TUN-9002', capacity: 40, type: 'Standard', operator_id: '' };

    // Act
    const res = await request(app).post('/api/admin/buses').set('Authorization', `Bearer ${adminToken}`).send(bus);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Operator is required');
  });

  test('IT-27 immatriculation en double -> 409', async () => {
    // Arrange
    const bus = { registration_number: 'TUN-1001', capacity: 40, type: 'Standard', operator_id: 2 };

    // Act
    const res = await request(app).post('/api/admin/buses').set('Authorization', `Bearer ${adminToken}`).send(bus);

    // Assert
    expect(res.status).toBe(409);
  });

  test('IT-28 un trajet qui commence exactement à l\'arrivée du précédent (même bus) est accepté (valeur limite)', async () => {
    // Arrange : trajet 1 = bus 1, 08:00 -> 10:30
    const trip = { route_id: 1, bus_id: 1, departure_time: '2030-01-15 10:30:00', arrival_time: '2030-01-15 13:00:00', price: 15 };

    // Act
    const res = await request(app).post('/api/admin/trips').set('Authorization', `Bearer ${adminToken}`).send(trip);

    // Assert
    expect(res.status).toBe(200);
  });

  test('IT-29 un trajet qui chevauche d\'une minute le précédent (même bus) est refusé (limite + 1)', async () => {
    // Arrange
    const trip = { route_id: 1, bus_id: 1, departure_time: '2030-01-15 10:29:00', arrival_time: '2030-01-15 12:00:00', price: 15 };

    // Act
    const res = await request(app).post('/api/admin/trips').set('Authorization', `Bearer ${adminToken}`).send(trip);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already scheduled/);
  });
});
