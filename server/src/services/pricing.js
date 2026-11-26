/**
 * Calcul du montant total d'une réservation.
 * Règle : total = prix unitaire du trajet × nombre de sièges, arrondi au millime (3 décimales, TND).
 */

const MAX_SEATS_PER_BOOKING = 9; // borne max du champ "passengers" sur la page d'accueil

class PricingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingError';
    this.statusCode = 400;
  }
}

function calculateBookingTotal(unitPrice, seats) {
  const price = Number(unitPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new PricingError('Le prix unitaire doit être strictement positif');
  }
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new PricingError('Au moins un siège doit être sélectionné');
  }
  if (seats.length > MAX_SEATS_PER_BOOKING) {
    throw new PricingError(`Au plus ${MAX_SEATS_PER_BOOKING} sièges par réservation`);
  }
  if (new Set(seats).size !== seats.length) {
    throw new PricingError('Un même siège ne peut pas être sélectionné deux fois');
  }
  return Math.round(price * seats.length * 1000) / 1000;
}

module.exports = { calculateBookingTotal, PricingError, MAX_SEATS_PER_BOOKING };
