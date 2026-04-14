<script>
  // SearchBar component — address input, Search button, GPS button.
  // Calls Nominatim for geocoding and dispatches setOrigin to the store.
  // Displays loading/error states from the store.
  import { MapPin, Search, Locate } from 'lucide-svelte';
  import { searchStore, setOrigin } from '../stores/searchStore.js';
  import { geocode } from '../services/nominatim.js';

  // Plain `let` variables — legacy Svelte 4 mode, consistent with App.svelte
  // and the rest of the component tree ($: reactive blocks, not $state/$effect).
  let inputValue = '';
  let gpsError = '';
  // True while the geocode() call is in flight (before the Overpass search
  // starts). The store's loading flag only becomes true once Overpass begins,
  // so without this there is a 1-2s window where the user sees no feedback.
  let geocoding = false;

  // Track the last origin we synced to the input so we can detect real changes
  // (not just any store update). The `inputValue === ''` guard was too narrow —
  // it prevented sync after "search from here" fired while the user had text.
  let lastSyncedDisplayName = '';
  $: {
    const displayName = $searchStore.origin?.displayName;
    if (displayName && displayName !== lastSyncedDisplayName) {
      inputValue = displayName;
      lastSyncedDisplayName = displayName;
    }
  }

  async function handleSearch() {
    const query = inputValue.trim();
    if (!query) return;

    gpsError = '';
    geocoding = true;
    try {
      const result = await geocode(query);
      await setOrigin(result.lat, result.lon, result.displayName);
      // Update input to reflect the resolved display name (may differ from raw query).
      inputValue = result.displayName;
      lastSyncedDisplayName = result.displayName;
    } catch (err) {
      // Geocoding errors (bad address, service down) are not caught by setOrigin —
      // surface them via the store error channel so the existing error UI shows them.
      searchStore.update((s) => ({ ...s, error: err.message }));
    } finally {
      geocoding = false;
    }
  }

  function handleKeyDown(event) {
    // Guard matches the button's disabled condition so rapid Enter-mashing
    // doesn't queue multiple geocode calls while one is already in flight.
    if (event.key === 'Enter' && !geocoding && !$searchStore.loading) handleSearch();
  }

  function handleGps() {
    gpsError = '';
    // Clear any lingering address-search error so stale error text doesn't
    // remain visible while the GPS search is running.
    searchStore.update((s) => ({ ...s, error: null }));
    if (!navigator.geolocation) {
      gpsError = 'Geolocation is not supported by your browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        inputValue = 'Your location';
        setOrigin(lat, lon, 'Your location');
      },
      () => {
        gpsError = 'Location access denied. Please enable location permissions.';
      }
    );
  }
</script>

<div class="search-bar">
  <div class="input-row">
    <MapPin size={18} class="pin-icon" aria-hidden="true" />
    <input
      type="text"
      bind:value={inputValue}
      onkeydown={handleKeyDown}
      placeholder="Enter address or city…"
      aria-label="Address search"
      class="address-input"
    />
    <button onclick={handleSearch} class="btn-search" aria-label="Search" disabled={geocoding || $searchStore.loading}>
      <Search size={18} aria-hidden="true" />
    </button>
    <button onclick={handleGps} class="btn-gps" aria-label="Use my GPS location" disabled={geocoding || $searchStore.loading}>
      <Locate size={18} aria-hidden="true" />
    </button>
  </div>

  {#if geocoding || $searchStore.loading}
    <p class="status-message">Searching…</p>
  {/if}

  {#if $searchStore.error}
    <p class="error-message" role="alert">{$searchStore.error}</p>
  {/if}

  {#if gpsError}
    <p class="error-message" role="alert">{gpsError}</p>
  {/if}
</div>

<style>
  .search-bar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.375rem 0.5rem;
  }

  .address-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 0.9375rem;
    background: transparent;
  }

  .btn-search {
    display: flex;
    align-items: center;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.375rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-search:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-search:disabled,
  .btn-gps:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-gps {
    display: flex;
    align-items: center;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 0.375rem;
    cursor: pointer;
    color: #6b7280;
    flex-shrink: 0;
  }

  .btn-gps:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .status-message {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .error-message {
    font-size: 0.875rem;
    color: #dc2626;
    margin: 0;
  }

  /* Hide lucide icon class overrides from leaking into global scope */
  :global(.pin-icon) {
    color: #9ca3af;
    flex-shrink: 0;
  }
</style>
