/** Convertit la colonne JSON `user.roles` (format Symfony) en rôle client. */
const getClientRole = (rolesStr) => {
  try {
    const roles = JSON.parse(rolesStr);
    if (roles.includes('ROLE_ADMIN')) return 'admin';
    if (roles.includes('ROLE_OPERATOR')) return 'operator';
    return 'user';
  } catch (e) {
    return 'user';
  }
};

module.exports = { getClientRole };
