<script>
  // ResultsList — scrollable distance-sorted park results.
  // Reads filteredResults from the store (allResults filtered by selectedAmenities,
  // sliced to visibleCount). "Show more" increments visibleCount without
  // re-querying Overpass.
  import { Baby, Bath, Footprints, MapPin, Navigation, Clock } from 'lucide-svelte';
  import {
    searchStore,
    selectPark,
    incrementVisibleCount,
    getFilteredResults,
  } from '../stores/searchStore.js';

  // Map amenity keys to Lucide icon components.
  const AMENITY_ICONS = {
    playground: Baby,
    restroom: Bath,
    'hiking-trail': Footprints,
  };

  /** Format seconds into a human-readable "N min" string. */
  function formatMinutes(seconds) {
    return `${Math.round(seconds / 60)} min`;
  }

  /** Format miles to 1 decimal place. */
  function formatMiles(miles) {
    return `${miles.toFixed(1)} mi`;
  }

  /** Build Google Maps directions URL for a park. */
  function mapsUrl(park) {
    return `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lon}`;
  }

  // Derived visible results: apply amenity filter then slice to visibleCount.
  $: state = $searchStore;
  $: filtered = getFilteredResults(state);
  $: visible = filtered.slice(0, state.visibleCount);
  $: hasMore = filtered.length > state.visibleCount;
  // Only show the empty-state message when a search has actually been run
  // (origin is set). Before the first search, no message should appear.
  $: showEmptyState = visible.length === 0 && !!state.origin && !state.loading;
</script>

<div class="results-list">
  {#if showEmptyState}
    <p class="empty-message">No parks found. Try a different location or radius.</p>
  {:else if visible.length > 0}
    <ul class="park-list">
      {#each visible as park (park.id)}
        {@const travelSecs = state.travelTimes.get(park.id)}
        <!-- Using a button for the interactive list item gives correct a11y
             semantics. The inner directions link stops propagation to avoid
             double-firing the selectPark action. -->
        <li role="listitem">
        <button
          class="park-item"
          onclick={() => selectPark(park)}
          type="button"
        >
          <div class="park-header">
            <span class="park-name">{park.name}</span>
            <span class="park-distance">
              <MapPin size={12} aria-hidden="true" />
              {formatMiles(park.distanceMiles)}
            </span>
          </div>

          <div class="park-meta">
            {#if travelSecs != null}
              <span class="travel-time">
                <Clock size={12} aria-hidden="true" />
                {formatMinutes(travelSecs)}
              </span>
            {/if}

            <div class="amenity-icons" aria-label="Amenities">
              {#each park.amenities as amenity}
                {#if AMENITY_ICONS[amenity]}
                  {@const Icon = AMENITY_ICONS[amenity]}
                  <span title={amenity} class="amenity-icon">
                    <Icon size={14} aria-hidden="true" />
                  </span>
                {/if}
              {/each}
            </div>

            <!-- svelte-ignore a11y_invalid_attribute -->
            <a
              href={mapsUrl(park)}
              target="_blank"
              rel="noopener noreferrer"
              class="directions-link"
              aria-label="Directions to {park.name}"
              onclick={(e) => e.stopPropagation()}
            >
              <Navigation size={12} aria-hidden="true" />
              Directions
            </a>
          </div>
        </button>
        </li>
      {/each}
    </ul>

    {#if hasMore}
      <button class="show-more-btn" onclick={incrementVisibleCount}>
        Show more ({filtered.length - state.visibleCount} remaining)
      </button>
    {/if}
  {/if}
</div>

<style>
  .results-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .park-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  .park-item {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
    font-family: inherit;
  }

  .park-item:hover,
  .park-item:focus {
    background: #f9fafb;
    outline: 2px solid #2563eb;
    outline-offset: -2px;
  }

  .park-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .park-name {
    font-weight: 500;
    font-size: 0.9375rem;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .park-distance {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.8125rem;
    color: #6b7280;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .park-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .travel-time {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .amenity-icons {
    display: flex;
    gap: 4px;
    color: #6b7280;
  }

  .amenity-icon {
    display: flex;
    align-items: center;
  }

  .directions-link {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.8125rem;
    color: #2563eb;
    text-decoration: none;
    margin-left: auto;
  }

  .directions-link:hover {
    text-decoration: underline;
  }

  .show-more-btn {
    margin: 0.75rem 1rem;
    padding: 0.5rem;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    width: calc(100% - 2rem);
  }

  .show-more-btn:hover {
    background: #f9fafb;
  }

  .empty-message {
    padding: 2rem 1rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.9375rem;
  }
</style>
