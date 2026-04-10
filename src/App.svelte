<script>
  // App Shell — root layout component.
  // Desktop (>768px): left sidebar (search + results) | right map panel.
  // Mobile (≤768px): search on top, map below, list below map.
  // All child components subscribe to the store directly; App.svelte passes
  // no props.
  import SearchBar from './components/SearchBar.svelte';
  import RadiusDropdown from './components/RadiusDropdown.svelte';
  import AmenityFilters from './components/AmenityFilters.svelte';
  import ResultsList from './components/ResultsList.svelte';
  import MapView from './components/MapView.svelte';
  import ParkDetailModal from './components/ParkDetailModal.svelte';
  import { searchStore, getFilteredResults } from './stores/searchStore.js';
  import { getTravelTimes } from './services/travelTime.js';

  // Mobile list/map toggle. On desktop this is unused — CSS handles layout.
  // Using plain let (not $state) to stay in Svelte 4 legacy mode alongside the
  // $: reactive blocks below. Svelte 4 reactive vars are still reactive when
  // assigned — $state() would trigger runes mode and disallow $:.
  let showList = false;

  // Travel-time fetch orchestration. Wired here rather than in searchStore.js
  // to avoid a circular import (travelTime.js → searchStore.js → travelTime.js).
  //
  // Two triggers:
  //   1. New search results arrive (allResults reference changes) → fetch all.
  //   2. User clicks "show more" (visibleCount increases, same results) → fetch
  //      only the newly-visible parks so we don't over-burn ORS quota.
  //
  // prevVisibleCount is reset downward when visibleCount drops (e.g. after a
  // filter change resets pagination) so the next show-more fetches from the
  // correct offset.
  let prevResults = null;
  let prevVisibleCount = 0;
  $: {
    const { origin, allResults, visibleCount } = $searchStore;
    if (origin && allResults.length > 0) {
      if (allResults !== prevResults) {
        // New search — fetch travel times for the initially-visible slice only.
        // Fetching all results at once burns ORS quota for parks the user may
        // never scroll to. The show-more branch below handles subsequent batches.
        prevResults = allResults;
        prevVisibleCount = visibleCount;
        const initialBatch = getFilteredResults($searchStore).slice(0, visibleCount);
        if (initialBatch.length > 0) getTravelTimes(origin, initialBatch);
      } else if (visibleCount > prevVisibleCount) {
        // Show more — fetch only the newly-exposed slice.
        const filtered = getFilteredResults($searchStore);
        const newBatch = filtered.slice(prevVisibleCount, visibleCount);
        prevVisibleCount = visibleCount;
        if (newBatch.length > 0) {
          getTravelTimes(origin, newBatch);
        }
      } else {
        // visibleCount dropped (filter reset) — sync cursor down so the next
        // show-more fetches from the correct offset.
        //
        // Design tradeoff: we intentionally do NOT re-fetch travel times when
        // a filter change changes which parks are visible. Parks that enter
        // the visible set after a filter toggle will show no travel time until
        // the next show-more or new search. This avoids burning ORS quota on
        // filter changes, which can fire rapidly as the user toggles amenities.
        prevVisibleCount = visibleCount;
      }
    }
  }
</script>

<div class="app-shell">
  <!-- Left sidebar: search controls + results list -->
  <aside class="sidebar">
    <header class="sidebar-header">
      <h1 class="app-title">FindMeAPlayground</h1>
    </header>

    <div class="search-controls">
      <SearchBar />
      <div class="controls-row">
        <RadiusDropdown />
      </div>
      <AmenityFilters />
    </div>

    <!-- Mobile-only toggle: switch between map and list views.
         On desktop this button is hidden; the sidebar is always visible. -->
    <div class="view-toggle">
      <button
        class="toggle-btn"
        onclick={() => { showList = !showList; }}
        type="button"
      >
        {showList ? 'View Map' : 'View List'}
      </button>
    </div>

    <div class="results-container" class:show-list={showList}>
      <ResultsList />
    </div>
  </aside>

  <!-- Right panel: Leaflet map -->
  <main class="map-panel" class:hide-map={showList}>
    <MapView />
  </main>

  <!-- Detail modal — rendered on top of everything when a park is selected -->
  <ParkDetailModal />
</div>

<style>
  /* --- Global resets --- */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 16px;
    color: #111827;
    background: #f9fafb;
  }

  /* --- App shell layout --- */

  .app-shell {
    display: flex;
    height: 100dvh; /* Dynamic viewport height for mobile (avoids mobile browser chrome) */
    overflow: hidden;
  }

  /* Desktop: sidebar + map side by side */
  .sidebar {
    width: 380px;
    min-width: 320px;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-right: 1px solid #e5e7eb;
    overflow: hidden;
  }

  .map-panel {
    flex: 1;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 1rem 1rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .app-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.75rem;
    letter-spacing: -0.01em;
  }

  .search-controls {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .results-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* View toggle button — hidden on desktop, visible on mobile */
  .view-toggle {
    display: none;
  }

  /* --- Mobile layout (≤768px): toggle between map and list --- */
  @media (max-width: 768px) {
    .app-shell {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      min-width: unset;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
      flex: none;
    }

    /* Results list hidden by default on mobile; shown when showList=true */
    .results-container {
      max-height: 0;
      overflow: hidden;
    }

    .results-container.show-list {
      max-height: 60vh;
      overflow: auto;
    }

    /* Map fills remaining space; hidden when list is shown */
    .map-panel {
      flex: 1;
      min-height: 300px;
    }

    .map-panel.hide-map {
      display: none;
    }

    /* Show the toggle button on mobile */
    .view-toggle {
      display: flex;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .toggle-btn {
      width: 100%;
      padding: 0.5rem;
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #374151;
      cursor: pointer;
    }

    .toggle-btn:hover {
      background: #f3f4f6;
    }
  }
</style>
