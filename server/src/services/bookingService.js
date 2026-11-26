const { EVENTS, nextState, effectiveStatus } = require('./bookingStateMachine');

class BookingNotFoundError extends Error {
  constructor(id) {
    super(`Booking ${id} not found`);
    this.name = 'BookingNotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Service de changement d'état d'une réservation.
 * Dépendances injectées (remplaçables par des doubles de test) :
 *  - bookingRepository : { findById(id) -> {id, status, passenger_id, departure_time} | null,
 *                          updateStatus(id, status) }
 *  - clock             : { now() -> Date }
 */
class BookingService {
  constructor(bookingRepository, clock = { now: () => new Date() }) {
    this.repo = bookingRepository;
    this.clock = clock;
  }

  async #apply(bookingId, event, { ownerId } = {}) {
    const booking = await this.repo.findById(bookingId);
    if (!booking || (ownerId !== undefined && booking.passenger_id !== ownerId)) {
      throw new BookingNotFoundError(bookingId);
    }
    const current = effectiveStatus(booking.status, booking.departure_time, this.clock.now());
    const target = nextState(current, event); // lève InvalidTransitionError si interdit
    await this.repo.updateStatus(bookingId, target);
    return { id: booking.id, from: current, to: target };
  }

  cancelByPassenger(bookingId, passengerId) {
    return this.#apply(bookingId, EVENTS.CANCEL, { ownerId: passengerId });
  }

  confirmByAdmin(bookingId) {
    return this.#apply(bookingId, EVENTS.CONFIRM);
  }

  rejectByAdmin(bookingId) {
    return this.#apply(bookingId, EVENTS.REJECT);
  }
}

module.exports = { BookingService, BookingNotFoundError };
