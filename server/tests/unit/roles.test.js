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

  // ANO-20 : depuis mysql2 3.24, la colonne JSON arrive déjà décodée (tableau) au lieu d'un texte.
  test.each([
    [['ROLE_ADMIN'], 'admin'],
    [['ROLE_OPERATOR'], 'operator'],
    [['ROLE_USER', 'ROLE_ADMIN'], 'admin'],
    [[], 'user'],
  ])('accepte aussi le tableau déjà décodé %p => "%s" (ANO-20)', (roles, expected) => {
    expect(getClientRole(roles)).toBe(expected);
  });

  test.each([{ roles: ['ROLE_ADMIN'] }, '"ROLE_ADMIN"', 42])(
    'retombe sur "user" quand la valeur décodée %p n\'est pas un tableau',
    (roles) => {
      expect(getClientRole(roles)).toBe('user');
    }
  );

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
