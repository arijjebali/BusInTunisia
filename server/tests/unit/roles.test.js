const { getClientRole } = require('../../src/services/roles');

// Partitions d'équivalence sur la colonne JSON user.roles (format Symfony)
describe('getClientRole', () => {
  test.each([
    ['["ROLE_ADMIN"]', 'admin'],
    ['["ROLE_OPERATOR"]', 'operator'],
    ['["ROLE_USER"]', 'user'],
    ['["ROLE_USER","ROLE_ADMIN"]', 'admin'],      // le rôle le plus élevé l'emporte
    ['["ROLE_OPERATOR","ROLE_ADMIN"]', 'admin'],
    ['[]', 'user'],                               // aucun rôle => client
  ])('convertit %s en "%s"', (roles, expected) => {
    // Arrange (données du tableau)

    // Act
    const role = getClientRole(roles);

    // Assert
    expect(role).toBe(expected);
  });

  test.each([null, undefined, '', 'ROLE_ADMIN', '{not json'])(
    'retombe sur "user" (moindre privilège) quand la valeur %p n\'est pas un JSON valide',
    (roles) => {
      // Arrange (donnée invalide)

      // Act
      const role = getClientRole(roles);

      // Assert
      expect(role).toBe('user');
    }
  );
});
