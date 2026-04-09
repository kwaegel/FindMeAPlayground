<script>
  // ParkDetailModal — overlay showing full detail for the selected park.
  // Conditionally rendered when $searchStore.selectedPark is non-null.
  // Closes on: close button click, overlay background click, Escape key.
  import { onMount, onDestroy } from 'svelte';
  import { Baby, Bath, Footprints, X, MapPin, Clock, Navigation } from 'lucide-svelte';
  import { searchStore, clearSelectedPark } from '../stores/searchStore.js';

  const AMENITY_ICONS = {
    playground: { Icon: Baby, label: 'Playground' },
    restroom: { Icon: Bath, label: 'Restroom' },
    'hiking-trail': { Icon: Footprints, label: 'Hiking Trail' },
  };

  function formatMiles(miles) {
    return `${miles.toFixed(1)} mi`;
  }

  function formatMinutes(seconds) {
    return `${Math.round(seconds / 60)} min`;
  }

  function mapsUrl(park) {
    return `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lon}`;
  }

  function handleOverlayClick(event) {
    // Only close if the click is directly on the overlay, not its children.
    if (event.target === event.currentTarget) clearSelectedPark();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') clearSelectedPark();
  }

  // Attach/detach the Escape key listener at the document level.
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
</script>

{#if $searchStore.selectedPark}
  {@const park = $searchStore.selectedPark}
  {@const travelSecs = $searchStore.travelTimes?.get(park.id)}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">{park.name}</h2>
        <button class="close-btn" onclick={clearSelectedPark} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div class="modal-body">
        <div class="detail-row">
          <MapPin size={16} aria-hidden="true" />
          <span>{formatMiles(park.distanceMiles)}</span>
        </div>

        {#if travelSecs != null}
          <div class="detail-row">
            <Clock size={16} aria-hidden="true" />
            <span>{formatMinutes(travelSecs)}</span>
          </div>
        {/if}

        {#if park.amenities.length > 0}
          <div class="amenities">
            {#each park.amenities as amenity}
              {#if AMENITY_ICONS[amenity]}
                {@const { Icon, label } = AMENITY_ICONS[amenity]}
                <span class="amenity-badge">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              {/if}
            {/each}
          </div>
        {/if}

        <a
          href={mapsUrl(park)}
          target="_blank"
          rel="noopener noreferrer"
          class="directions-btn"
          aria-label="Google Maps directions to {park.name}"
        >
          <Navigation size={16} aria-hidden="true" />
          Directions
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: #fff;
    border-radius: 12px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.25rem 0;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .modal-body {
    padding: 1rem 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.9375rem;
  }

  .amenities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .amenity-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: #f3f4f6;
    border-radius: 999px;
    padding: 0.25rem 0.625rem;
    font-size: 0.8125rem;
    color: #374151;
  }

  .directions-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: #2563eb;
    color: #fff;
    text-decoration: none;
    border-radius: 8px;
    padding: 0.625rem 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    align-self: flex-start;
    margin-top: 0.25rem;
  }

  .directions-btn:hover {
    background: #1d4ed8;
  }
</style>
