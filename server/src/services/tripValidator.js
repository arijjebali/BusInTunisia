/**
 * Validation des données d'un trajet (création / modification par l'administrateur).
 * Retourne la liste des erreurs ; liste vide = trajet valide.
 */
function validateTrip({ departure_time, arrival_time, price } = {}) {
  const errors = [];
  const dep = new Date(departure_time);
  const arr = new Date(arrival_time);

  if (!departure_time || Number.isNaN(dep.getTime())) {
    errors.push('Departure time is invalid');
  }
  if (!arrival_time || Number.isNaN(arr.getTime())) {
    errors.push('Arrival time is invalid');
  }
  if (errors.length === 0 && dep >= arr) {
    errors.push('Arrival time must be after departure time');
  }
  const p = Number(price);
  if (price === undefined || price === null || price === '' || !Number.isFinite(p) || p <= 0) {
    errors.push('Price must be greater than zero');
  }
  return errors;
}

module.exports = { validateTrip };
