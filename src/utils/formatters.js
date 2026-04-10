// Shared formatting utilities for park data display.
// These pure functions are used across multiple components; centralizing them
// ensures consistent output and means a formatting change (e.g. "mi" → "miles")
// only requires editing one file.

/**
 * Format a distance in miles to one decimal place.
 * @param {number} miles
 * @returns {string} e.g. "1.5 mi"
 */
export function formatMiles(miles) {
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format a travel time in seconds to the nearest whole minute.
 * @param {number} seconds
 * @returns {string} e.g. "12 min"
 */
export function formatMinutes(seconds) {
  return `${Math.round(seconds / 60)} min`;
}

/**
 * Build a Google Maps driving directions URL for a given park.
 * Opens the maps.google.com turn-by-turn directions interface with the park
 * as the destination; the user's current location is the default origin.
 *
 * @param {{ lat: number, lon: number }} park
 * @returns {string}
 */
export function mapsUrl(park) {
  return `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lon}`;
}
