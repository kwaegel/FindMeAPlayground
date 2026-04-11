<script>
  // ParkDetailModal — overlay showing full detail for the selected park.
  // Conditionally rendered when $searchStore.selectedPark is non-null.
  // Closes on: close button click, overlay background click, Escape key.
  import { onMount, onDestroy, tick } from 'svelte';
  import { X, MapPin, Clock, Navigation } from 'lucide-svelte';
  import { searchStore, clearSelectedPark } from '../stores/searchStore.js';
  import { AMENITIES } from '../config/amenities.js';
  import { AMENITY_ICON_MAP } from '../config/amenityIcons.js';
  import { formatMiles, formatMinutes, mapsUrl } from '../utils/formatters.js';

  // Bound to the close button so we can move focus there when the modal opens.
  let closeBtn;

  /**
   * Trap Tab/Shift+Tab focus within the modal content while the modal is open.
   * WCAG 2.1 dialog pattern requires that Tab cycles within the dialog so that
   * keyboard users cannot accidentally navigate behind the overlay.
   *
   * @param {KeyboardEvent} event
   */
  function trapFocus(event) {
    if (event.key !== 'Tab') return;

    // Canonical focusable-elements selector — covers links, buttons, form
    // fields, and any element with an explicit positive tabindex. Future modal
    // content (inputs, selects) will be trapped correctly without changing this.
    const focusable = Array.from(
      event.currentTarget.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), ' +
          'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleOverlayClick(event) {
    // Only close if the click is directly on the overlay, not its children.
    if (event.target === event.currentTarget) clearSelectedPark();
  }

  function handleKeyDown(event) {
    // Guard: only act when the modal is actually open. Without this, pressing
    // Escape in any input field (address bar, etc.) would fire a spurious
    // clearSelectedPark() store update every time.
    if (event.key === 'Escape' && $searchStore.selectedPark) clearSelectedPark();
  }

  // Move focus to the close button when the modal opens so keyboard and
  // screen reader users are placed inside the dialog immediately.
  $: if ($searchStore.selectedPark) {
    tick().then(() => closeBtn?.focus());
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
  {@const travelSecs = $searchStore.travelTimes.get(park.id)}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <div class="modal-content" onkeydown={trapFocus}>
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">{park.name}</h2>
        <button class="close-btn" onclick={clearSelectedPark} aria-label="Close" bind:this={closeBtn}>
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
              {#if AMENITY_ICON_MAP[amenity]}
                {@const Icon = AMENITY_ICON_MAP[amenity]}
                {@const config = AMENITIES.find((a) => a.key === amenity)}
                <span class="amenity-badge">
                  <Icon size={16} aria-hidden="true" />
                  {config?.label ?? amenity}
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
