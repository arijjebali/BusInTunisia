/**
 * Cycle de vie d'une réservation (booking) — BusInTunisia.
 *
 * États persistés : pending, confirmed, cancelled
 * État dérivé     : completed (réservation confirmée dont la date de départ est passée)
 */

const STATES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

const EVENTS = Object.freeze({
  CONFIRM: 'CONFIRM',               // validation par un administrateur
  REJECT: 'REJECT',                 // refus par un administrateur
  CANCEL: 'CANCEL',                 // annulation par le passager
  DEPARTURE_PASSED: 'DEPARTURE_PASSED', // passage de la date de départ du trajet
});

// Table des transitions valides : état source -> événement -> état cible
const TRANSITIONS = Object.freeze({
  [STATES.PENDING]: {
    [EVENTS.CONFIRM]: STATES.CONFIRMED,
    [EVENTS.REJECT]: STATES.CANCELLED,
    [EVENTS.CANCEL]: STATES.CANCELLED,
  },
  [STATES.CONFIRMED]: {
    [EVENTS.CANCEL]: STATES.CANCELLED,
    [EVENTS.DEPARTURE_PASSED]: STATES.COMPLETED,
  },
  [STATES.CANCELLED]: {},
  [STATES.COMPLETED]: {},
});

class InvalidTransitionError extends Error {
  constructor(from, event) {
    super(`Transition interdite : ${event} depuis l'état "${from}"`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.event = event;
    this.statusCode = 409;
  }
}

function isTransitionAllowed(from, event) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from][event]);
}

function nextState(from, event) {
  if (!TRANSITIONS[from]) {
    throw new Error(`État inconnu : "${from}"`);
  }
  const target = TRANSITIONS[from][event];
  if (!target) {
    throw new InvalidTransitionError(from, event);
  }
  return target;
}

/** Statut de création selon le rôle de l'utilisateur (règle existante du serveur). */
function initialStatusFor(role) {
  return role === 'admin' ? STATES.PENDING : STATES.CONFIRMED;
}

/** Calcule l'état effectif : une réservation confirmée dont le départ est passé est "completed". */
function effectiveStatus(status, departureTime, now) {
  if (status === STATES.CONFIRMED && new Date(departureTime) <= now) {
    return STATES.COMPLETED;
  }
  return status;
}

module.exports = {
  STATES,
  EVENTS,
  TRANSITIONS,
  InvalidTransitionError,
  isTransitionAllowed,
  nextState,
  initialStatusFor,
  effectiveStatus,
};
