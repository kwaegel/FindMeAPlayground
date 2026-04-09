<script>
  // RadiusDropdown — select input for search radius (5, 10, 15 miles).
  // Changing the value calls setRadius on the store, which triggers a new
  // search if an origin is already set.
  import { searchStore, setRadius } from '../stores/searchStore.js';

  const RADIUS_OPTIONS = [5, 10, 15];

  function handleChange(event) {
    setRadius(Number(event.target.value));
  }
</script>

<div class="radius-dropdown">
  <label for="radius-select" class="radius-label">Radius</label>
  <select
    id="radius-select"
    value={$searchStore.radiusMiles}
    onchange={handleChange}
    class="radius-select"
  >
    {#each RADIUS_OPTIONS as miles}
      <option value={miles}>{miles} mi</option>
    {/each}
  </select>
</div>

<style>
  .radius-dropdown {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .radius-label {
    font-size: 0.875rem;
    color: #374151;
    white-space: nowrap;
  }

  .radius-select {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    background: #fff;
    cursor: pointer;
  }
</style>
