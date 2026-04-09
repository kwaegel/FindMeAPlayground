// Amenity configuration — single source of truth for all amenity types.
// Adding a new amenity here automatically propagates to:
//   - Overpass QL tag detection in overpass.js
//   - AmenityFilters toggle buttons
//   - ResultsList and ParkDetailModal icon rendering
//
// Icons are imported lazily per component; this config stores the string key
// used to look up the Lucide component. The `osmTags` object describes which
// OSM tags trigger this amenity — used by the Overpass parser.

/** @typedef {{ key: string, label: string, icon: string, osmTags: Record<string, string> }} AmenityConfig */

/** @type {AmenityConfig[]} */
export const AMENITIES = [
  {
    key: 'playground',
    label: 'Playground',
    // Lucide icon name — looked up in components via a map.
    icon: 'Baby',
    // An element has this amenity if it has the tag leisure=playground,
    // OR if it is a park that contains a playground child element (future).
    osmTags: { leisure: 'playground' },
  },
  {
    key: 'restroom',
    label: 'Restroom',
    icon: 'Bath',
    osmTags: { amenity: 'toilets' },
  },
  {
    key: 'hiking-trail',
    label: 'Hiking Trail',
    icon: 'Footprints',
    // sac_scale presence indicates a graded hiking path.
    osmTags: { highway: 'path', sac_scale: '*' },
  },
];

/**
 * Derive the amenity keys present on an OSM element based on its tags.
 * Uses option (c) from the spec: reads tags directly on the element.
 *
 * @param {Record<string, string>} tags - Raw OSM tags from the element.
 * @returns {string[]} Array of matching amenity keys.
 */
export function detectAmenities(tags) {
  const result = [];

  for (const { key, osmTags } of AMENITIES) {
    // All osmTags entries must match. A value of '*' means the key must exist
    // with any value (e.g. sac_scale: '*' matches any graded trail).
    const matches = Object.entries(osmTags).every(([k, v]) => {
      if (v === '*') return k in tags;
      return tags[k] === v;
    });
    if (matches) result.push(key);
  }

  return result;
}
