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

    <div class="results-container">
      <ResultsList />
    </div>
  </aside>

  <!-- Right panel: Leaflet map -->
  <main class="map-panel">
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

  /* --- Mobile layout (≤768px): stacked --- */
  @media (max-width: 768px) {
    .app-shell {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      min-width: unset;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
      /* On mobile the sidebar doesn't scroll the results — the map is below */
      flex: none;
    }

    .results-container {
      /* Hide results list on mobile by default; map is primary view below */
      max-height: 0;
      overflow: hidden;
    }

    .map-panel {
      flex: 1;
      min-height: 300px;
    }
  }
</style>
