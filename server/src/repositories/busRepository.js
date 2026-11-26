/**
 * CRUD de l'entité Bus (utilisé par les routes /api/admin/buses).
 * `db` = pool MySQL ou connexion transactionnelle.
 */
function createBusRepository(db) {
  return {
    async create({ registration_number, capacity, type, operator_id }) {
      const [result] = await db.query(
        'INSERT INTO bus (registration_number, capacity, type, operator_id) VALUES (?, ?, ?, ?)',
        [registration_number, capacity, type, operator_id ?? null]
      );
      return result.insertId;
    },

    async findById(id) {
      const [rows] = await db.query(
        'SELECT id, registration_number, capacity, type, operator_id FROM bus WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    },

    async findAll() {
      const [rows] = await db.query(`
        SELECT b.id, b.registration_number, b.capacity, b.type, b.operator_id,
               u.first_name, u.last_name, u.email
        FROM bus b
        LEFT JOIN user u ON b.operator_id = u.id
        ORDER BY b.id`);
      return rows;
    },

    async update(id, { registration_number, capacity, type, operator_id }) {
      const [result] = await db.query(
        'UPDATE bus SET registration_number=?, capacity=?, type=?, operator_id=? WHERE id=?',
        [registration_number, capacity, type, operator_id ?? null, id]
      );
      return result.affectedRows;
    },

    async hasTrips(id) {
      const [rows] = await db.query('SELECT id FROM trip WHERE bus_id = ? LIMIT 1', [id]);
      return rows.length > 0;
    },

    async delete(id) {
      const [result] = await db.query('DELETE FROM bus WHERE id = ?', [id]);
      return result.affectedRows;
    },
  };
}

module.exports = { createBusRepository };
