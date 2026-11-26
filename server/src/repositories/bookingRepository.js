/**
 * Accès aux réservations. `db` peut être le pool MySQL ou une connexion
 * (ce qui permet aux tests d'intégration d'utiliser une transaction annulée en fin de test).
 */
function createBookingRepository(db) {
  return {
    async findById(id) {
      const [rows] = await db.query(
        `SELECT b.id, b.status, b.passenger_id, b.trip_id, b.total_amount, t.departure_time
         FROM booking b JOIN trip t ON t.id = b.trip_id
         WHERE b.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async updateStatus(id, status) {
      const [result] = await db.query('UPDATE booking SET status = ? WHERE id = ?', [status, id]);
      return result.affectedRows;
    },

    async create({ status, totalAmount, passengerId, tripId, seats }) {
      const [result] = await db.query(
        `INSERT INTO booking (booking_date, status, total_amount, passenger_id, trip_id)
         VALUES (NOW(), ?, ?, ?, ?)`,
        [status, totalAmount, passengerId, tripId]
      );
      for (const seat of seats || []) {
        await db.query('INSERT INTO booking_seat (booking_id, seat_id) VALUES (?, ?)', [result.insertId, seat]);
      }
      return result.insertId;
    },

    async findSeatIds(bookingId) {
      const [rows] = await db.query(
        'SELECT seat_id FROM booking_seat WHERE booking_id = ? ORDER BY seat_id', [bookingId]
      );
      return rows.map((r) => r.seat_id);
    },

    async update(id, { status, totalAmount }) {
      const [result] = await db.query(
        'UPDATE booking SET status = COALESCE(?, status), total_amount = COALESCE(?, total_amount) WHERE id = ?',
        [status ?? null, totalAmount ?? null, id]
      );
      return result.affectedRows;
    },

    async delete(id) {
      const [result] = await db.query('DELETE FROM booking WHERE id = ?', [id]);
      return result.affectedRows;
    },
  };
}

module.exports = { createBookingRepository };
