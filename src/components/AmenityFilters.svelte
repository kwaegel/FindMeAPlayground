<script>
  // AmenityFilters — toggle buttons for playground, restroom, hiking-trail filters.
  // The button set is driven entirely by the AMENITIES config; adding a new
  // amenity there automatically adds a filter button here.
  import { searchStore, setFilters } from '../stores/searchStore.js';
  import { AMENITIES } from '../config/amenities.js';
  import { AMENITY_ICON_MAP } from '../config/amenityIcons.js';

  function toggle(key) {
    const current = $searchStore.selectedAmenities;
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setFilters(next);
  }
</script>

<div class="amenity-filters" role="group" aria-label="Filter by amenity">
  {#each AMENITIES as amenity}
    {@const Icon = AMENITY_ICON_MAP[amenity.key]}
    <button
      class="filter-btn"
      class:active={$searchStore.selectedAmenities.includes(amenity.key)}
      onclick={() => toggle(amenity.key)}
      type="button"
      aria-pressed={$searchStore.selectedAmenities.includes(amenity.key)}
    >
      {#if Icon}
        <Icon size={13} aria-hidden="true" />
      {/if}
      {amenity.label}
    </button>
  {/each}
</div>

<style>
  .amenity-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .filter-btn {
    padding: 0.25rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    background: #fff;
    font-size: 0.8125rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.1s;
  }

  .filter-btn:hover {
    background: #f3f4f6;
  }

  .filter-btn.active {
    background: #dbeafe;
    border-color: #2563eb;
    color: #1d4ed8;
  }
</style>
