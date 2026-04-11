// Central icon map for amenity keys → Lucide icon components.
//
// Import from here rather than defining a local map in each component, so that
// adding a new amenity requires editing only amenities.js + this file, not
// every component that renders amenity icons. Without this, there were three
// separate copies of the same mapping (ResultsList, ParkDetailModal,
// AmenityFilters), meaning a new amenity required four file edits.

import { Baby, Bath, Footprints } from 'lucide-svelte';

/**
 * Map of amenity key → Lucide icon component.
 * Keys must match the `key` field in AMENITIES (src/config/amenities.js).
 *
 * @type {Record<string, import('svelte').ComponentType>}
 */
export const AMENITY_ICON_MAP = {
  playground: Baby,
  restroom: Bath,
  'hiking-trail': Footprints,
};
