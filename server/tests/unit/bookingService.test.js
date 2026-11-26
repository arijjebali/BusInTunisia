const { BookingService, BookingNotFoundError } = require('../../src/services/bookingService');
const { InvalidTransitionError } = require('../../src/services/bookingStateMachine');

// Doubles de test : le dépôt (accès MySQL) est remplacé par un mock jest,
// l'horloge système par un stub à date fixe -> tests rapides, déterministes, sans base de données.
const FIXED_NOW = new Date('2026-11-17T12:00:00Z');
const clockStub = { now: () => FIXED_NOW };

function makeRepoMock(booking) {
  return {
    findById: jest.fn().mockResolvedValue(booking),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function aBooking(overrides = {}) {
  return {
    id: 1,
    status: 'confirmed',
    passenger_id: 42,
    departure_time: '2026-11-20T08:00:00Z', // futur par rapport à FIXED_NOW
    ...overrides,
  };
}

describe('BookingService.cancelByPassenger', () => {
  test('annule une réservation confirmée à venir et persiste le statut cancelled', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking());
    const service = new BookingService(repo, clockStub);

    // Act
    await service.cancelByPassenger(1, 42);

    // Assert
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 'cancelled');
  });

  test('refuse d\'annuler une réservation dont le départ est passé (completed) sans rien persister', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ departure_time: '2026-11-16T08:00:00Z' }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = service.cancelByPassenger(1, 42);

    // Assert
    await expect(result).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  test('renvoie BookingNotFoundError quand un passager annule la réservation d\'un autre', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ passenger_id: 42 }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = service.cancelByPassenger(1, 99);

    // Assert
    await expect(result).rejects.toBeInstanceOf(BookingNotFoundError);
  });

  test('renvoie BookingNotFoundError quand la réservation n\'existe pas', async () => {
    // Arrange
    const repo = makeRepoMock(null);
    const service = new BookingService(repo, clockStub);

    // Act
    const result = service.cancelByPassenger(404, 42);

    // Assert
    await expect(result).rejects.toBeInstanceOf(BookingNotFoundError);
  });
});

describe('BookingService.confirmByAdmin', () => {
  test('confirme une réservation en attente et retourne la transition pending -> confirmed', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ status: 'pending' }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = await service.confirmByAdmin(1);

    // Assert
    expect(result).toEqual({ id: 1, from: 'pending', to: 'confirmed' });
  });

  test('refuse de confirmer une réservation annulée sans rien persister', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ status: 'cancelled' }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = service.confirmByAdmin(1);

    // Assert
    await expect(result).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});

describe('BookingService.rejectByAdmin', () => {
  test('rejette une réservation en attente : pending -> cancelled', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ status: 'pending' }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = await service.rejectByAdmin(1);

    // Assert
    expect(result).toEqual({ id: 1, from: 'pending', to: 'cancelled' });
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 'cancelled');
  });

  test('refuse de rejeter une réservation déjà confirmée (seul le passager peut annuler)', async () => {
    // Arrange
    const repo = makeRepoMock(aBooking({ status: 'confirmed' }));
    const service = new BookingService(repo, clockStub);

    // Act
    const result = service.rejectByAdmin(1);

    // Assert
    await expect(result).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
