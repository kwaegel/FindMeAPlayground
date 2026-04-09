<script>
  // SearchBar component — address input, Search button, GPS button.
  // Calls Nominatim for geocoding and dispatches setOrigin to the store.
  // Displays loading/error states from the store.
  import { MapPin, Search, Locate } from 'lucide-svelte';
  import { searchStore, setOrigin } from '../stores/searchStore.js';
  import { geocode } from '../services/nominatim.js';

  let inputValue = $state('');
  let gpsError = $state('');

  // Reflect the store's display name back into the input when origin changes
  // (e.g. after "search from here" sets "Map location").
  $effect(() => {
    if ($searchStore.origin?.displayName && inputValue === '') {
      inputValue = $searchStore.origin.displayName;
    }
  });

  async function handleSearch() {
    const query = inputValue.trim();
    if (!query) return;

    gpsError = '';
    try {
      const result = await geocode(query);
      await setOrigin(result.lat, result.lon, result.displayName);
      // Update input to reflect the resolved display name.
      inputValue = result.displayName;
    } catch (err) {
      // Error is set on the store by setOrigin; nothing extra to do here.
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') handleSearch();
  }

  function handleGps() {
    gpsError = '';
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
    <button onclick={handleSearch} class="btn-search" aria-label="Search">
      <Search size={18} aria-hidden="true" />
      Search
    </button>
    <button onclick={handleGps} class="btn-gps" aria-label="Use my GPS location">
      <Locate size={18} aria-hidden="true" />
    </button>
  </div>

  {#if $searchStore.loading}
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
    gap: 0.25rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-search:hover {
    background: #1d4ed8;
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
