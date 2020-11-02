/**
 * Normalize numbers in templates.
 *
 * Rules:
 *   - format numbers according to 'EN' locale
 *   - round to 2 decimals
 */

const locale = 'EN';

function roundToNDecimalPlaces(numberToRound, digits) {
  const m = 10 ** digits;
  return parseFloat((Math.round(numberToRound * m) / m).toFixed(digits));
}

function normalizeNumber(val) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return val;

  return roundToNDecimalPlaces(val, val > 100 ? 0 : 2).toLocaleString(locale);
}

export default normalizeNumber;
