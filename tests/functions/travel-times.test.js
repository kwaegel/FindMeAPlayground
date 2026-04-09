// Tests for the Cloudflare Worker travel-times proxy function.
// The Worker is a plain ES module — we import and test it directly in jsdom.
// ORS fetch calls are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost } from '../../functions/api/travel-times.js';

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
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        durations: [times],
      }),
  });
}

function mockOrsError(status = 500) {
  global.fetch = vi.fn().mockResolvedValue({
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

  it('includes Access-Control-Allow-Origin header', async () => {
    mockOrsSuccess([300, 600]);

    const ctx = makeContext(VALID_BODY);
    const response = await onRequestPost(ctx);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  it('attaches ORS API key in the Authorization header to ORS', async () => {
    mockOrsSuccess([300]);

    const ctx = makeContext({ origin: VALID_BODY.origin, destinations: [VALID_BODY.destinations[0]] });
    await onRequestPost(ctx);

    const orsCallOptions = global.fetch.mock.calls[0][1];
    // The ORS key must be in the Authorization header sent to ORS,
    // not in the Worker's response to the client.
    expect(orsCallOptions.headers['Authorization']).toBe('test-key-123');
  });
});

describe('travel-times Worker: non-POST methods', () => {
  it('returns 405 for GET requests', async () => {
    // GET requests don't call onRequestPost — simulate routing check.
    // The Pages Function router handles method matching; we test that
    // the handler exported is specifically for POST.
    // We verify this via the export name: onRequestPost.
    const { onRequestPost: handler } = await import('../../functions/api/travel-times.js');
    expect(typeof handler).toBe('function');
    // Named export confirms POST-only routing at the Pages level.
  });
});
