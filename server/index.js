require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClientRole } = require('./src/services/roles');
const { calculateBookingTotal } = require('./src/services/pricing');
const { initialStatusFor } = require('./src/services/bookingStateMachine');
const { validateTrip } = require('./src/services/tripValidator');
const { BookingService } = require('./src/services/bookingService');
const { createBookingRepository } = require('./src/repositories/bookingRepository');
const { createBusRepository } = require('./src/repositories/busRepository');

// ANO-15 : plus de secret JWT par défaut ('secret') — le serveur refuse de démarrer sans JWT_SECRET.
// Lot 5 : règles plus strictes en environnement test/production (longueur du secret, comptes de démo…).
const { validateConfig } = require('./src/config');
const configProblems = validateConfig(process.env);
if (configProblems.length) {
  throw new Error(`Configuration invalide :\n - ${configProblems.join('\n - ')}`);
}
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

let pool;
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    // DB_PORT était documenté dans .env.example mais ignoré (connexion toujours sur 3306).
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bus_in_tunisia',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log("MySQL connection pool created.");
} catch (err) {
  console.error("Failed to create MySQL pool:", err);
}

const bookingService = new BookingService(createBookingRepository(pool));
const busRepository = createBusRepository(pool);

// Sonde de santé (health check) : utilisée par Docker (HEALTHCHECK), les smoke tests et la supervision.
// 200 si l'application ET la base répondent, 503 sinon. Expose la version déployée (traçabilité).
const startedAt = new Date();
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    version: process.env.APP_VERSION || 'dev',
    commit: process.env.GIT_SHA || 'unknown',
    environment: process.env.APP_ENV || 'development',
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database: 'up' },
  };
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    health.status = 'degraded';
    health.checks.database = 'down';
    health.error = err.code || 'DB_ERROR';
  }
  res.set('Cache-Control', 'no-store').status(health.status === 'ok' ? 200 : 503).json(health);
});

