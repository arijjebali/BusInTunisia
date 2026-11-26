const {
  STATES, EVENTS, nextState, InvalidTransitionError, effectiveStatus, initialStatusFor,
} = require('../../src/services/bookingStateMachine');

describe('bookingStateMachine.nextState', () => {
  test('passe de pending à confirmed sur l\'événement CONFIRM', () => {
    // Arrange
    const from = STATES.PENDING;

    // Act
    const to = nextState(from, EVENTS.CONFIRM);

    // Assert
    expect(to).toBe(STATES.CONFIRMED);
  });

  test('passe de confirmed à cancelled sur l\'événement CANCEL', () => {
    // Arrange
    const from = STATES.CONFIRMED;

    // Act
    const to = nextState(from, EVENTS.CANCEL);

    // Assert
    expect(to).toBe(STATES.CANCELLED);
  });

  test('refuse de confirmer une réservation déjà annulée (transition interdite)', () => {
    // Arrange
    const from = STATES.CANCELLED;

    // Act
    const act = () => nextState(from, EVENTS.CONFIRM);

    // Assert
    expect(act).toThrow(InvalidTransitionError);
  });

  test('refuse d\'annuler une réservation terminée (transition interdite)', () => {
    // Arrange
    const from = STATES.COMPLETED;

    // Act
    const act = () => nextState(from, EVENTS.CANCEL);

    // Assert
    expect(act).toThrow(InvalidTransitionError);
  });

  test('lève une erreur explicite pour un état inconnu', () => {
    // Arrange
    const from = 'archived';

    // Act
    const act = () => nextState(from, EVENTS.CANCEL);

    // Assert
    expect(act).toThrow('État inconnu : "archived"');
  });
});

describe('bookingStateMachine.effectiveStatus', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  test('considère completed une réservation confirmée dont le départ est passé', () => {
    // Arrange
    const departure = '2026-11-17T08:00:00Z';

    // Act
    const status = effectiveStatus(STATES.CONFIRMED, departure, now);

    // Assert
    expect(status).toBe(STATES.COMPLETED);
  });

  test('considère completed une réservation confirmée dont le départ est exactement maintenant (limite)', () => {
    // Arrange
    const departure = now.toISOString();

    // Act
    const status = effectiveStatus(STATES.CONFIRMED, departure, now);

    // Assert
    expect(status).toBe(STATES.COMPLETED);
  });

  test('laisse confirmed une réservation dont le départ est futur', () => {
    // Arrange
    const departure = '2026-11-18T08:00:00Z';

    // Act
    const status = effectiveStatus(STATES.CONFIRMED, departure, now);

    // Assert
    expect(status).toBe(STATES.CONFIRMED);
  });
});

describe('bookingStateMachine.initialStatusFor', () => {
  test('crée une réservation passager directement en confirmed', () => {
    // Arrange
    const role = 'passenger';

    // Act
    const status = initialStatusFor(role);

    // Assert
    expect(status).toBe(STATES.CONFIRMED);
  });
});

describe('bookingStateMachine — table de transitions complète (couverture des transitions interdites)', () => {
  const { TRANSITIONS, isTransitionAllowed } = require('../../src/services/bookingStateMachine');
  const allPairs = Object.values(STATES).flatMap((s) => Object.values(EVENTS).map((e) => [s, e]));

  test.each(allPairs)('depuis %s, l\'événement %s est accepté ssi il figure dans la table', (from, event) => {
    // Arrange
    const expected = Boolean(TRANSITIONS[from][event]);

    // Act
    const allowed = isTransitionAllowed(from, event);

    // Assert
    expect(allowed).toBe(expected);
  });

  test('crée une réservation administrateur en pending (à valider)', () => {
    // Arrange
    const role = 'admin';

    // Act
    const status = initialStatusFor(role);

    // Assert
    expect(status).toBe(STATES.PENDING);
  });

  test('isTransitionAllowed renvoie false pour un état inconnu sans lever d\'exception', () => {
    // Arrange
    const from = 'archived';

    // Act
    const allowed = isTransitionAllowed(from, EVENTS.CONFIRM);

    // Assert
    expect(allowed).toBe(false);
  });
});
