<script>
  // AmenityFilters — stub. Full implementation in task 11.3.
  // Toggle buttons for playground, restroom, hiking-trail amenity filters.
  import { searchStore, setFilters } from '../stores/searchStore.js';
  import { AMENITIES } from '../config/amenities.js';

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
    <button
      class="filter-btn"
      class:active={$searchStore.selectedAmenities.includes(amenity.key)}
      onclick={() => toggle(amenity.key)}
      type="button"
      aria-pressed={$searchStore.selectedAmenities.includes(amenity.key)}
    >
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
