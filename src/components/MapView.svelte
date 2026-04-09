<script>
  // MapView — Leaflet map with OSM tiles, park pins, and radius overlay.
  // Leaflet is initialized in onMount so it only runs in the browser (not
  // during SSR or test environments that don't have real DOM sizing).
  //
  // Map state is managed imperatively via Leaflet APIs in reactive blocks:
  // when origin changes → re-center; when visible results change → re-pin.
  import { onMount, onDestroy } from 'svelte';
  import { searchStore, selectPark, setOrigin, getFilteredResults } from '../stores/searchStore.js';
  // Static import so vi.mock('leaflet') can intercept it in tests.
  // The CSS import is a no-op in test environments.
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  const MILES_TO_METERS = 1609.34;

  // OSM tile layer URL and attribution (required by OSM usage policy).
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  let mapEl; // bind:this reference to the DOM element.
  let map; // Leaflet map instance.
  let radiusCircle = null;
  let markers = []; // Track active markers for cleanup.

  // Snapshot strings used to skip re-render when only unrelated state changes
  // (e.g. travel times merging in should not re-pin or re-center the map).
  let lastVisibleIds = '';
  let lastOriginKey = '';

  // Compute zoom level appropriate for the search radius.
  function radiusToZoom(radiusMiles) {
    if (radiusMiles <= 5) return 13;
    if (radiusMiles <= 10) return 12;
    return 11;
  }

  // Remove all current park markers from the map.
  function clearMarkers() {
    for (const m of markers) m.remove();
    markers = [];
  }

  // Place a marker for each visible park and wire up click → selectPark.
  function placePins(parks) {
    if (!map) return;
    clearMarkers();

    for (const park of parks) {
      const marker = L.marker([park.lat, park.lon])
        .bindPopup(park.name)
        .addTo(map);

      marker.on('click', () => selectPark(park));
      markers.push(marker);
    }
  }

  // Draw/update the search radius circle.
  function updateCircle(origin, radiusMiles) {
    if (!map) return;

    if (radiusCircle) radiusCircle.remove();
    radiusCircle = L.circle([origin.lat, origin.lon], {
      radius: radiusMiles * MILES_TO_METERS,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.05,
      weight: 1.5,
    }).addTo(map);
  }

  onMount(() => {
    map = L.map(mapEl).setView([39.5, -98.35], 4); // center on US

    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION }).addTo(map);

    // "Search from here" — right-click on desktop, long-press on mobile.
    // Leaflet fires 'contextmenu' for right-click. Long-press is emulated
    // via a 500ms timer on touchstart that's cancelled on touchend/touchmove.
    map.on('contextmenu', (event) => {
      const { lat, lng } = event.latlng;
      setOrigin(lat, lng, 'Map location');
    });

    // Long-press: start a timer on touchstart, cancel if the finger moves.
    // longPressTimer is declared at component scope (above onDestroy) so that
    // onDestroy can cancel it if the component is destroyed mid-press.
    map.on('touchstart', (event) => {
      const { lat, lng } = event.latlng;
      longPressTimer = setTimeout(() => {
        setOrigin(lat, lng, 'Map location');
      }, 500);
    });
    map.on('touchend', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    map.on('touchmove', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });

    // Initial map view and pins are handled by the $: reactive block below,
    // which fires once map becomes non-null after this onMount completes.
    // Reading state via get() here would overwrite the test's subscriber
    // reference (since get() internally calls subscribe), breaking state-update
    // tests. The reactive block is the single source of truth for map state.
  });

  // longPressTimer is module-scoped so it must be accessible in onDestroy.
  // Declared up here to avoid a temporal dead zone if onDestroy runs before
  // the touchstart handler has a chance to set it.
  let longPressTimer = null;

  onDestroy(() => {
    if (longPressTimer) clearTimeout(longPressTimer);
    if (map) map.remove();
  });

  // Re-center and re-pin when relevant store state changes.
  // Guards compare snapshot strings so that unrelated updates (e.g. travel
  // times merging in) do not trigger marker DOM churn or map re-centering.
  $: if (map) {
    const state = $searchStore;
    const filtered = getFilteredResults(state);
    const visible = filtered.slice(0, state.visibleCount);
    const visibleIds = visible.map((p) => p.id).join(',');

    if (state.origin) {
      const originKey = `${state.origin.lat},${state.origin.lon},${state.radiusMiles}`;
      if (originKey !== lastOriginKey) {
        map.setView([state.origin.lat, state.origin.lon], radiusToZoom(state.radiusMiles));
        updateCircle(state.origin, state.radiusMiles);
        lastOriginKey = originKey;
      }
    }

    if (visibleIds !== lastVisibleIds) {
      placePins(visible);
      lastVisibleIds = visibleIds;
    }
  }
</script>

<div class="map-container" bind:this={mapEl}></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
  }

  /* Ensure Leaflet popups render above map controls. */
  :global(.leaflet-popup) {
    z-index: 1000;
  }
</style>