// Traduit les erreurs métier (statusCode) en réponse HTTP
const sendServiceError = (res, error) => {
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

// ANO-12 : les comptes de démonstration (dont un administrateur) ne sont actifs
// que si ENABLE_DEMO_ACCOUNTS=true (poste de démonstration), jamais par défaut.
const DEMO_ACCOUNTS_ENABLED = process.env.ENABLE_DEMO_ACCOUNTS === 'true';
const demoUsers = {
  'admin@bus.tn': {
    id: 9998,
    email: 'admin@bus.tn',
    name: 'Admin Demo',
    role: 'admin',
    password: 'admin123'
  },
  'user@bus.tn': {
    id: 9999,
    email: 'user@bus.tn',
    name: 'User Demo',
    role: 'user',
    password: 'user123'
  }
};

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Handle Demo accounts
  if (DEMO_ACCOUNTS_ENABLED && demoUsers[email] && password === demoUsers[email].password) {
    const user = {
      id: demoUsers[email].id,
      email: demoUsers[email].email,
      name: demoUsers[email].name,
      role: demoUsers[email].role
    };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, isDemo: true }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, user });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const dbUser = rows[0];
    const isMatch = await bcrypt.compare(password, dbUser.password);
    
    // Fallback logic in case the bcrypt version/hash algorithm isn't fully compatible 
    // with PHP's password_hash output (though usually bcrypt is compatible)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const role = getClientRole(dbUser.roles);
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: `${dbUser.first_name} ${dbUser.last_name}`.trim(),
      role: role
    };

    // Le rôle est inclus dans le jeton : il détermine le statut initial d'une réservation.
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM user WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const [first_name, ...rest] = name.split(' ');
    const last_name = rest.join(' ');
    const isOperator = role === 'operator';
    const roles = JSON.stringify(isOperator ? ['ROLE_OPERATOR'] : ['ROLE_USER']);
    const type = isOperator ? 'operator' : 'client';
    const now = new Date();

    const [result] = await pool.query(
      `INSERT INTO user (email, roles, password, first_name, last_name, created_at, type, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, roles, hashed, first_name || name, last_name || '', now, type, 0]
    );

    const user = {
      id: result.insertId,
      email,
      name,
      role: isOperator ? 'operator' : 'user'
    };

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Réserve les routes /api/admin/* aux administrateurs.
// Pour les comptes en base, le rôle est toujours relu en base (un rôle retiré prend effet immédiatement).
const requireAdmin = async (req, res, next) => {
  try {
    let role = req.user.isDemo && DEMO_ACCOUNTS_ENABLED ? req.user.role : null;
    if (!req.user.isDemo) {
      const [rows] = await pool.query('SELECT roles FROM user WHERE id = ?', [req.user.id]);
      role = rows.length ? getClientRole(rows[0].roles) : null;
    }
    if (role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
app.use('/api/admin', authMiddleware, requireAdmin);

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  if (req.user.isDemo && DEMO_ACCOUNTS_ENABLED) {
    const dUser = Object.values(demoUsers).find(u => u.id === req.user.id);
    if (dUser) {
      return res.json({ user: { id: dUser.id, email: dUser.email, name: dUser.name, role: dUser.role } });
    }
  }

  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const dbUser = rows[0];
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.first_name} ${dbUser.last_name}`.trim(),
        role: getClientRole(dbUser.roles)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/trips/search', async (req, res) => {
  const { departure, destination, date } = req.query;
  try {
    const query = `
      SELECT t.id, t.price, 
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time,
             DATE_FORMAT(t.arrival_time, '%H:%i') as arrival_time,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as date,
             b.type as bus_type, b.capacity as bus_capacity,
             c1.name as departure, c2.name as destination
      FROM trip t
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN bus b ON t.bus_id = b.id
      WHERE LOWER(c1.name) = LOWER(?) AND LOWER(c2.name) = LOWER(?)
      AND DATE(t.departure_time) = ?
    `;
    const [rows] = await pool.query(query, [departure, destination, date]);
    res.json({ trips: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/trips/:id', async (req, res) => {
  try {
    const query = `
      SELECT t.id, t.price, 
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time,
             DATE_FORMAT(t.arrival_time, '%H:%i') as arrival_time,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as date,
             b.type as bus_type, b.capacity as bus_capacity,
             c1.name as departure, c2.name as destination
      FROM trip t
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN bus b ON t.bus_id = b.id
      WHERE t.id = ?
    `;
    const [rows] = await pool.query(query, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    
    // Sièges occupés : réservations confirmées ET en attente (ANO-14)
    const [bookings] = await pool.query(`
      SELECT bs.seat_id
      FROM booking b
      JOIN booking_seat bs ON b.id = bs.booking_id
      WHERE b.trip_id = ? AND b.status IN ('pending', 'confirmed')
    `, [req.params.id]);
    const reservedSeats = bookings.map(b => parseInt(b.seat_id));

    res.json({ trip: rows[0], reservedSeats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  const { trip_id, seats } = req.body;
  if (!trip_id || !seats || !seats.length) {
    return res.status(400).json({ message: 'Trip ID and seats are required' });
  }
  
  if (!Array.isArray(seats)) {
    return res.status(400).json({ message: 'Seats must be an array' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE : verrouille le trajet => deux réservations simultanées du même trajet sont sérialisées
    const [trips] = await connection.query('SELECT price FROM trip WHERE id = ? FOR UPDATE', [trip_id]);
    if (trips.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Trip not found' }); // ANO-04
    }

    // Règles de tarification : 1 à 9 sièges, pas de doublon (ANO-11) — lève PricingError (400)
    const totalAmount = calculateBookingTotal(trips[0].price, seats);

    // Sièges déjà occupés sur ce trajet (réservations en attente ou confirmées) — ANO-03
    const [taken] = await connection.query(
      `SELECT bs.seat_id FROM booking b JOIN booking_seat bs ON bs.booking_id = b.id
       WHERE b.trip_id = ? AND b.status IN ('pending', 'confirmed') AND bs.seat_id IN (?)`,
      [trip_id, seats]
    );
    if (taken.length > 0) {
      await connection.rollback();
      const list = taken.map((t) => t.seat_id).join(', ');
      return res.status(409).json({ message: `Seat(s) ${list} already reserved` });
    }

    const [result] = await connection.query(
      `INSERT INTO booking (booking_date, status, total_amount, passenger_id, trip_id)
       VALUES (NOW(), ?, ?, ?, ?)`,
      [initialStatusFor(req.user.role), totalAmount, req.user.id, trip_id]
    );
    const bookingId = result.insertId;

    for (const seatNum of seats) {
      await connection.query('INSERT INTO booking_seat (booking_id, seat_id) VALUES (?, ?)', [bookingId, seatNum]);
    }

    await connection.commit();
    res.json({ message: 'Booking successful', reservation_id: bookingId, total_amount: totalAmount });
  } catch (error) {
    await connection.rollback();
    if (error.statusCode) return sendServiceError(res, error);
    console.error(error);
    res.status(500).json({ message: 'Booking failed' });
  } finally {
    connection.release();
  }
});

app.get('/api/bookings/my', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT b.id, b.status, b.booking_date as date, 
             t.id as trip_id, t.price,
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as trip_date,
             c1.name as departure, c2.name as destination,
             bus.type as bus_type,
             (SELECT GROUP_CONCAT(seat_id) FROM booking_seat WHERE booking_id = b.id) as seats
      FROM booking b
      JOIN trip t ON b.trip_id = t.id
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN bus ON t.bus_id = bus.id
      WHERE b.passenger_id = ?
      ORDER BY b.booking_date DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    const bookings = rows.map(r => ({
      ...r,
      date: r.trip_date, // Frontend expects trip date as 'date'
      seats: r.seats ? r.seats.split(',').map(Number) : []
    }));
    res.json({ bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  // Machine à états : 404 si la réservation n'existe pas ou appartient à un autre passager (ANO-06),
  // 409 si la transition est interdite (déjà annulée, voyage passé) (ANO-05)
  try {
    await bookingService.cancelByPassenger(Number(req.params.id), req.user.id);
    res.json({ message: 'Cancelled' });
  } catch (error) {
    sendServiceError(res, error);
  }
});

app.get('/api/tickets/:id', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT b.id as reservation_id, b.status, b.total_amount,
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time,
             DATE_FORMAT(t.arrival_time, '%H:%i') as arrival_time,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as date,
             c1.name as departure, c2.name as destination,
             u.first_name, u.last_name, u.email,
             (SELECT GROUP_CONCAT(seat_id) FROM booking_seat WHERE booking_id = b.id) as seats
      FROM booking b
      JOIN trip t ON b.trip_id = t.id
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN user u ON b.passenger_id = u.id
      WHERE b.id = ? AND b.passenger_id = ?
    `;
    const [rows] = await pool.query(query, [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
    
    const ticket = rows[0];
    ticket.passenger = { name: `${ticket.first_name} ${ticket.last_name}`.trim(), email: ticket.email };
    ticket.seats = ticket.seats ? ticket.seats.split(',').map(Number) : [];
    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
  const { trip_id, rating, comment } = req.body;
  if (!trip_id || !rating) return res.status(400).json({ message: 'Missing trip_id or rating' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' }); // ANO-13
  }

  try {
    const [existing] = await pool.query('SELECT id FROM review WHERE trip_id = ? AND passenger_id = ?', [trip_id, req.user.id]);
    if (existing.length > 0) {
      await pool.query('UPDATE review SET rating = ?, comment = ? WHERE id = ?', [rating, comment || '', existing[0].id]);
    } else {
      await pool.query('INSERT INTO review (trip_id, passenger_id, rating, comment) VALUES (?, ?, ?, ?)', [trip_id, req.user.id, rating, comment || '']);
    }
    res.json({ message: 'Review saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: get all bookings with passenger info
app.get('/api/admin/bookings', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT b.id, b.status, b.booking_date, b.total_amount,
             u.first_name, u.last_name, u.email,
             c1.name as departure, c2.name as arrival,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as trip_date,
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time
      FROM booking b
      JOIN user u ON b.passenger_id = u.id
      JOIN trip t ON b.trip_id = t.id
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      ORDER BY b.booking_date DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/bookings/:id/confirm', authMiddleware, async (req, res) => {
  // Seule une réservation en attente peut être confirmée (ANO-05)
  try {
    await bookingService.confirmByAdmin(Number(req.params.id));
    res.json({ message: 'Booking confirmed' });
  } catch (err) {
    sendServiceError(res, err);
  }
});

app.put('/api/admin/bookings/:id/reject', authMiddleware, async (req, res) => {
  // Seule une réservation en attente peut être rejetée (ANO-05)
  try {
    await bookingService.rejectByAdmin(Number(req.params.id));
    res.json({ message: 'Booking rejected' });
  } catch (err) {
    sendServiceError(res, err);
  }
});

// Admin: group requests management
app.get('/api/admin/groups', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.*, u.first_name, u.last_name, u.email,
             c1.name as departure, c2.name as destination
      FROM group_trip g
      JOIN user u ON g.passenger_id = u.id
      JOIN city c1 ON g.departure_city_id = c1.id
      JOIN city c2 ON g.arrival_city_id = c2.id
      ORDER BY g.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/groups/:id/confirm', authMiddleware, async (req, res) => {
  const { price } = req.body;
  try {
    await pool.query("UPDATE group_trip SET status = 'accepted', price = ? WHERE id = ?", [price || null, req.params.id]);
    res.json({ message: 'Group request confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/groups/:id/reject', authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE group_trip SET status = 'rejected' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Group request rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) as c FROM user WHERE roles LIKE \'%"ROLE_USER"%\'');
    const [[bookings]] = await pool.query('SELECT COUNT(*) as c FROM booking');
    const [[revenue]] = await pool.query('SELECT SUM(total_amount) as c FROM booking WHERE status="confirmed"');
    res.json({ users: users.c, bookings: bookings.c, revenue: revenue.c || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, first_name, last_name, email, roles FROM user');
    res.json({ users: users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim(), email: u.email, role: u.roles })) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/cities', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM city ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/buses', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.id, b.registration_number, b.capacity, b.type, b.operator_id, 
             u.first_name, u.last_name, u.email 
      FROM bus b 
      LEFT JOIN user u ON b.operator_id = u.id
    `);
    res.json(rows.map(r => ({
      ...r, 
      operator_name: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : 'Unassigned'
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const validateBusPayload = ({ registration_number, capacity, type, operator_id } = {}) => {
  const errors = [];
  if (!registration_number || !String(registration_number).trim()) errors.push('Registration number is required');
  if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) errors.push('Capacity must be a positive integer');
  if (!type) errors.push('Type is required');
  if (!operator_id) errors.push('Operator is required'); // colonne NOT NULL (ANO-16)
  return errors;
};

// Erreurs d'intégrité MySQL -> codes HTTP explicites au lieu de 500
const sendBusDbError = (res, err) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Registration number already exists' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'Operator does not exist' });
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
};

app.post('/api/admin/buses', authMiddleware, async (req, res) => {
  const errors = validateBusPayload(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const id = await busRepository.create(req.body);
    res.json({ message: 'Bus created', id });
  } catch (err) {
    sendBusDbError(res, err);
  }
});

app.put('/api/admin/buses/:id', authMiddleware, async (req, res) => {
  const errors = validateBusPayload(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const affected = await busRepository.update(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: 'Bus not found' });
    res.json({ message: 'Bus updated' });
  } catch (err) {
    sendBusDbError(res, err);
  }
});

app.delete('/api/admin/buses/:id', authMiddleware, async (req, res) => {
  try {
    if (await busRepository.hasTrips(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete bus assigned to active trips' });
    }
    const affected = await busRepository.delete(req.params.id);
    if (!affected) return res.status(404).json({ message: 'Bus not found' });
    res.json({ message: 'Bus deleted' });
  } catch (err) {
    sendBusDbError(res, err);
  }
});

app.get('/api/admin/operators', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, first_name, last_name, email FROM user WHERE roles LIKE \'%"ROLE_OPERATOR"%\'');
    res.json({ operators: users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim(), email: u.email })) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Routes CRUD
app.get('/api/admin/routes', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT r.id, r.distance, r.duration, 
             c1.name as departure_city, c2.name as arrival_city,
             r.departure_city_id, r.arrival_city_id
      FROM route r
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      ORDER BY r.id DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/routes', authMiddleware, async (req, res) => {
  const { departure_city_id, arrival_city_id, distance, duration } = req.body;
  if (departure_city_id === arrival_city_id) {
    return res.status(400).json({ message: 'Departure and arrival cities cannot be the same' });
  }
  try {
    const [existing] = await pool.query(
      'SELECT id FROM route WHERE departure_city_id = ? AND arrival_city_id = ? LIMIT 1',
      [departure_city_id, arrival_city_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A route between these two cities already exists' });
    }

    await pool.query(
      'INSERT INTO route (departure_city_id, arrival_city_id, distance, duration) VALUES (?, ?, ?, ?)',
      [departure_city_id, arrival_city_id, distance || 0, duration || '00:00:00']
    );
    res.json({ message: 'Route created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/routes/:id', authMiddleware, async (req, res) => {
  const { departure_city_id, arrival_city_id, distance, duration } = req.body;
  if (departure_city_id === arrival_city_id) {
    return res.status(400).json({ message: 'Departure and arrival cities cannot be the same' });
  }
  try {
    await pool.query(
      'UPDATE route SET departure_city_id=?, arrival_city_id=?, distance=?, duration=? WHERE id=?',
      [departure_city_id, arrival_city_id, distance || 0, duration || '00:00:00', req.params.id]
    );
    res.json({ message: 'Route updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/routes/:id', authMiddleware, async (req, res) => {
  try {
    const [trips] = await pool.query('SELECT id FROM trip WHERE route_id = ? LIMIT 1', [req.params.id]);
    if (trips.length > 0) return res.status(400).json({ message: 'Cannot delete route with active trips' });
    
    await pool.query('DELETE FROM route WHERE id=?', [req.params.id]);
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Trips CRUD
const validateTripPayload = (body) => {
  const errors = validateTrip(body);
  if (!body.route_id) errors.push('Route is required');
  if (!body.bus_id) errors.push('Bus is required');
  return errors;
};

app.get('/api/admin/trips', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT t.id, t.price, t.departure_time, t.arrival_time,
             t.route_id, t.bus_id,
             c1.name as departure, c2.name as arrival,
             b.registration_number as bus_reg
      FROM trip t
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN bus b ON t.bus_id = b.id
      ORDER BY t.departure_time DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/trips', authMiddleware, async (req, res) => {
  const { route_id, bus_id, departure_time, arrival_time, price } = req.body;
  const errors = validateTripPayload(req.body); // ANO-08
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  try {
    // Disponibilité du bus : deux intervalles se chevauchent si début1 < fin2 ET fin1 > début2 (ANO-07)
    const [overlaps] = await pool.query(`
      SELECT id FROM trip
      WHERE bus_id = ? AND departure_time < ? AND arrival_time > ?
      LIMIT 1
    `, [bus_id, arrival_time, departure_time]);

    if (overlaps.length > 0) {
      return res.status(400).json({ message: 'Bus is already scheduled for another trip during this time window' });
    }

    await pool.query(
      'INSERT INTO trip (route_id, bus_id, departure_time, arrival_time, price) VALUES (?, ?, ?, ?, ?)',
      [route_id, bus_id, departure_time, arrival_time, price]
    );
    res.json({ message: 'Trip created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/trips/:id', authMiddleware, async (req, res) => {
  const { route_id, bus_id, departure_time, arrival_time, price } = req.body;
  const tripId = req.params.id;
  const errors = validateTripPayload(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  try {
    const [overlaps] = await pool.query(`
      SELECT id FROM trip
      WHERE bus_id = ? AND id != ? AND departure_time < ? AND arrival_time > ?
      LIMIT 1
    `, [bus_id, tripId, arrival_time, departure_time]);

    if (overlaps.length > 0) {
      return res.status(400).json({ message: 'Bus is already scheduled for another trip during this time window' });
    }

    await pool.query(
      'UPDATE trip SET route_id=?, bus_id=?, departure_time=?, arrival_time=?, price=? WHERE id=?',
      [route_id, bus_id, departure_time, arrival_time, price, tripId]
    );
    res.json({ message: 'Trip updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/trips/:id', authMiddleware, async (req, res) => {
  try {
    const [bookings] = await pool.query('SELECT id FROM booking WHERE trip_id = ? AND status="confirmed" LIMIT 1', [req.params.id]);
    if (bookings.length > 0) return res.status(400).json({ message: 'Cannot delete trip with active confirmed bookings' });
    
    await pool.query('DELETE FROM trip WHERE id=?', [req.params.id]);
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/groups', authMiddleware, async (req, res) => {
  const { departure, destination, date, preferred_time, people_count, trip_type, bus_pref, notes, estimated_price } = req.body;
  
  if (!departure || !destination || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const [c1] = await pool.query('SELECT id FROM city WHERE name = ?', [departure]);
    const [c2] = await pool.query('SELECT id FROM city WHERE name = ?', [destination]);
    
    if (c1.length === 0 || c2.length === 0) {
      return res.status(400).json({ message: 'Invalid departure or destination city' });
    }

    await pool.query(
      `INSERT INTO group_trip (passenger_id, departure_city_id, arrival_city_id, travel_date, preferred_time, people_count, trip_type, bus_pref, notes, estimated_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, c1[0].id, c2[0].id, date, preferred_time || null, people_count, trip_type, bus_pref, notes || null, estimated_price || 0]
    );

    res.json({ message: 'Group request submitted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/groups/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.id, g.status, g.travel_date as date, g.people_count, g.trip_type, g.price, g.estimated_price,
             c1.name as departure, c2.name as destination
      FROM group_trip g
      JOIN city c1 ON g.departure_city_id = c1.id
      JOIN city c2 ON g.arrival_city_id = c2.id
      WHERE g.passenger_id = ?
      ORDER BY g.created_at DESC
    `, [req.user.id]);
    res.json({ groups: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/operator/trips', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT t.id, t.price,
             DATE_FORMAT(t.departure_time, '%Y-%m-%d') as date,
             DATE_FORMAT(t.departure_time, '%H:%i') as departure_time,
             DATE_FORMAT(t.arrival_time, '%H:%i') as arrival_time,
             c1.name as departure, c2.name as arrival,
             b.registration_number as bus_reg, b.capacity,
             (SELECT COUNT(*) FROM booking_seat bs JOIN booking bk ON bs.booking_id = bk.id WHERE bk.trip_id = t.id AND bk.status = 'confirmed') as booked_seats
      FROM trip t
      JOIN route r ON t.route_id = r.id
      JOIN city c1 ON r.departure_city_id = c1.id
      JOIN city c2 ON r.arrival_city_id = c2.id
      JOIN bus b ON t.bus_id = b.id
      WHERE b.operator_id = ?
      ORDER BY t.departure_time ASC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json({ trips: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// En conteneur, le même serveur sert l'interface React construite (CLIENT_DIST) : une seule image à
// versionner, déployer et restaurer. Les routes /api inconnues restent des 404 JSON.
const CLIENT_DIST = process.env.CLIENT_DIST;
if (CLIENT_DIST && require('fs').existsSync(CLIENT_DIST)) {
  const path = require('path');
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html')); // routage côté client (React Router)
  });
}
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Démarre le serveur seulement si le fichier est lancé directement (node index.js) ;
// importé par les tests (supertest), il expose l'application sans ouvrir de port.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, pool };
