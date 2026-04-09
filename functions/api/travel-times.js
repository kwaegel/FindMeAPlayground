// Cloudflare Pages Function: POST /api/travel-times
//
// Proxies travel-time matrix requests to OpenRouteService, keeping the ORS
// API key server-side (stored as the Worker secret ORS_API_KEY).
//
// Named export `onRequestPost` means Cloudflare Pages only routes POST
// requests to this handler; other methods automatically receive 405.

const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';

// CORS origin — restrict to the deployed app. In development the Vite dev
// server runs on localhost; the '*' fallback is safe because the ORS key
// only lives in the Worker environment, not in any response body.
const ALLOWED_ORIGIN = '*';

/** Build standard CORS + JSON response headers. */
function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  };
}

/**
 * Validate that a value is a finite number (rejects strings, NaN, Infinity).
 * @param {*} v
 * @returns {boolean}
 */
function isNumeric(v) {
  return typeof v === 'number' && isFinite(v);
}

/**
 * Cloudflare Pages Function handler for POST /api/travel-times.
 *
 * @param {object} context - Cloudflare Pages Function execution context.
 * @param {Request} context.request
 * @param {{ ORS_API_KEY: string }} context.env
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  // --- Parse and validate input ---

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: headers(),
    });
  }

  const { origin, destinations } = body ?? {};

  if (!origin) {
    return new Response(JSON.stringify({ error: 'Missing required field: origin' }), {
      status: 400,
      headers: headers(),
    });
  }

  if (!destinations) {
    return new Response(JSON.stringify({ error: 'Missing required field: destinations' }), {
      status: 400,
      headers: headers(),
    });
  }

  if (!Array.isArray(destinations) || destinations.length < 1 || destinations.length > 50) {
    return new Response(
      JSON.stringify({ error: 'destinations must contain 1-50 coordinate pairs' }),
      { status: 400, headers: headers() }
    );
  }

  // Validate origin coordinates.
  if (!Array.isArray(origin) || origin.length < 2 || !isNumeric(origin[0]) || !isNumeric(origin[1])) {
    return new Response(JSON.stringify({ error: 'origin must be [longitude, latitude] numbers' }), {
      status: 400,
      headers: headers(),
    });
  }

  // Validate each destination.
  for (const dest of destinations) {
    if (!Array.isArray(dest) || dest.length < 2 || !isNumeric(dest[0]) || !isNumeric(dest[1])) {
      return new Response(
        JSON.stringify({ error: 'Each destination must be [longitude, latitude] numbers' }),
        { status: 400, headers: headers() }
      );
    }
  }

  // --- Call ORS matrix endpoint ---

  const orsBody = {
    locations: [origin, ...destinations],
    // sources[0] = origin; destinations are indices 1..n.
    sources: [0],
    destinations: destinations.map((_, i) => i + 1),
    metrics: ['duration'],
    units: 's',
  };

  let orsData;
  try {
    const orsResponse = await fetch(ORS_MATRIX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.ORS_API_KEY,
      },
      body: JSON.stringify(orsBody),
    });

    if (!orsResponse.ok) {
      throw new Error(`ORS HTTP ${orsResponse.status}`);
    }

    orsData = await orsResponse.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Travel time service unavailable' }), {
      status: 502,
      headers: headers(),
    });
  }

  // ORS returns durations as a 2D array: [[t1, t2, ...]].
  // Row 0 is the single source (our origin); each column is a destination.
  const times = (orsData.durations?.[0] ?? []).map((t) => (t === null ? null : t));

  return new Response(JSON.stringify({ times }), {
    status: 200,
    headers: headers(),
  });
}

/**
 * Handle OPTIONS preflight requests for CORS.
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: headers(),
  });
}
