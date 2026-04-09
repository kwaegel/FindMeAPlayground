// Haversine distance calculation.
// Computes the great-circle distance between two lat/lon points using the
// Haversine formula. Accurate enough for park-search distances (within ~0.5%
// at the scales involved). Returns miles.

const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculate the great-circle distance in miles between two geographic points.
 *
 * @param {number} lat1 - Latitude of point 1 in decimal degrees.
 * @param {number} lon1 - Longitude of point 1 in decimal degrees.
 * @param {number} lat2 - Latitude of point 2 in decimal degrees.
 * @param {number} lon2 - Longitude of point 2 in decimal degrees.
 * @returns {number} Distance in miles.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}
