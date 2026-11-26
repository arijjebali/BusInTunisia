/**
 * Convertit la colonne JSON `user.roles` (format Symfony) en rôle client.
 * Accepte le texte JSON (mysql2 ≤ 3.23) comme le tableau déjà décodé (mysql2 ≥ 3.24 décode les colonnes
 * JSON de MariaDB) : voir ANO-20.
 */
const getClientRole = (rolesValue) => {
  let roles = rolesValue;
  if (typeof roles === 'string') {
    try {
      roles = JSON.parse(roles);
    } catch {
      return 'user';
    }
  }
  if (!Array.isArray(roles)) return 'user';
  if (roles.includes('ROLE_ADMIN')) return 'admin';
  if (roles.includes('ROLE_OPERATOR')) return 'operator';
  return 'user';
};

module.exports = { getClientRole };
