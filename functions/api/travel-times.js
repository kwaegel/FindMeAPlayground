// Cloudflare Pages Function: POST /api/travel-times
//
// Proxies travel-time matrix requests to OpenRouteService, keeping the ORS
// API key server-side (stored as the Worker secret ORS_API_KEY).
//
// Named export `onRequestPost` means Cloudflare Pages only routes POST
// requests to this handler; other methods automatically receive 405.

const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';

/**
 * Build standard CORS + JSON response headers.
 *
 * CORS origin: use the ALLOWED_ORIGIN env variable when deployed so only the
 * production domain can call this proxy. Falls back to '*' in local dev
 * (wrangler pages dev) where the variable is not set. The ORS API key is
 * never in the response body, but locking the origin prevents third-party
 * sites from burning through the ORS free-tier quota (2,500 req/day).
 *
 * @param {string} allowedOrigin - Value of env.ALLOWED_ORIGIN, or '*'.
 * @param {Record<string, string>} [extra] - Additional headers to merge in.
 */
function headers(allowedOrigin, extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
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
  // Resolve the allowed origin per-request from the env secret.
  const allowedOrigin = env?.ALLOWED_ORIGIN ?? '*';

  // --- Parse and validate input ---

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: headers(allowedOrigin),
    });
  }

  const { origin, destinations } = body ?? {};

  // Use == null (covers both null and undefined) rather than !value which would
  // misreport a malformed value like 0 or "" as "missing field".
  if (origin == null) {
    return new Response(JSON.stringify({ error: 'Missing required field: origin' }), {
      status: 400,
      headers: headers(allowedOrigin),
    });
  }

  if (destinations == null) {
    return new Response(JSON.stringify({ error: 'Missing required field: destinations' }), {
      status: 400,
      headers: headers(allowedOrigin),
    });
  }

  if (!Array.isArray(destinations) || destinations.length < 1 || destinations.length > 50) {
    return new Response(
      JSON.stringify({ error: 'destinations must contain 1-50 coordinate pairs' }),
      { status: 400, headers: headers(allowedOrigin) }
    );
  }

  // Validate origin coordinates. Require exactly 2 elements — an altitude
  // component would pass < 2 but silently corrupt ORS's [lon, lat] expectation.
  if (!Array.isArray(origin) || origin.length !== 2 || !isNumeric(origin[0]) || !isNumeric(origin[1])) {
    return new Response(JSON.stringify({ error: 'origin must be [longitude, latitude] numbers' }), {
      status: 400,
      headers: headers(allowedOrigin),
    });
  }

  // Validate each destination with the same strict length check.
  for (const dest of destinations) {
    if (!Array.isArray(dest) || dest.length !== 2 || !isNumeric(dest[0]) || !isNumeric(dest[1])) {
      return new Response(
        JSON.stringify({ error: 'Each destination must be [longitude, latitude] numbers' }),
        { status: 400, headers: headers(allowedOrigin) }
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
    // Note: the `units` field controls distance units in ORS, not duration.
    // Duration is always returned in seconds regardless of this field.
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
      headers: headers(allowedOrigin),
    });
  }

  // ORS returns durations as a 2D array: [[t1, t2, ...]].
  // Row 0 is the single source (our origin); each column is a destination.
  // Validate the shape so a contract change produces an obvious empty result
  // rather than a silent TypeError downstream.
  const timesRow = orsData?.durations?.[0];
  if (!Array.isArray(timesRow)) {
    console.warn('[travel-times] Unexpected ORS response shape:', JSON.stringify(orsData));
  }
  // Normalize unreachable destinations. ORS returns null for unreachable
  // destinations and may return a very large sentinel value (e.g. 3.4e+38)
  // for certain route profiles. Map null/invalid/negative/excessive values to
  // null so the client can treat them uniformly.
  // 86400s (24 hours) is a practical ceiling — no park within a 15-mile
  // radius should take longer. Negative durations (ORS contract violation)
  // are rejected but t === 0 is allowed: a co-located park would get 0s from
  // ORS and formatMinutes() renders it as "1 min", which is correct UX.
  const MAX_REASONABLE_SECONDS = 86400;
  const times = Array.isArray(timesRow)
    ? timesRow.map((t) =>
        t === null || !isNumeric(t) || t < 0 || t > MAX_REASONABLE_SECONDS ? null : t
      )
    : [];

  return new Response(JSON.stringify({ times }), {
    status: 200,
    headers: headers(allowedOrigin),
  });
}

/**
 * Top-level request handler — routes by method and returns 405 for anything
 * other than POST and OPTIONS. Exported as `onRequest` so that unit tests can
 * invoke method-rejection logic directly (the Pages Function router handles
 * method dispatch in production via the named `onRequestPost` export, but that
 * makes 405 untestable in isolation).
 *
 * @param {object} context - Cloudflare Pages Function execution context.
 */
export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'POST') return onRequestPost(context);
  if (request.method === 'OPTIONS') return onRequestOptions(context);

  const allowedOrigin = context.env?.ALLOWED_ORIGIN ?? '*';
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: headers(allowedOrigin, { Allow: 'POST, OPTIONS' }),
  });
}

/**
 * Handle OPTIONS preflight requests for CORS.
 * Mirrors the same allowed origin as the POST handler so that browsers
 * enforcing strict-origin checking don't see a mismatch between preflight
 * and actual response headers.
 *
 * @param {object} context - Cloudflare Pages Function context.
 * @param {{ ALLOWED_ORIGIN?: string }} context.env
 */
export async function onRequestOptions({ env }) {
  const allowedOrigin = env?.ALLOWED_ORIGIN ?? '*';
  // Preflight responses use a tailored header set — not the shared headers()
  // function. That function adds Content-Type: application/json which is
  // meaningless on a 204 (no body), and is omitted here. Access-Control-Max-Age
  // caches the preflight for 24 hours to avoid a round-trip on every request.
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
