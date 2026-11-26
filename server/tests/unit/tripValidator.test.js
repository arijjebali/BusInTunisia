const { validateTrip } = require('../../src/services/tripValidator');

// Table de décision (CT-10) : dates valides ? / arrivée après départ ? / prix > 0 ?
const VALID = { departure_time: '2030-03-01 08:00:00', arrival_time: '2030-03-01 10:30:00', price: 15 };

describe('validateTrip', () => {
  test('R1 accepte un trajet aux dates cohérentes et au prix positif', () => {
    // Arrange
    const trip = { ...VALID };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toEqual([]);
  });

  test('R2 refuse un trajet dont l\'arrivée est égale au départ (valeur limite)', () => {
    // Arrange
    const trip = { ...VALID, arrival_time: VALID.departure_time };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toEqual(['Arrival time must be after departure time']);
  });

  test('R3 refuse un trajet dont l\'arrivée précède le départ', () => {
    // Arrange
    const trip = { ...VALID, arrival_time: '2030-03-01 07:59:00' };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toContain('Arrival time must be after departure time');
  });

  test.each([
    ['absent', undefined],
    ['nul', null],
    ['vide', ''],
    ['zéro (limite)', 0],
    ['négatif', -1],
    ['non numérique', 'abc'],
  ])('R4 refuse un prix %s', (_label, price) => {
    // Arrange
    const trip = { ...VALID, price };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toEqual(['Price must be greater than zero']);
  });

  test('R4 accepte le plus petit prix positif représentable en millimes (0,001 TND)', () => {
    // Arrange
    const trip = { ...VALID, price: 0.001 };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toEqual([]);
  });

  test('R5 signale à la fois des dates invalides et un prix invalide', () => {
    // Arrange
    const trip = { departure_time: 'pas une date', arrival_time: undefined, price: 0 };

    // Act
    const errors = validateTrip(trip);

    // Assert
    expect(errors).toEqual([
      'Departure time is invalid',
      'Arrival time is invalid',
      'Price must be greater than zero',
    ]);
  });

  test('R6 traite un appel sans argument comme un trajet entièrement invalide', () => {
    // Arrange (aucun argument)

    // Act
    const errors = validateTrip();

    // Assert
    expect(errors).toHaveLength(3);
  });
});
