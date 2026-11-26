const { calculateBookingTotal, PricingError, MAX_SEATS_PER_BOOKING } = require('../../src/services/pricing');

describe('calculateBookingTotal', () => {
  test('retourne prix unitaire × nombre de sièges quand l\'entrée est valide', () => {
    // Arrange
    const unitPrice = 12.5;
    const seats = [3, 4, 5];

    // Act
    const total = calculateBookingTotal(unitPrice, seats);

    // Assert
    expect(total).toBe(37.5);
  });

  test('arrondit le total au millime (3 décimales TND)', () => {
    // Arrange
    const unitPrice = 10.3335;
    const seats = [1];

    // Act
    const total = calculateBookingTotal(unitPrice, seats);

    // Assert
    expect(total).toBe(10.334);
  });

  test('accepte exactement le nombre maximal de sièges (valeur limite)', () => {
    // Arrange
    const seats = Array.from({ length: MAX_SEATS_PER_BOOKING }, (_, i) => i + 1);

    // Act
    const total = calculateBookingTotal(10, seats);

    // Assert
    expect(total).toBe(10 * MAX_SEATS_PER_BOOKING);
  });

  test('lève PricingError quand le nombre de sièges dépasse le maximum (limite + 1)', () => {
    // Arrange
    const seats = Array.from({ length: MAX_SEATS_PER_BOOKING + 1 }, (_, i) => i + 1);

    // Act
    const act = () => calculateBookingTotal(10, seats);

    // Assert
    expect(act).toThrow(PricingError);
  });

  test('lève PricingError quand aucun siège n\'est sélectionné', () => {
    // Arrange
    const seats = [];

    // Act
    const act = () => calculateBookingTotal(10, seats);

    // Assert
    expect(act).toThrow('Au moins un siège doit être sélectionné');
  });

  test('lève PricingError quand le même siège est sélectionné deux fois', () => {
    // Arrange
    const seats = [7, 7];

    // Act
    const act = () => calculateBookingTotal(10, seats);

    // Assert
    expect(act).toThrow('Un même siège ne peut pas être sélectionné deux fois');
  });

  test.each([0, -5, 'abc', NaN])('lève PricingError quand le prix unitaire vaut %p', (unitPrice) => {
    // Arrange
    const seats = [1];

    // Act
    const act = () => calculateBookingTotal(unitPrice, seats);

    // Assert
    expect(act).toThrow(PricingError);
  });
});
