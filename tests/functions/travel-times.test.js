// Tests for the Cloudflare Worker travel-times proxy function.
// The Worker is a plain ES module — we import and test it directly in jsdom.
// ORS fetch calls are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost, onRequestOptions, onRequest } from '../../functions/api/travel-times.js';

// --- Helpers ---

/**
 * Build a minimal Cloudflare Pages Function context object.
 * @param {object} body - The JSON request body.
 * @param {string} method - HTTP method.
 */
function makeContext(body, method = 'POST') {
  const request = new Request('https://findmeaplayground.com/api/travel-times', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  return {
    request,
    env: { ORS_API_KEY: 'test-key-123' },
    params: {},
    data: {},
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
  };
}

/** Mock ORS matrix response with n sequential travel times. */
function mockOrsSuccess(times) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        durations: [times],
      }),
  });
}

function mockOrsError(status = 500) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'ORS error' }),
  });
}

// Valid minimal request body.
const VALID_BODY = {
  origin: [-77.036, 38.895],
  destinations: [
    [-77.04, 38.9],
    [-77.02, 38.88],
  ],
};

describe('travel-times Worker: POST /api/travel-times', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with times array for valid input', async () => {
    mockOrsSuccess([300, 600]);

    const ctx = makeContext(VALID_BODY);
    const response = await onRequestPost(ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ times: [300, 600] });
  });

  it('returns 400 when origin is missing', async () => {
    const ctx = makeContext({ destinations: VALID_BODY.destinations });
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/origin/i);
  });

  it('returns 400 when destinations is missing', async () => {
    const ctx = makeContext({ origin: VALID_BODY.origin });
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/destinations/i);
  });

  it('returns 400 when destinations has 0 entries', async () => {
    const ctx = makeContext({ ...VALID_BODY, destinations: [] });
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 400 when destinations has more than 50 entries', async () => {
    const destinations = Array.from({ length: 51 }, (_, i) => [-77 - i * 0.01, 38.9]);
    const ctx = makeContext({ ...VALID_BODY, destinations });
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('1-50');
  });

  it('returns 400 for non-numeric coordinates in origin', async () => {
    const ctx = makeContext({ ...VALID_BODY, origin: ['bad', 38.9] });
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 502 when ORS returns a non-2xx response', async () => {
    mockOrsError(503);

    const ctx = makeContext(VALID_BODY);
    const response = await onRequestPost(ctx);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain('unavailable');
  });

  it('returns null for destinations ORS cannot route to', async () => {
    mockOrsSuccess([300, null]);

    const ctx = makeContext(VALID_BODY);
    const response = await onRequestPost(ctx);
    const body = await response.json();

    expect(body.times[1]).toBeNull();
  });

  it('returns Access-Control-Allow-Origin: * when ALLOWED_ORIGIN env is not set', async () => {
    mockOrsSuccess([300, 600]);

    // makeContext sets no ALLOWED_ORIGIN — dev fallback should be '*'.
    const ctx = makeContext(VALID_BODY);
    const response = await onRequestPost(ctx);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns the configured ALLOWED_ORIGIN when env variable is set', async () => {
    mockOrsSuccess([300, 600]);

    // Simulate production deployment with a locked-down origin.
    const ctx = {
      ...makeContext(VALID_BODY),
      env: { ORS_API_KEY: 'test-key-123', ALLOWED_ORIGIN: 'https://findmeaplayground.com' },
    };
    const response = await onRequestPost(ctx);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://findmeaplayground.com');
  });

  it('attaches ORS API key in the Authorization header to ORS', async () => {
    const fetchSpy = mockOrsSuccess([300]);

    const ctx = makeContext({ origin: VALID_BODY.origin, destinations: [VALID_BODY.destinations[0]] });
    await onRequestPost(ctx);

    const orsCallOptions = fetchSpy.mock.calls[0][1];
    // The ORS key must be in the Authorization header sent to ORS,
    // not in the Worker's response to the client.
    expect(orsCallOptions.headers['Authorization']).toBe('test-key-123');
  });

  it('sends coordinates to ORS in [longitude, latitude] order (GeoJSON convention)', async () => {
    const fetchSpy = mockOrsSuccess([300, 600]);
    const ctx = makeContext(VALID_BODY);
    await onRequestPost(ctx);

    const orsReqBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    // First location is the origin [lon, lat] = [-77.036, 38.895]
    expect(orsReqBody.locations[0]).toEqual([-77.036, 38.895]);
    // Second location is the first destination
    expect(orsReqBody.locations[1]).toEqual(VALID_BODY.destinations[0]);
    // metrics must include 'duration'
    expect(orsReqBody.metrics).toContain('duration');
  });

  it('returns 400 for non-numeric coordinates in destinations', async () => {
    const ctx = makeContext({ ...VALID_BODY, destinations: [['bad', 38.9]] });
    const response = await onRequestPost(ctx);
    expect(response.status).toBe(400);
  });
});

describe('travel-times Worker: non-POST methods', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 405 for GET requests', async () => {
    // onRequest is the catch-all handler that returns 405 for unsupported methods.
    const ctx = makeContext(null, 'GET');
    const response = await onRequest(ctx);
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toMatch(/method not allowed/i);
  });

  it('returns 405 for PUT requests', async () => {
    const ctx = makeContext(null, 'PUT');
    const response = await onRequest(ctx);
    expect(response.status).toBe(405);
  });
});

describe('travel-times Worker: CORS preflight (OPTIONS)', () => {
  it('returns 204 with CORS headers for OPTIONS request', async () => {
    const response = await onRequestOptions({ env: {} });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
  });

  it('reflects ALLOWED_ORIGIN in the preflight response', async () => {
    const response = await onRequestOptions({ env: { ALLOWED_ORIGIN: 'https://findmeaplayground.com' } });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://findmeaplayground.com');
  });
});
